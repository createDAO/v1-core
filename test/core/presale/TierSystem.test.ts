import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployPresaleFixture } from "../../fixtures/presale.fixture";
import { ethers } from "hardhat";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAOPresale Tier System", function () {
  describe("Tier Progression", function () {
    it("Should start at tier 0", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      expect(await presale.getCurrentTier()).to.equal(0);
    });

    it("Should advance to next tier after buying all tokens in current tier", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const tokensPerTier = await presale.tokensPerTier();
      const initialPrice = await presale.initialPrice();
      const deadline = (await time.latest()) + 3600;

      // Buy all tokens in first tier
      const ethNeeded = tokensPerTier * initialPrice / ethers.parseEther("1");
      await presale.buy(0, deadline, { value: ethNeeded });

      expect(await presale.getCurrentTier()).to.equal(1);
    });

    it("Should increase price by TIER_MULTIPLIER for each tier", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const initialPrice = await presale.initialPrice();
      const tierMultiplier = await presale.TIER_MULTIPLIER();
      const tokensPerTier = await presale.tokensPerTier();
      const deadline = (await time.latest()) + 3600;

      // Buy all tokens in first tier
      const ethForTier0 = tokensPerTier * initialPrice / ethers.parseEther("1");
      await presale.buy(0, deadline, { value: ethForTier0 });

      // Check price increased correctly
      const expectedPrice = (initialPrice * tierMultiplier) / 100n;
      expect(await presale.getCurrentPrice()).to.equal(expectedPrice);
    });
  });

  describe("Cross-Tier Purchases", function () {
    it("Should correctly calculate tokens when buying across multiple tiers", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const tokensPerTier = await presale.tokensPerTier();
      const initialPrice = await presale.initialPrice();
      const tierMultiplier = await presale.TIER_MULTIPLIER();
      const deadline = (await time.latest()) + 3600;

      // Calculate ETH needed to buy 1.5 tiers worth of tokens
      const ethForTier0 = tokensPerTier * initialPrice / ethers.parseEther("1");
      const priceForTier1 = (initialPrice * tierMultiplier) / 100n;
      const ethForHalfTier1 = (tokensPerTier / 2n) * priceForTier1 / ethers.parseEther("1");
      const totalEthNeeded = ethForTier0 + ethForHalfTier1;

      // Buy tokens across tiers
      const expectedTokens = tokensPerTier + (tokensPerTier / 2n);
      const actualTokens = await presale.calculatePurchaseAcrossTiers(totalEthNeeded);
      expect(actualTokens).to.equal(expectedTokens);

      await presale.buy(actualTokens, deadline, { value: totalEthNeeded });
      expect(await presale.getCurrentTier()).to.equal(1);
    });

    it("Should correctly handle selling tokens across tiers", async function () {
      const { presale, token } = await loadFixture(deployPresaleFixture);
      const tokensPerTier = await presale.tokensPerTier();
      const initialPrice = await presale.initialPrice();
      const deadline = (await time.latest()) + 3600;

      // First buy some tokens
      const ethAmount = ethers.parseEther("1");
      const boughtTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      await presale.buy(boughtTokens, deadline, { value: ethAmount });

      // Calculate expected ETH return
      const expectedEth = await presale.calculateSellReturn(boughtTokens);
      await token.approve(await presale.getAddress(), boughtTokens);

      // Sell tokens
      await presale.sell(boughtTokens, expectedEth, deadline);

      // Verify we're back in the original tier
      expect(await presale.getCurrentTier()).to.equal(0);
    });
  });

  describe("Tier State", function () {
    it("Should correctly track remaining tokens in current tier", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const tokensPerTier = await presale.tokensPerTier();
      const initialPrice = await presale.initialPrice();
      const deadline = (await time.latest()) + 3600;

      // Buy half of the tokens in first tier
      const ethNeeded = (tokensPerTier / 2n) * initialPrice / ethers.parseEther("1");
      await presale.buy(0, deadline, { value: ethNeeded });

      expect(await presale.getRemainingInCurrentTier()).to.equal(tokensPerTier / 2n);
    });

    it("Should correctly report total tokens sold", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const tokensPerTier = await presale.tokensPerTier();
      const initialPrice = await presale.initialPrice();
      const deadline = (await time.latest()) + 3600;

      // Buy half of the tokens in first tier
      const ethNeeded = (tokensPerTier / 2n) * initialPrice / ethers.parseEther("1");
      await presale.buy(0, deadline, { value: ethNeeded });

      expect(await presale.getTokensSold()).to.equal(tokensPerTier / 2n);
    });
  });

  describe("Quote Functions", function () {
    it("Should provide accurate quotes for multi-tier purchases", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const tokensPerTier = await presale.tokensPerTier();
      const initialPrice = await presale.initialPrice();
      const deadline = (await time.latest()) + 3600;

      // Calculate ETH needed to buy 1.5 tiers worth of tokens
      const ethForTier0 = tokensPerTier * initialPrice / ethers.parseEther("1");
      const priceForTier1 = (initialPrice * 125n) / 100n; // TIER_MULTIPLIER = 125
      const ethForHalfTier1 = (tokensPerTier / 2n) * priceForTier1 / ethers.parseEther("1");
      const totalEthNeeded = ethForTier0 + ethForHalfTier1;

      const [tokensReceived, pricesPerTier, tokensPerTierBought] = 
        await presale.quoteTokensForExactETH(totalEthNeeded);

      expect(tokensReceived).to.equal(tokensPerTier + (tokensPerTier / 2n));
      expect(pricesPerTier[0]).to.equal(initialPrice);
      expect(pricesPerTier[1]).to.equal(priceForTier1);
      expect(tokensPerTierBought[0]).to.equal(tokensPerTier);
      expect(tokensPerTierBought[1]).to.equal(tokensPerTier / 2n);
    });
  });
});
