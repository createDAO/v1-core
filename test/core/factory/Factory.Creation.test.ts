import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFactoryFixture, deployImplementationsFixture } from "../../fixtures/factory.fixture";
import { DAO } from "../../typechain-types/contracts/DAO";
import { DAOToken } from "../../typechain-types/contracts/DAOToken";
import { DAOTreasury } from "../../typechain-types/contracts/DAOTreasury";
import { DAOStaking } from "../../typechain-types/contracts/DAOStaking";

describe("DAOFactory Creation", function() {
  describe("DAO Creation", function() {
    it("Should create DAO with correct initialization", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const daoName = "Test DAO";
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      
      const tx = await factory.createDAO(
        "1.0.0",
        daoName,
        tokenName,
        tokenSymbol,
        initialSupply
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        log => log.topics[0] === factory.interface.getEvent("DAOCreated").topicHash
      );
      
      if (!event) throw new Error("DAOCreated event not found");
      
      // Get created contract addresses from event
      const daoAddress = ethers.getAddress(event.topics[1].slice(26));
      const tokenAddress = ethers.getAddress(event.topics[2].slice(26));
      const treasuryAddress = ethers.getAddress(event.topics[3].slice(26));
      
      // Get contract instances
      const dao = await ethers.getContractAt("DAO", daoAddress) as DAO;
      const token = await ethers.getContractAt("DAOToken", tokenAddress) as DAOToken;
      const treasury = await ethers.getContractAt("DAOTreasury", treasuryAddress) as DAOTreasury;
      
      // Verify initialization
      expect(await dao.name()).to.equal(daoName);
      expect(await token.name()).to.equal(tokenName);
      expect(await token.symbol()).to.equal(tokenSymbol);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("Should set up correct contract relationships", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const tx = await factory.createDAO(
        "1.0.0",
        "Test DAO",
        "Test Token",
        "TEST",
        ethers.parseEther("1000000")
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        log => log.topics[0] === factory.interface.getEvent("DAOCreated").topicHash
      );
      
      if (!event) throw new Error("DAOCreated event not found");
      
      const daoAddress = ethers.getAddress(event.topics[1].slice(26));
      const tokenAddress = ethers.getAddress(event.topics[2].slice(26));
      const treasuryAddress = ethers.getAddress(event.topics[3].slice(26));
      const stakingAddress = event.args?.stakingAddress;
      
      const dao = await ethers.getContractAt("DAO", daoAddress) as DAO;
      const token = await ethers.getContractAt("DAOToken", tokenAddress) as DAOToken;
      const staking = await ethers.getContractAt("DAOStaking", stakingAddress) as DAOStaking;
      
      // Verify contract relationships
      expect(await dao.upgradeableContracts(0)).to.equal(daoAddress); // DAO = 0
      expect(await dao.upgradeableContracts(1)).to.equal(tokenAddress); // Token = 1
      expect(await dao.upgradeableContracts(2)).to.equal(treasuryAddress); // Treasury = 2
      expect(await dao.upgradeableContracts(3)).to.equal(stakingAddress); // Staking = 3
      expect(await token.stakingContract()).to.equal(stakingAddress);
      expect(await staking.token()).to.equal(tokenAddress);
    });

    it("Should transfer ownership correctly", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const tx = await factory.createDAO(
        "1.0.0",
        "Test DAO",
        "Test Token",
        "TEST",
        ethers.parseEther("1000000")
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        log => log.topics[0] === factory.interface.getEvent("DAOCreated").topicHash
      );
      
      if (!event) throw new Error("DAOCreated event not found");
      
      const daoAddress = ethers.getAddress(event.topics[1].slice(26));
      const tokenAddress = ethers.getAddress(event.topics[2].slice(26));
      const stakingAddress = event.args?.stakingAddress;
      
      const dao = await ethers.getContractAt("DAO", daoAddress) as DAO;
      const token = await ethers.getContractAt("DAOToken", tokenAddress) as DAOToken;
      const staking = await ethers.getContractAt("DAOStaking", stakingAddress) as DAOStaking;

      // Verify ownership
      expect(await dao.owner()).to.equal(daoAddress); // DAO owns itself
      expect(await token.owner()).to.equal(daoAddress); // DAO owns token
      expect(await staking.owner()).to.equal(daoAddress); // DAO owns staking
    });

    it("Should fail creating DAO with non-existent version", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      await expect(factory.createDAO(
        "non.existent",
        "Test DAO",
        "Test Token",
        "TEST",
        ethers.parseEther("1000000")
      )).to.be.revertedWith("Only latest version is active");
    });

    it("Should distribute initial token supply correctly", async function() {
      const { factory, owner } = await loadFixture(deployImplementationsFixture);
      
      const initialSupply = ethers.parseEther("1000000");
      const tx = await factory.createDAO(
        "1.0.0",
        "Test DAO",
        "Test Token",
        "TEST",
        initialSupply
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        log => log.topics[0] === factory.interface.getEvent("DAOCreated").topicHash
      );
      
      if (!event) throw new Error("DAOCreated event not found");
      
      const tokenAddress = ethers.getAddress(event.topics[2].slice(26));
      const treasuryAddress = ethers.getAddress(event.topics[3].slice(26));
      
      const token = await ethers.getContractAt("DAOToken", tokenAddress) as DAOToken;
      
      // Verify token distribution
      expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("1")); // 1 token for initial holder
      expect(await token.balanceOf(treasuryAddress)).to.equal(initialSupply - ethers.parseEther("1")); // Rest to treasury
    });
  });
});
