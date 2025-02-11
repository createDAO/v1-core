import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

async function deployPresaleFixture() {
  const daoFixture = await loadFixture(deployDAOFixture);
  const { dao, staking, token, treasury, owner } = daoFixture;

  const presaleImpl = await ethers.deployContract("DAOPresale");
  await presaleImpl.waitForDeployment();

  await daoFixture.factory.registerImplementation(
    "latest",
    await daoFixture.dao.getAddress(),
    await token.getAddress(),
    await treasury.getAddress(),
    await staking.getAddress(),
    await presaleImpl.getAddress(),
    "0x"
  );

  await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
  const totalStaked = await staking.totalStaked();
  const neededVotes = (totalStaked * 1000n) / 10000n + 1n;

  await dao.proposeTransfer(
    await token.getAddress(),
    await owner.getAddress(),
    neededVotes
  );
  await dao.vote(0, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(0);

  await token.approve(await staking.getAddress(), neededVotes);
  await staking.stake(neededVotes);

  // 1000 tokens total, 10 tiers, 100 tokens per tier (all in wei)
  const presaleAmount = ethers.parseEther("1000"); // 1000 tokens
  const initialPrice = ethers.parseEther("0.1"); // 0.1 ETH per token

  await dao.proposePresale(presaleAmount, initialPrice);
  await dao.vote(1, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(1);

  const presaleAddress = await dao.getPresaleContract(1);
  const presale = await ethers.getContractAt("DAOPresale", presaleAddress);

  return {
    ...daoFixture,
    presale,
    presaleAmount,
    initialPrice,
    tokensPerTier: await presale.tokensPerTier()
  };
}

describe("DAOPresale Sell Operations", function () {
  describe("Basic Sell Operations", function () {
    it("Should correctly sell tokens within single tier", async function () {
      const { presale, token, owner, initialPrice} = await loadFixture(deployPresaleFixture);
      
      // Buy 5 tokens from tier 1 at 0.1 ETH each = 0.5 ETH
      const tokens = ethers.parseEther("5"); // 5 tokens in wei
      const deadline = (await time.latest()) + 3600;
      const cost = ethers.parseEther("0.5"); // 0.5 ETH
      
      // Verify we get the expected number of tokens
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(cost);
      // console.log("Expected tokens:", ethers.formatEther(expectedTokens));
      
      await presale.buy(expectedTokens, deadline, { value: cost });
      
      // Approve tokens for selling
      await token.approve(await presale.getAddress(), tokens);
      
      // Get expected ETH return - should be same as cost since we're in same tier
      const sellReturn = await presale.calculateSellReturn(tokens);
      expect(sellReturn).to.equal(cost);
      
      // Sell tokens
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await presale.sell(tokens, sellReturn, deadline);
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Account for gas costs
      expect(balanceAfter - balanceBefore).to.be.closeTo(sellReturn, ethers.parseEther("0.01"));
    });

    it("Should correctly sell tokens across multiple tiers", async function () {
      const { presale, token, tokensPerTier, initialPrice, owner } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;
      
      // Buy 15 tokens:
      // - 10 tokens from tier 1 at 0.1 ETH each = 1 ETH
      // - 5 tokens from tier 2 at 0.125 ETH each = 0.625 ETH
      // Total spent: 1.625 ETH
      
      // First buy all tokens in tier 1 (100 tokens at 0.1 ETH each = 10 ETH)
      const tier1Cost = ethers.parseEther("10"); // 10 ETH
      const tier1Tokens = await presale.calculatePurchaseAcrossTiers(tier1Cost);
      // console.log("Tier 1 - Cost:", ethers.formatEther(tier1Cost), "Expected tokens:", ethers.formatEther(tier1Tokens));
      await presale.buy(tier1Tokens, deadline, { value: tier1Cost });
      
      // Then buy 50 tokens from tier 2 at 0.125 ETH each = 6.25 ETH
      const tier2Cost = ethers.parseEther("6.25"); // 6.25 ETH
      const tier2Tokens = await presale.calculatePurchaseAcrossTiers(tier2Cost);
      // console.log("Tier 2 - Cost:", ethers.formatEther(tier2Cost), "Expected tokens:", ethers.formatEther(tier2Tokens));
      await presale.buy(tier2Tokens, deadline, { value: tier2Cost });
      
      // Verify we're in tier 2 and it's half full
      const [currentTier, currentPrice, remainingInTier, totalRemaining] = await presale.getPresaleState();
      // console.log("After tier 2 buy - Current tier:", currentTier.toString());
      // console.log("Current price:", ethers.formatEther(currentPrice), "ETH");
      // console.log("Remaining in tier:", ethers.formatEther(remainingInTier));
      // console.log("Total remaining:", ethers.formatEther(totalRemaining));
      
      expect(currentTier).to.equal(1); // tier 2 (0-based)
      expect(currentPrice).to.equal((initialPrice * 125n) / 100n); // tier 2 price
      expect(remainingInTier).to.equal(tokensPerTier - tier2Tokens); // 5 tokens left in tier 2
      
      // Now sell all 15 tokens
      const totalTokens = tier1Tokens + tier2Tokens;
      await token.approve(await presale.getAddress(), totalTokens);
      
      // Calculate expected return:
      // - First 5 tokens at tier 2 price (0.125 ETH) = 0.625 ETH
      // - Then 10 tokens at tier 1 price (0.1 ETH) = 1 ETH
      // Total expected: 1.625 ETH
      const totalSpent = tier1Cost + tier2Cost;
      const sellReturn = await presale.calculateSellReturn(totalTokens);
      
      // Verify sell return matches what we spent
      expect(sellReturn).to.equal(totalSpent);
      
      // Sell tokens and verify ETH received
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await presale.sell(totalTokens, sellReturn, deadline);
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Account for gas costs
      expect(balanceAfter - balanceBefore).to.be.closeTo(sellReturn, ethers.parseEther("0.001"));
      
      // Verify tiers are reset
      const [finalTier, finalPrice, finalRemaining, totalFinalRemaining] = await presale.getPresaleState();
      // console.log("After sell - Final tier:", finalTier.toString());
      // console.log("Final price:", ethers.formatEther(finalPrice), "ETH");
      // console.log("Final remaining in tier:", ethers.formatEther(finalRemaining));
      // console.log("Total final remaining:", ethers.formatEther(totalFinalRemaining));
      
      expect(finalTier).to.equal(0); // back to tier 1
      expect(finalPrice).to.equal(initialPrice);
      expect(finalRemaining).to.equal(tokensPerTier); // full tier available
    });
  });

  describe("Sell Protection", function () {
    it("Should revert when deadline is passed", async function () {
      const { presale, token, owner, initialPrice } = await loadFixture(deployPresaleFixture);
      
      // Buy 5 tokens from tier 1 at 0.1 ETH each = 0.5 ETH
      const cost = ethers.parseEther("0.5"); // 0.5 ETH
      const buyDeadline = (await time.latest()) + 3600;
      const tokens = await presale.calculatePurchaseAcrossTiers(cost);
      // console.log("Cost:", ethers.formatEther(cost), "Expected tokens:", ethers.formatEther(tokens));
      
      await presale.buy(tokens, buyDeadline, { value: cost });
      
      // Approve tokens for selling
      await token.approve(await presale.getAddress(), tokens);
      
      // Set expired deadline
      const sellDeadline = (await time.latest()) - 1;
      
      // Try to sell with expired deadline
      await expect(
        presale.sell(tokens, 0, sellDeadline)
      ).to.be.revertedWith("Transaction expired");
    });

    it("Should revert when slippage is too high", async function () {
      const { presale, token, owner, initialPrice } = await loadFixture(deployPresaleFixture);
      
      // Buy 5 tokens from tier 1 at 0.1 ETH each = 0.5 ETH
      const cost = ethers.parseEther("0.5"); // 0.5 ETH
      const deadline = (await time.latest()) + 3600;
      const tokens = await presale.calculatePurchaseAcrossTiers(cost);
      // console.log("Cost:", ethers.formatEther(cost), "Expected tokens:", ethers.formatEther(tokens));
      
      await presale.buy(tokens, deadline, { value: cost });
      
      // Approve tokens for selling
      await token.approve(await presale.getAddress(), tokens);
      
      // Get expected ETH return (0.5 ETH) and add 1% to minExpected
      const sellReturn = await presale.calculateSellReturn(tokens);
      const minExpected = sellReturn + (sellReturn * 1n) / 100n; // 0.505 ETH
      
      // Try to sell with too high minExpected
      await expect(
        presale.sell(tokens, minExpected, deadline)
      ).to.be.revertedWith("Slippage too high");
    });

    it("Should revert when trying to sell more tokens than owned", async function () {
      const { presale, token, owner } = await loadFixture(deployPresaleFixture);
      const [_, otherUser] = await ethers.getSigners();
      
      // First have another user buy tokens to add ETH to contract
      const buyAmount = ethers.parseEther("1"); // 1 ETH
      const deadline = (await time.latest()) + 3600;
      await presale.connect(otherUser).buy(0, deadline, { value: buyAmount });
      
      // Now try to sell tokens we don't own
      const tokenAmount = ethers.parseEther("1");
      await expect(
        presale.sell(tokenAmount, 0, deadline)
      ).to.be.reverted;
    });
  });
});
