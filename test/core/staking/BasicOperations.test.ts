import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { DEFAULT_TOKEN_AMOUNT, transferTokensFromTreasury, stakeTokens } from "../../utils/token.utils";

describe("DAO Staking Basic Operations", function() {
  describe("Input Validation", function() {
    it("Should revert staking zero amount", async function() {
      const { staking } = await loadFixture(deployDAOFixture);
      
      await expect(staking.stake(0))
        .to.be.revertedWith("Zero amount");
    });

    it("Should revert unstaking zero amount", async function() {
      const { staking } = await loadFixture(deployDAOFixture);
      
      await expect(staking.unstake(0))
        .to.be.revertedWith("Zero amount");
    });

    it("Should revert unstaking more than staked amount", async function() {
      const { dao, staking, token, owner } = await loadFixture(deployDAOFixture);

      // First stake some tokens
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      await transferTokensFromTreasury(
        dao,
        token,
        owner,
        DEFAULT_TOKEN_AMOUNT
      );

      await token.approve(await staking.getAddress(), DEFAULT_TOKEN_AMOUNT);
      await staking.stake(DEFAULT_TOKEN_AMOUNT);
      
      await expect(staking.unstake(DEFAULT_TOKEN_AMOUNT + DEFAULT_TOKEN_AMOUNT))
        .to.be.revertedWith("Insufficient stake");
    });
  });

  describe("Total Staked Tracking", function() {
    it("Should track total staked amount correctly", async function() {
      const { dao, staking, token, owner, accounts } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens from treasury
      await transferTokensFromTreasury(
        dao,
        token,
        owner,
        amount * 2n
      );

      // Initial stake
      await token.approve(await staking.getAddress(), amount);
      await staking.stake(amount);
      expect(await staking.totalStaked()).to.equal(amount + ethers.parseEther("1")); // Including initial stake

      // Second user stakes
      await token.transfer(accounts[0], amount);
      await token.connect(accounts[0]).approve(await staking.getAddress(), amount);
      await staking.connect(accounts[0]).stake(amount);
      expect(await staking.totalStaked()).to.equal(amount * 2n + ethers.parseEther("1"));

      // First user unstakes half
      await staking.unstake(amount / 2n);
      expect(await staking.totalStaked()).to.equal(amount * 3n / 2n + ethers.parseEther("1"));

      // Second user unstakes all
      await staking.connect(accounts[0]).unstake(amount);
      expect(await staking.totalStaked()).to.equal(amount / 2n + ethers.parseEther("1"));
    });
  });

  describe("Multiple Stakes", function() {
    it("Should handle multiple stakes from same user", async function() {
      const { dao, staking, token, owner } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens from treasury
      await transferTokensFromTreasury(
        dao,
        token,
        owner,
        amount * 2n
      );

      // First stake
      await token.approve(await staking.getAddress(), amount * 2n);
      await staking.stake(amount);
      
      // Second stake
      await staking.stake(amount);
      
      expect(await staking.stakedAmount(await owner.getAddress()))
        .to.equal(amount * 2n + ethers.parseEther("1")); // Including initial stake
    });

    it("Should handle multiple stakes from different users", async function() {
      const { dao, staking, token, owner, accounts } = await loadFixture(deployDAOFixture);
      const amount = DEFAULT_TOKEN_AMOUNT;

      // First stake initial token to create proposal
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Get tokens from treasury
      await transferTokensFromTreasury(
        dao,
        token,
        owner,
        amount * 2n
      );

      // First user stakes
      await token.approve(await staking.getAddress(), amount);
      await staking.stake(amount);
      
      // Second user stakes
      await token.transfer(accounts[0], amount);
      await token.connect(accounts[0]).approve(await staking.getAddress(), amount);
      await staking.connect(accounts[0]).stake(amount);
      
      expect(await staking.stakedAmount(await owner.getAddress()))
        .to.equal(amount + ethers.parseEther("1")); // Including initial stake
      expect(await staking.stakedAmount(await accounts[0].getAddress()))
        .to.equal(amount);
    });
  });
});
