import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";
import { DAOPresale } from "../../../typechain-types";

// Reuse the same fixture from BasicOperations
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

  const presaleAmount = ethers.parseEther("100000");
  const initialPrice = ethers.parseEther("0.001");

  await dao.proposePresale(presaleAmount, initialPrice);
  await dao.vote(1, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(1);

  const presaleAddress = await dao.getPresaleContract(1);
  const presale = await ethers.getContractAt("DAOPresale", presaleAddress);
  const tokensPerTier = await presale.tokensPerTier();

  return {
    ...daoFixture,
    presale,
    presaleAmount,
    initialPrice,
    tokensPerTier
  };
}

describe("DAOPresale Edge Cases", function () {
  describe("Zero Value Handling", function () {
    it("Should revert when trying to buy with 0 ETH", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      await expect(
        presale.buy(0, deadline, { value: 0 })
      ).to.be.revertedWith("Zero ETH sent");
    });

    it("Should revert when trying to sell 0 tokens", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      await expect(
        presale.sell(0, 0, deadline)
      ).to.be.revertedWith("Zero tokens");
    });
  });

  describe("Balance Checks", function () {
    it("Should revert when trying to sell more tokens than owned", async function () {
      const { presale, token } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;
      const tokenAmount = ethers.parseEther("1000");

      await token.approve(await presale.getAddress(), tokenAmount);

      await expect(
        presale.sell(tokenAmount, 0, deadline)
      ).to.be.revertedWith("Insufficient ETH balance");
    });

    it("Should revert when trying to buy more tokens than available", async function () {
      const { presale, presaleAmount, initialPrice, token } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      // Calculate total ETH needed for all tiers
      let remainingTokens = presaleAmount;
      let currentPrice = initialPrice;
      let totalEthNeeded = 0n;
      const tokensPerTier = presaleAmount / 10n;

      while (remainingTokens > 0n) {
        const tierTokens = remainingTokens > tokensPerTier ? tokensPerTier : remainingTokens;
        const tierCost = (tierTokens * currentPrice) / ethers.parseEther("1");
        totalEthNeeded += tierCost;
        remainingTokens -= tierTokens;
        currentPrice = (currentPrice * 125n) / 100n;
      }

      // Buy all tokens
      await presale.buy(0, deadline, { value: totalEthNeeded });

      // Verify all tokens are bought
      expect(await token.balanceOf(await presale.getAddress())).to.equal(0);

      // Try to buy more
      await expect(
        presale.buy(0, deadline, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Not enough tokens");
    });
  });

  describe("Final Tier Edge Cases", function () {
    it("Should handle purchase that would exceed total supply", async function () {
      const { presale, presaleAmount, initialPrice } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      // Calculate total ETH needed for all tiers plus extra
      let remainingTokens = presaleAmount;
      let currentPrice = initialPrice;
      let totalEthNeeded = 0n;
      const tokensPerTier = presaleAmount / 10n;

      while (remainingTokens > 0n) {
        const tierTokens = remainingTokens > tokensPerTier ? tokensPerTier : remainingTokens;
        const tierCost = (tierTokens * currentPrice) / ethers.parseEther("1");
        totalEthNeeded += tierCost;
        remainingTokens -= tierTokens;
        currentPrice = (currentPrice * 125n) / 100n;
      }

      const extraEth = ethers.parseEther("1");
      
      // This should only buy up to available supply
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(totalEthNeeded + extraEth);
      expect(expectedTokens).to.equal(presaleAmount);
    });

    it("Should handle selling in last tier correctly", async function () {
      const { presale, token, presaleAmount, initialPrice, owner } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      // Calculate total ETH needed for all tiers
      let remainingTokens = presaleAmount;
      let currentPrice = initialPrice;
      let totalEthNeeded = 0n;
      const tokensPerTier = presaleAmount / 10n;

      while (remainingTokens > 0n) {
        const tierTokens = remainingTokens > tokensPerTier ? tokensPerTier : remainingTokens;
        const tierCost = (tierTokens * currentPrice) / ethers.parseEther("1");
        totalEthNeeded += tierCost;
        remainingTokens -= tierTokens;
        currentPrice = (currentPrice * 125n) / 100n;
      }

      // Buy all tokens
      await presale.buy(0, deadline, { value: totalEthNeeded });

      // Sell half the tokens
      const halfTokens = presaleAmount / 2n;
      await token.approve(await presale.getAddress(), halfTokens);
      
      // Calculate expected ETH return
      const expectedEth = await presale.calculateSellReturn(halfTokens);
      
      await expect(
        presale.sell(halfTokens, expectedEth, deadline)
      ).to.emit(presale, "TokensSold")
      .withArgs(owner.address, halfTokens, expectedEth);
    });
  });

  describe("Tier Boundary Cases", function () {
    it("Should handle purchase exactly at tier boundary", async function () {
      const { presale, tokensPerTier, initialPrice } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;
      // console.log('tokensPerTier ' + tokensPerTier);
      // console.log('initialPrice ' + initialPrice);
      
      // Buy exactly one tier's worth
      const exactTierCost = (tokensPerTier * initialPrice) / ethers.parseEther("1");
      await presale.buy(tokensPerTier, deadline, { value: exactTierCost });

      // Should be in next tier
      const currentTier = await presale.getCurrentTier();
      const currentPrice = await presale.getCurrentPrice();
      expect(currentTier).to.equal(1);
      expect(currentPrice).to.equal((initialPrice * 125n) / 100n);

      // Remaining in current tier should be exactly tokensPerTier
      const remainingInTier = await presale.getRemainingInCurrentTier();
      expect(remainingInTier).to.equal(tokensPerTier);
    });

    it("Should handle purchase one token before tier boundary", async function () {
      const { presale, tokensPerTier, initialPrice } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      // Buy one less than a full tier
      const tokens = tokensPerTier - ethers.parseEther("1");
      const cost = (tokens * initialPrice) / ethers.parseEther("1");
      await presale.buy(tokens, deadline, { value: cost });

      // Should still be in first tier
      const currentTier = await presale.getCurrentTier();
      const currentPrice = await presale.getCurrentPrice();
      expect(currentTier).to.equal(0);
      expect(currentPrice).to.equal(initialPrice);

      // Remaining in current tier should be exactly 1 token
      const remainingInTier = await presale.getRemainingInCurrentTier();
      expect(remainingInTier).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Rounding Edge Cases", function () {
    it("Should handle tiny ETH amounts correctly", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      // Try to buy with 1 wei
      const tinyAmount = 1n;
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(tinyAmount);
      
      // Should get a very small but non-zero amount of tokens
      expect(expectedTokens).to.be.gt(0);

      // Should be able to buy with 1 wei
      await expect(
        presale.buy(expectedTokens, deadline, { value: tinyAmount })
      ).to.not.be.reverted;
    });

    it("Should revert only when ETH amount is actually zero", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      const deadline = (await time.latest()) + 3600;

      await expect(
        presale.buy(0, deadline, { value: 0 })
      ).to.be.revertedWith("Zero ETH sent");
    });

    it("Should handle precision loss in multi-tier calculations", async function () {
      const { presale, tokensPerTier } = await loadFixture(deployPresaleFixture);
      
      // Buy tokens across multiple tiers with amount that could cause precision loss
      const oddAmount = ethers.parseEther("1.234567891234567891");
      const tokens = await presale.calculatePurchaseAcrossTiers(oddAmount);
      
      // Verify the returned tokens can actually be bought
      const deadline = (await time.latest()) + 3600;
      await expect(
        presale.buy(tokens, deadline, { value: oddAmount })
      ).to.not.be.reverted;
    });
  });

  describe("Receive Function", function () {
    it("Should accept direct ETH transfers", async function () {
      const { presale, owner } = await loadFixture(deployPresaleFixture);
      const amount = ethers.parseEther("1");

      await expect(
        owner.sendTransaction({
          to: await presale.getAddress(),
          value: amount
        })
      ).to.not.be.reverted;
    });

    it("Should maintain correct balance after direct transfers", async function () {
      const { presale, owner } = await loadFixture(deployPresaleFixture);
      const amount = ethers.parseEther("1");

      const balanceBefore = await ethers.provider.getBalance(await presale.getAddress());
      
      await owner.sendTransaction({
        to: await presale.getAddress(),
        value: amount
      });

      const balanceAfter = await ethers.provider.getBalance(await presale.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });
  });

  describe("Initialization Checks", function () {
    it("Should revert initialization with zero token address", async function () {
      const presaleImpl = await ethers.deployContract("DAOPresale");
      await presaleImpl.waitForDeployment();

      await expect(
        presaleImpl.initialize(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.parseEther("100000"),
          ethers.parseEther("0.001")
        )
      ).to.be.reverted;
    });

    it("Should revert on double initialization", async function () {
      const { presale, token, treasury } = await loadFixture(deployPresaleFixture);

      await expect(
        presale.initialize(
          await token.getAddress(),
          await treasury.getAddress(),
          ethers.parseEther("100000"),
          ethers.parseEther("0.001")
        )
      ).to.be.reverted; // OpenZeppelin uses custom error for initialization
    });
  });
});
