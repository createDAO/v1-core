import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";
import { DAOPresale } from "../../../typechain-types";

async function deployPresaleFixture() {
  const daoFixture = await loadFixture(deployDAOFixture);
  const { dao, staking, token, treasury, owner } = daoFixture;

  // Deploy and register presale implementation
  const presaleImpl = await ethers.deployContract("DAOPresale");
  await presaleImpl.waitForDeployment();

  // Register new version with presale implementation
  await daoFixture.factory.registerImplementation(
    "latest",
    await daoFixture.dao.getAddress(),
    await token.getAddress(),
    await treasury.getAddress(),
    await staking.getAddress(),
    await presaleImpl.getAddress(),
    "0x"
  );

  // Setup voting power
  await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
  const totalStaked = await staking.totalStaked();
  const neededVotes = (totalStaked * 1000n) / 10000n + 1n; // 10% + 1

  // Get enough tokens to meet quorum
  await dao.proposeTransfer(
    await token.getAddress(),
    await owner.getAddress(),
    neededVotes
  );
  await dao.vote(0, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(0);

  // Stake tokens for presale proposal
  await token.approve(await staking.getAddress(), neededVotes);
  await staking.stake(neededVotes);

  // Create presale
  const presaleAmount = ethers.parseEther("100000");
  const initialPrice = ethers.parseEther("0.001"); // 0.001 ETH per token

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

describe("DAOPresale Basic Operations", function () {
  describe("Basic Buy Operations", function () {
    it("Should correctly transfer tokens on purchase", async function () {
      const { presale, token, owner } = await loadFixture(deployPresaleFixture);
      
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      
      const balanceBefore = await token.balanceOf(owner.address);
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      
      await presale.buy(expectedTokens, deadline, { value: ethAmount });
      
      const balanceAfter = await token.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(expectedTokens);
    });

    it("Should update contract ETH balance after purchase", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      
      const balanceBefore = await ethers.provider.getBalance(await presale.getAddress());
      await presale.buy(expectedTokens, deadline, { value: ethAmount });
      const balanceAfter = await ethers.provider.getBalance(await presale.getAddress());
      
      expect(balanceAfter - balanceBefore).to.equal(ethAmount);
    });
  });

  describe("Buy Protection", function () {
    it("Should revert when deadline is passed", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) - 1; // Expired deadline
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      
      await expect(
        presale.buy(expectedTokens, deadline, { value: ethAmount })
      ).to.be.revertedWith("Transaction expired");
    });

    it("Should revert when slippage is too high", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      const expectedTokens = await presale.calculatePurchaseAcrossTiers(ethAmount);
      
      // Expect more tokens than possible
      const tooManyTokens = expectedTokens + ethers.parseEther("1");
      
      await expect(
        presale.buy(tooManyTokens, deadline, { value: ethAmount })
      ).to.be.revertedWith("Slippage too high");
    });

    it("Should revert when trying to buy with zero ETH", async function () {
      const { presale } = await loadFixture(deployPresaleFixture);
      
      const deadline = (await time.latest()) + 3600;
      
      await expect(
        presale.buy(0, deadline, { value: 0 })
      ).to.be.revertedWith("Zero ETH sent");
    });

    it("Should revert when presale is paused", async function () {
      const { dao, presale } = await loadFixture(deployPresaleFixture);
      const presaleAddress = await presale.getAddress();
      
      // Pause presale
      await dao.proposePresalePause(presaleAddress, true);
      await dao.vote(2, true);
      await advanceToEndOfVotingPeriod();
      await dao.execute(2);
      
      const ethAmount = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 3600;
      
      await expect(
        presale.buy(0, deadline, { value: ethAmount })
      ).to.be.revertedWith("Presale is paused");
    });
  });
});
