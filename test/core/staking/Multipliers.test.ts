import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { DEFAULT_TOKEN_AMOUNT, transferTokensFromTreasury, stakeTokens } from "../../utils/token.utils";
import { WEEK, MONTH, THREE_MONTHS, advanceTime } from "../../utils/time.utils";

describe("DAO Staking Multipliers", function() {
  describe("Time-Based Multipliers", function() {
    it("Should apply correct multipliers based on staking time", async function() {
      const { dao, staking, token, owner } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens from treasury and stake
      await transferTokensFromTreasury(dao, token, owner, amount);
      await token.approve(await staking.getAddress(), amount);
      await staking.stake(amount);
      
      // Initial multiplier should be 1x (10000)
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal(amount + ethers.parseEther("1")); // Including initial stake
      
      // After 1 week: 1.25x (12500)
      await advanceTime(WEEK);
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount + ethers.parseEther("1")) * 12500n / 10000n);
      
      // After 1 month: 1.5x (15000)
      await advanceTime(MONTH - WEEK); // Already passed 1 week
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount + ethers.parseEther("1")) * 15000n / 10000n);
      
      // After 3 months: 2x (20000)
      await advanceTime(THREE_MONTHS - MONTH); // Already passed 1 month
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount + ethers.parseEther("1")) * 20000n / 10000n);
    });

    it("Should reset staking time when fully unstaking", async function() {
      const { dao, staking, token, owner } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens and stake
      await transferTokensFromTreasury(dao, token, owner, amount);
      await token.approve(await staking.getAddress(), amount);
      await staking.stake(amount);
      
      // Advance time to get 1.5x multiplier
      await advanceTime(MONTH);
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount + ethers.parseEther("1")) * 15000n / 10000n);
      
      // Unstake everything
      await staking.unstake(amount + ethers.parseEther("1"));
      
      // Stake again
      await token.approve(await staking.getAddress(), amount + ethers.parseEther("1"));
      await staking.stake(amount + ethers.parseEther("1"));
      
      // Should have base multiplier (1x)
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal(amount + ethers.parseEther("1"));
    });

    it("Should maintain staking time when partially unstaking", async function() {
      const { dao, staking, token, owner } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens and stake
      await transferTokensFromTreasury(dao, token, owner, amount);
      await token.approve(await staking.getAddress(), amount);
      await staking.stake(amount);
      
      // Advance time to get 1.5x multiplier
      await advanceTime(MONTH);
      
      // Unstake half
      await staking.unstake(amount / 2n);
      
      // Should maintain 1.5x multiplier on remaining amount
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount / 2n + ethers.parseEther("1")) * 15000n / 10000n);
    });
  });

  describe("Multiple Stakes with Multipliers", function() {
    it("Should maintain multiplier when adding more stakes", async function() {
      const { dao, staking, token, owner } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens and stake first portion
      await transferTokensFromTreasury(dao, token, owner, amount * 2n);
      await token.approve(await staking.getAddress(), amount * 2n);
      await staking.stake(amount);
      
      // Advance time to get 1.5x multiplier
      await advanceTime(MONTH);
      
      // Stake second portion - should maintain original staking time
      await staking.stake(amount);
      
      // Should have 1.5x multiplier on total amount
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount * 2n + ethers.parseEther("1")) * 15000n / 10000n);
    });

    it("Should track multipliers separately for different users", async function() {
      const { dao, staking, token, owner, accounts } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens and distribute
      await transferTokensFromTreasury(dao, token, owner, amount * 2n);
      await token.transfer(accounts[0], amount);

      // First user stakes
      await token.approve(await staking.getAddress(), amount);
      await staking.stake(amount);
      
      // Advance time
      await advanceTime(MONTH);
      
      // Second user stakes
      await token.connect(accounts[0]).approve(await staking.getAddress(), amount);
      await staking.connect(accounts[0]).stake(amount);
      
      // First user should have 1.5x multiplier
      expect(await staking.getVotingPower(await owner.getAddress()))
        .to.equal((amount + ethers.parseEther("1")) * 15000n / 10000n);
      
      // Second user should have 1x multiplier
      expect(await staking.getVotingPower(await accounts[0].getAddress()))
        .to.equal(amount);
    });
  });
});
