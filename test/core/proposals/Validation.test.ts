import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixtureWithStakedToken } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";
import {
  MIN_PROPOSAL_STAKE,
  stakeTokens,
  transferTokensFromTreasury,
} from "../../utils/token.utils";
import { expectProposalRevert } from "../../utils/proposal.utils";

describe("DAO Proposal Validation", function () {
  describe("Amount Validation", function () {
    it("Should revert if proposal amount is zero", async function () {
      const { dao, token, owner } = await loadFixture(
        deployDAOFixtureWithStakedToken
      );

      await expect(
        dao.proposeTransfer(
          await token.getAddress(),
          await owner.getAddress(),
          0
        )
      ).to.be.revertedWith("Zero amount");
    });

    it("Should revert if recipient is zero address", async function () {
      const { dao, token, owner } = await loadFixture(
        deployDAOFixtureWithStakedToken
      );

      await expect(
        dao.proposeTransfer(
          await token.getAddress(),
          ethers.ZeroAddress,
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Zero recipient");
    });
  });

  describe("Voting Period", function () {
    it("Should revert if voting period hasn't ended", async function () {
      const { dao, token, owner } = await loadFixture(
        deployDAOFixtureWithStakedToken
      );

      await dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        ethers.parseEther("100")
      );

      await dao.vote(0, true);

      await expect(dao.execute(0)).to.be.revertedWith("Voting ongoing");
    });

    describe("Quorum Validation", function () {
      it("Should revert if quorum not met", async function () {
        const { dao, token, accounts, staking } = await loadFixture(
          deployDAOFixtureWithStakedToken
        );
        const [owner, voter] = accounts;

        // First transfer and stake tokens with owner (100 tokens)
        await transferTokensFromTreasury(dao, token, owner, ethers.parseEther("100"));
        
        // Then transfer and stake tokens with voter (1 token)
        await transferTokensFromTreasury(dao, token, voter, ethers.parseEther("1"));
        await stakeTokens(dao, staking, token, voter, ethers.parseEther("1"));
        await stakeTokens(dao, staking, token, owner, ethers.parseEther("100"));

        // Create proposal with voter (this will be proposal 2)
        await dao.connect(voter).proposeTransfer(
          await token.getAddress(),
          await voter.getAddress(),
          ethers.parseEther("1")
        );

        // Vote with only 1% of total staked tokens
        await dao.connect(voter).vote(2, true);
        await advanceToEndOfVotingPeriod();

        // Now quorum should not be met since only 1% voted (quorum is 10%)
        await expect(dao.execute(2)).to.be.revertedWith("Quorum not reached");
      });

      it("Should pass with exactly minimum quorum", async function () {
        const { dao, token, accounts, staking } = await loadFixture(
          deployDAOFixtureWithStakedToken
        );
        const [, voter] = accounts;

        // Transfer and stake 10 tokens with voter (10% of total staked)
        await transferTokensFromTreasury(
          dao,
          token,
          voter,
          ethers.parseEther("10")
        );
        await stakeTokens(dao, staking, token, voter, ethers.parseEther("10"));

        await dao
          .connect(voter)
          .proposeTransfer(
            await token.getAddress(),
            await voter.getAddress(),
            ethers.parseEther("1")
          );

        await dao.connect(voter).vote(1, true); // 10% of staked tokens voting
        await advanceToEndOfVotingPeriod();

        await expect(dao.execute(1)).to.not.be.reverted;
      });

      it("Should pass with above minimum quorum", async function () {
        const { dao, token, accounts, staking } = await loadFixture(
          deployDAOFixtureWithStakedToken
        );
        const [, voter] = accounts;

        // Transfer and stake 20 tokens with voter (20% of total staked)
        await transferTokensFromTreasury(
          dao,
          token,
          voter,
          ethers.parseEther("20")
        );
        await stakeTokens(dao, staking, token, voter, ethers.parseEther("20"));

        await dao
          .connect(voter)
          .proposeTransfer(
            await token.getAddress(),
            await voter.getAddress(),
            ethers.parseEther("1")
          );

        await dao.connect(voter).vote(1, true); // 20% of staked tokens voting
        await advanceToEndOfVotingPeriod();

        await expect(dao.execute(1)).to.not.be.reverted;
      });

      it("Should count both for and against votes towards quorum but fail without majority", async function () {
        const { dao, token, accounts, staking } = await loadFixture(
          deployDAOFixtureWithStakedToken
        );
        const [, voter1, voter2] = accounts;

        // Transfer and stake 5 tokens each with two voters (5% each)
        // First transfer and stake for voter1
        await transferTokensFromTreasury(
          dao,
          token,
          voter1,
          ethers.parseEther("5")
        );
        await stakeTokens(dao, staking, token, voter1, ethers.parseEther("5"));

        // Then transfer and stake for voter2
        await transferTokensFromTreasury(
          dao,
          token,
          voter2,
          ethers.parseEther("5")
        );
        await stakeTokens(dao, staking, token, voter2, ethers.parseEther("5"));

        // Create new proposal (this will be proposal 2 since transferTokensFromTreasury used 0 and 1)
        await dao
          .connect(voter1)
          .proposeTransfer(
            await token.getAddress(),
            await voter1.getAddress(),
            ethers.parseEther("1")
          );

        // Split votes 50/50 on proposal 2
        await dao.connect(voter1).vote(2, true); // 5% for
        await dao.connect(voter2).vote(2, false); // 5% against
        await advanceToEndOfVotingPeriod();
        // Should reach quorum (10% total votes) but fail due to no majority
        await expect(dao.execute(2)).to.be.revertedWith("Proposal rejected");
      });
    });
  });

  describe("Execution State", function () {
    it("Should revert if proposal already executed", async function () {
      const { dao, token, owner } = await loadFixture(
        deployDAOFixtureWithStakedToken
      );

      // Create and execute a proposal
      await dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        ethers.parseEther("100")
      );
      await dao.vote(0, true);
      await advanceToEndOfVotingPeriod();
      await dao.execute(0);

      // Try to execute again
      await expect(dao.execute(0)).to.be.revertedWith("Already executed");
    });

    it("Should revert if proposal execution fails", async function () {
      const { dao, token, owner } = await loadFixture(
        deployDAOFixtureWithStakedToken
      );

      // Try to transfer more tokens than treasury has
      const tooMuch = ethers.parseEther("2000000"); // More than initial supply
      await dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        tooMuch
      );

      await dao.vote(0, true);
      await advanceToEndOfVotingPeriod();
      await expect(dao.execute(0)).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientBalance"
      );
    });
  });
});
