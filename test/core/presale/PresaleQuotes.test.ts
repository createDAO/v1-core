import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployPresaleFixture } from "../../fixtures/presale.fixture";
import { ethers } from "hardhat";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAOPresale Quote Functions", function () {
  describe("Quote Tokens For ETH", function () {
    it("Should correctly quote tokens for ETH within single tier", async function () {
      const { presale, initialPrice } = await loadFixture(deployPresaleFixture);
      
      const ethAmount = ethers.parseEther("0.1");
      const [tokensReceived, pricesPerTier, tokensPerTierBought] = await presale.quoteTokensForExactETH(ethAmount);
      
      // Verify token amount matches direct calculation
      const expectedTokens = ethAmount * ethers.parseEther("1") / initialPrice;
      expect(tokensReceived).to.equal(expectedTokens);
      
      // Verify tier info
      expect(pricesPerTier[0]).to.equal(initialPrice);
      expect(tokensPerTierBought[0]).to.equal(tokensReceived);
      
      // All other tiers should be empty
      for (let i = 1; i < pricesPerTier.length; i++) {
        expect(tokensPerTierBought[i]).to.equal(0);
      }
    });

    it("Should correctly quote tokens for ETH across multiple tiers", async function () {
      const { presale, tokensPerTier, initialPrice } = await loadFixture(deployPresaleFixture);
      
      // Calculate ETH needed for full tier + extra
      const firstTierCost = (tokensPerTier * initialPrice) / ethers.parseEther("1");
      const extraEth = ethers.parseEther("1");
      const totalEth = firstTierCost + extraEth;
      
      const [tokensReceived, pricesPerTier, tokensPerTierBought] = await presale.quoteTokensForExactETH(totalEth);
      
      // First tier should be fully bought
      expect(tokensPerTierBought[0]).to.equal(tokensPerTier);
      expect(pricesPerTier[0]).to.equal(initialPrice);
      
      // Second tier should have partial purchase
      expect(tokensPerTierBought[1]).to.be.gt(0);
      expect(pricesPerTier[1]).to.equal((initialPrice * 125n) / 100n);
      
      // Total tokens should match direct calculation
      const calculatedTokens = await presale.calculatePurchaseAcrossTiers(totalEth);
      expect(tokensReceived).to.equal(calculatedTokens);
    });
  });

  describe("Quote ETH For Tokens", function () {
    it("Should correctly quote ETH needed for tokens within single tier", async function () {
      const { presale, initialPrice } = await loadFixture(deployPresaleFixture);
      
      const tokenAmount = ethers.parseEther("100");
      const [ethNeeded, currentPrice] = await presale.quoteETHForExactTokens(tokenAmount);
      
      // Verify ETH amount matches direct calculation
      const expectedEth = (tokenAmount * initialPrice) / ethers.parseEther("1");
      expect(ethNeeded).to.equal(expectedEth);
      expect(currentPrice).to.equal(initialPrice);
    });

    it("Should correctly quote ETH needed for tokens across multiple tiers", async function () {
      const { presale, tokensPerTier, initialPrice } = await loadFixture(deployPresaleFixture);
      
      // Try to sell more than one tier
      const tokenAmount = tokensPerTier + ethers.parseEther("1000");
      const [ethNeeded, currentPrice] = await presale.quoteETHForExactTokens(tokenAmount);
      
      // Verify ETH needed matches sell return calculation
      const sellReturn = await presale.calculateSellReturn(tokenAmount);
      expect(ethNeeded).to.equal(sellReturn);
      expect(currentPrice).to.equal(initialPrice);
    });
  });

  describe("State Query Functions", function () {
    it("Should return correct presale state", async function () {
      const { presale, initialPrice, tokensPerTier, presaleAmount } = await loadFixture(deployPresaleFixture);
      
      const [currentTier, currentPrice, remainingInTier, totalRemaining, totalRaised] = await presale.getPresaleState();
      
      expect(currentTier).to.equal(0);
      expect(currentPrice).to.equal(initialPrice);
      expect(remainingInTier).to.equal(tokensPerTier);
      expect(totalRemaining).to.equal(presaleAmount);
      expect(totalRaised).to.equal(0);
    });

    it("Should update presale state after purchase", async function () {
      const { presale, initialPrice } = await loadFixture(deployPresaleFixture);
      
      // Make a purchase
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      await presale.buy(0, deadline, { value: ethAmount });
      
      const [currentTier, currentPrice, remainingInTier, totalRemaining, totalRaised] = await presale.getPresaleState();
      
      expect(currentTier).to.equal(0);
      expect(currentPrice).to.equal(initialPrice);
      expect(totalRaised).to.equal(ethAmount);
      
      // Verify tokens were deducted
      const tokensBought = await presale.calculatePurchaseAcrossTiers(ethAmount);
      expect(totalRemaining).to.equal(await presale.tokensPerTier() * 10n - tokensBought);
    });
  });
});
