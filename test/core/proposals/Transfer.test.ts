import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAO Transfer Proposals", function () {
  describe("Validation", function () {
    it("Should revert if proposal amount is zero", async function () {
      const { dao, token, owner, staking } = await loadFixture(
        deployDAOFixture
      );

      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

      await expect(
        dao.proposeTransfer(
          await token.getAddress(),
          await owner.getAddress(),
          0
        )
      ).to.be.revertedWith("Zero amount");
    });

    it("Should revert if recipient is zero address", async function () {
      const { dao, token, owner, staking } = await loadFixture(
        deployDAOFixture
      );

      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

      await expect(
        dao.proposeTransfer(
          await token.getAddress(),
          ethers.ZeroAddress,
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("Zero recipient");
    });

    it("Should revert if voting period hasn't ended", async function () {
      const { dao, token, owner, staking } = await loadFixture(
        deployDAOFixture
      );

      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

      await dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        ethers.parseEther("100")
      );

      await dao.vote(0, true);

      await expect(dao.execute(0)).to.be.revertedWith("Voting ongoing");
    });
  });

  describe("Execution", function () {
    it("Should transfer ERC20 tokens correctly", async function () {
      const { dao, token, treasury, owner, staking } = await loadFixture(
        deployDAOFixture
      );

      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

      const transferAmount = ethers.parseEther("1000");
      await dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        transferAmount
      );
      await dao.vote(0, true);
      await advanceToEndOfVotingPeriod();
      await dao.execute(0);

      expect(await token.balanceOf(await owner.getAddress())).to.equal(
        transferAmount
      );
    });

    it("Should transfer ETH correctly", async function () {
      const { dao, treasury, owner, staking, token } = await loadFixture(
        deployDAOFixture
      );

      // Send ETH to treasury
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("10"),
      });

      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

      const transferAmount = ethers.parseEther("1");
      await dao.proposeTransfer(
        ethers.ZeroAddress, // ETH transfer
        await owner.getAddress(),
        transferAmount
      );
      await dao.vote(0, true);
      await advanceToEndOfVotingPeriod();

      const balanceBefore = await ethers.provider.getBalance(
        await owner.getAddress()
      );
      await dao.execute(0);
      const balanceAfter = await ethers.provider.getBalance(
        await owner.getAddress()
      );

      expect(balanceAfter - balanceBefore).to.be.closeTo(
        transferAmount,
        ethers.parseEther("0.01")
      ); // Account for gas
    });

    it("Should revert if insufficient ETH balance", async function () {
      const { dao, treasury, owner, staking, token } = await loadFixture(
        deployDAOFixture
      );

      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

      // Try to transfer more ETH than treasury has
      await dao.proposeTransfer(
        ethers.ZeroAddress,
        await owner.getAddress(),
        ethers.parseEther("10")
      );
      await dao.vote(0, true);
      await advanceToEndOfVotingPeriod();

      await expect(dao.execute(0)).to.be.revertedWith("Insufficient ETH");
    });
  });
});
