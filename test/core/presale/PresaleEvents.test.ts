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

  const presaleAmount = ethers.parseEther("100000");
  const initialPrice = ethers.parseEther("0.001");

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

describe("DAOPresale Events", function () {
  describe("Purchase Events", function () {
    it("Should emit TokensPurchased event on buy", async function () {
      const { presale, owner } = await loadFixture(deployPresaleFixture);
      
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      
      await expect(presale.buy(expectedTokens, deadline, { value: ethAmount }))
        .to.emit(presale, "TokensPurchased")
        .withArgs(owner.address, ethAmount, expectedTokens);
    });

    it("Should emit TokensSold event on sell", async function () {
      const { presale, token, owner } = await loadFixture(deployPresaleFixture);
      
      // First buy some tokens
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      const buyTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      await presale.buy(buyTokens, deadline, { value: ethAmount });
      
      // Approve and sell
      await token.approve(await presale.getAddress(), buyTokens);
      const sellReturn = await presale.calculateSellReturn(buyTokens);
      
      await expect(presale.sell(buyTokens, sellReturn, deadline))
        .to.emit(presale, "TokensSold")
        .withArgs(owner.address, buyTokens, sellReturn);
    });
  });

  describe("End of Presale Event", function () {
    it("Should emit PresaleEnded event when all tokens are sold", async function () {
      const { presale, presaleAmount, initialPrice, tokensPerTier } = await loadFixture(deployPresaleFixture);
      
      // Calculate total ETH needed for all tiers
      let remainingTokens = presaleAmount;
      let currentPrice = initialPrice;
      let totalEthNeeded = 0n;

      while (remainingTokens > 0n) {
        const tierTokens = remainingTokens > tokensPerTier ? tokensPerTier : remainingTokens;
        const tierCost = (tierTokens * currentPrice) / ethers.parseEther("1");
        totalEthNeeded += tierCost;
        remainingTokens -= tierTokens;
        currentPrice = (currentPrice * 125n) / 100n;
      }

      const deadline = (await time.latest()) + 3600;
      
      // Calculate exact tokens we'll get
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(totalEthNeeded);
      
      // Buy all tokens
      await expect(presale.buy(expectedTokens, deadline, { value: totalEthNeeded }))
        .to.emit(presale, "PresaleEnded")
        .withArgs(totalEthNeeded);
      
      // Verify no tokens left
      const [,,, totalRemaining] = await presale.getPresaleState();
      expect(totalRemaining).to.equal(0);
    });
  });

  describe("Pause Events", function () {
    it("Should emit Paused event when paused through DAO", async function () {
      const { dao, presale } = await loadFixture(deployPresaleFixture);
      const presaleAddress = await presale.getAddress();
      
      // Create pause proposal
      await dao.proposePresalePause(presaleAddress, true);
      await dao.vote(2, true);
      await advanceToEndOfVotingPeriod();
      
      // Execute and check for event
      await expect(dao.execute(2))
        .to.emit(presale, "Paused")
        .withArgs(true);
    });

    it("Should emit Paused event when unpaused through DAO", async function () {
      const { dao, presale } = await loadFixture(deployPresaleFixture);
      const presaleAddress = await presale.getAddress();
      
      // First pause
      await dao.proposePresalePause(presaleAddress, true);
      await dao.vote(2, true);
      await advanceToEndOfVotingPeriod();
      await dao.execute(2);
      
      // Then unpause
      await dao.proposePresalePause(presaleAddress, false);
      await dao.vote(3, true);
      await advanceToEndOfVotingPeriod();
      
      await expect(dao.execute(3))
        .to.emit(presale, "Paused")
        .withArgs(false);
    });
  });
});
