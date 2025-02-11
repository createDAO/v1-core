import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { transferTokensFromTreasury, stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAO Token Distribution", function() {
  describe("Initial Distribution", function() {
    it("Should execute proposal after voting and time delay", async function() {
      const { dao, token, staking, owner } = await loadFixture(deployDAOFixture);
      
      // Stake and verify staked amount and voting power
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      const stakedAmount = await staking.stakedAmount(await owner.getAddress());
      const votingPower = await staking.getVotingPower(await owner.getAddress());
      expect(stakedAmount).to.equal(ethers.parseEther("1"));
      expect(votingPower).to.equal(ethers.parseEther("1")); // Initially 1x multiplier

      // Create proposal and verify its details
      await dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        ethers.parseEther("1000")
      );

      const proposal = await dao.getProposal(0);
      expect(proposal.proposalType).to.equal(0); // ProposalType.Transfer
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.againstVotes).to.equal(0);
      expect(proposal.executed).to.equal(false);
      
      // Vote and verify vote count
      await dao.vote(0, true);
      const proposalAfterVote = await dao.getProposal(0);
      expect(proposalAfterVote.forVotes).to.equal(ethers.parseEther("1")); // 1 token voting power
      expect(proposalAfterVote.againstVotes).to.equal(0);
      
      await advanceToEndOfVotingPeriod();
      
      // Execute proposal and verify execution status
      await dao.execute(0);
      const proposalAfterExecution = await dao.getProposal(0);
      expect(proposalAfterExecution.executed).to.equal(true);
      
      // Check balances
      const ownerBalance = await token.balanceOf(await owner.getAddress());
      const ownerStakedBalance = await staking.getVotingPower(await owner.getAddress());
      expect(ownerBalance + ownerStakedBalance)
        .to.equal(ethers.parseEther("1001")); // Initial 1 + transferred 1000
    });
  });

  describe("Secondary Distribution", function() {
    it("Should allow distribution to test accounts", async function() {
      const { dao, token, staking, owner, accounts } = await loadFixture(deployDAOFixture);
      
      // First get tokens through proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      await transferTokensFromTreasury(
        dao,
        token,
        owner,
        ethers.parseEther("1000")
      );
      
      // Transfer tokens to test accounts
      for (const account of accounts.slice(0, 3)) {
        await token.transfer(
          await account.getAddress(),
          ethers.parseEther("300") // 300 tokens each
        );
      }
      
      // Verify balances
      for (const account of accounts.slice(0, 3)) {
        expect(await token.balanceOf(await account.getAddress()))
          .to.equal(ethers.parseEther("300"));
      }
      
      // Owner should have 101 tokens total (1001 - 900)
      const finalOwnerBalance = await token.balanceOf(await owner.getAddress());
      const finalStakedBalance = await staking.getVotingPower(await owner.getAddress());
      expect(finalOwnerBalance + finalStakedBalance)
        .to.equal(ethers.parseEther("101"));
    });
  });
});
