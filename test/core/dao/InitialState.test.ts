import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { stakeTokens } from "../../utils/token.utils";

describe("DAO Initial State", function() {
  describe("Deployment Parameters", function() {
    it("Should deploy DAO with correct parameters", async function() {
      const { dao, daoName, treasury, staking, token, factory, owner } = await loadFixture(deployDAOFixture);
      
      expect(await dao.name()).to.equal(daoName);
      expect(await dao.factory()).to.equal(await factory.getAddress());
      expect(await dao.owner()).to.equal(await dao.getAddress()); // DAO owns itself
      
      // Check contract addresses are set correctly
      expect(await dao.upgradeableContracts(0)).to.equal(await dao.getAddress()); // DAO
      expect(await dao.upgradeableContracts(1)).to.equal(await token.getAddress()); // Token
      expect(await dao.upgradeableContracts(2)).to.equal(await treasury.getAddress()); // Treasury
      expect(await dao.upgradeableContracts(3)).to.equal(await staking.getAddress()); // Staking
    });

    it("Should give DAO creator 1 token and rest to treasury", async function() {
      const { token, initialSupply, owner, treasury } = await loadFixture(deployDAOFixture);
      
      const ownerBalance = await token.balanceOf(await owner.getAddress());
      const treasuryBalance = await token.balanceOf(await treasury.getAddress());
      
      expect(ownerBalance).to.equal(ethers.parseEther("1")); // 1 token
      expect(treasuryBalance).to.equal(initialSupply - ethers.parseEther("1")); // Rest to treasury
    });
  });

  describe("Governance Parameters", function() {
    it("Should initialize governance parameters correctly", async function() {
      const { dao } = await loadFixture(deployDAOFixture);
      
      expect(await dao.votingPeriod()).to.equal(3 * 24 * 60 * 60); // 3 days
      expect(await dao.minProposalStake()).to.equal(ethers.parseEther("1")); // 1 token
      expect(await dao.quorum()).to.equal(5000); // 10%
    });

    it("Should allow creator to stake initial token and create proposal", async function() {
      const { dao, token, treasury, owner, staking } = await loadFixture(deployDAOFixture);
      
      // Stake the initial 1 token
      await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
      
      // Create proposal to transfer 1000 tokens from treasury
      const transferAmount = ethers.parseEther("1000");
      await expect(dao.proposeTransfer(
        await token.getAddress(),
        await owner.getAddress(),
        transferAmount
      )).to.emit(dao, "TransferProposalCreated")
        .withArgs(
          0, // proposalId
          await token.getAddress(),
          await owner.getAddress(),
          transferAmount
        );
    });
  });
});
