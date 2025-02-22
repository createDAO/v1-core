import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFactoryFixture, deployImplementationsFixture } from "../../fixtures/factory.fixture";

describe("DAOFactory Storage", function() {
  describe("Implementation Management", function() {
    it("Should register and retrieve implementations correctly", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Get implementation data
      const implData = await factory.getCoreImplementation("1.0.0");
      
      // Verify all implementation addresses match
      expect(implData.daoImpl).to.equal(await implementations.dao.getAddress());
      expect(implData.tokenImpl).to.equal(await implementations.token.getAddress());
      expect(implData.treasuryImpl).to.equal(await implementations.treasury.getAddress());
      expect(implData.stakingImpl).to.equal(await implementations.staking.getAddress());
    });

    it("Should maintain storage isolation between different versions", async function() {
      const { factory, implementations, owner } = await loadFixture(deployImplementationsFixture);
      
      // Deploy new set of implementations for version 2
      const newDaoImpl = await ethers.deployContract("DAO");
      const newTokenImpl = await ethers.deployContract("DAOToken");
      const newTreasuryImpl = await ethers.deployContract("DAOTreasury");
      const newStakingImpl = await ethers.deployContract("DAOStaking");
      
      await Promise.all([
        newDaoImpl.waitForDeployment(),
        newTokenImpl.waitForDeployment(),
        newTreasuryImpl.waitForDeployment(),
        newStakingImpl.waitForDeployment(),
      ]);

      // Register new version
      await factory.registerCoreImplementation(
        "2.0.0",
        await newDaoImpl.getAddress(),
        await newTokenImpl.getAddress(),
        await newTreasuryImpl.getAddress(),
        await newStakingImpl.getAddress(),
        "0x"
      );

      // Verify both versions maintain their correct implementations
      const v1Impls = await factory.getCoreImplementation("1.0.0");
      const v2Impls = await factory.getCoreImplementation("2.0.0");

      expect(v1Impls.daoImpl).to.equal(await implementations.dao.getAddress());
      expect(v2Impls.daoImpl).to.equal(await newDaoImpl.getAddress());
    });

    it("Should track version history correctly", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Get initial versions
      const versions = await factory.getAvailableVersions();
      expect(versions).to.have.lengthOf(1);
      expect(versions[0]).to.equal("1.0.0");
      
      // Deploy and register new version
      const newImplementations = await Promise.all([
        ethers.deployContract("DAO"),
        ethers.deployContract("DAOToken"),
        ethers.deployContract("DAOTreasury"),
        ethers.deployContract("DAOStaking"),
      ]);
      
      await Promise.all(newImplementations.map(impl => impl.waitForDeployment()));
      
      await factory.registerCoreImplementation(
        "2.0.0",
        await newImplementations[0].getAddress(),
        await newImplementations[1].getAddress(),
        await newImplementations[2].getAddress(),
        await newImplementations[3].getAddress(),
        "0x"
      );
      
      // Verify updated versions array
      const updatedVersions = await factory.getAvailableVersions();
      expect(updatedVersions).to.have.lengthOf(2);
      expect(updatedVersions[0]).to.equal("1.0.0");
      expect(updatedVersions[1]).to.equal("2.0.0");
    });
  });

  describe("Factory Version", function() {
    it("Should return correct factory version", async function() {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.getFactoryVersion()).to.equal("1.0.0");
    });

    it("Should maintain factory version after upgrade", async function() {
      const { factory, owner } = await loadFixture(deployFactoryFixture);
      
      // Deploy new factory implementation with same version
      const FactoryV1 = await ethers.getContractFactory("DAOFactory");
      const newImplementation = await FactoryV1.deploy();
      await newImplementation.waitForDeployment();

      // Upgrade to new implementation
      await factory.upgradeToAndCall(await newImplementation.getAddress(), "0x");

      // Version should remain the same
      expect(await factory.getFactoryVersion()).to.equal("1.0.0");
    });
  });

  describe("Storage Safety", function() {
    it("Should prevent zero address implementations", async function() {
      const { factory } = await loadFixture(deployFactoryFixture);
      
      await expect(factory.registerCoreImplementation(
        "2.0.0",
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        "0x"
      )).to.be.revertedWith("Zero DAO implementation");
    });

    it("Should prevent registering same version twice", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      await expect(factory.registerCoreImplementation(
        "1.0.0", // Try to register same version again
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        "0x"
      )).to.be.revertedWith("Version exists");
    });

    it("Should prevent non-owner from registering implementations", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      const [, nonOwner] = await ethers.getSigners();
      
      await expect(factory.connect(nonOwner).registerCoreImplementation(
        "2.0.0",
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        "0x"
      )).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from upgrading factory", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      const [, nonOwner] = await ethers.getSigners();
      
      const FactoryV1 = await ethers.getContractFactory("DAOFactory");
      const newImplementation = await FactoryV1.deploy();
      
      await expect(factory.connect(nonOwner).upgradeToAndCall(
        await newImplementation.getAddress(),
        "0x"
      )).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should handle empty initialization data", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      await factory.registerCoreImplementation(
        "empty.init",
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        "0x"
      );

      const impls = await factory.getCoreImplementation("empty.init");
      expect(impls.daoImpl).to.equal(await implementations.dao.getAddress());
    });

    it("Should revert when getting latest version with no versions", async function() {
      const { factory } = await loadFixture(deployFactoryFixture);
      
      // Try to get latest version before any are registered
      await expect(factory.getLatestVersion()).to.be.revertedWith("No versions registered");
    });
  });
});
