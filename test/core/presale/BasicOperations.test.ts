import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployPresaleFixture } from "../../fixtures/presale.fixture";
import { ethers } from "hardhat";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

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
