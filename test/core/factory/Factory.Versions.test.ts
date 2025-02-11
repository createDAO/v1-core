import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFactoryFixture, deployImplementationsFixture } from "../../fixtures/factory.fixture";

describe("DAOFactory Versions", function() {
  describe("Version Management", function() {
    it("Should track latest version correctly", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Initial version check
      expect(await factory.getLatestVersion()).to.equal("1.0.0");
      
      // Deploy new implementations
      const newImplementations = await Promise.all([
        ethers.deployContract("DAO"),
        ethers.deployContract("DAOToken"),
        ethers.deployContract("DAOTreasury"),
        ethers.deployContract("DAOStaking"),
        ethers.deployContract("DAOPresale")
      ]);
      
      await Promise.all(newImplementations.map(impl => impl.waitForDeployment()));
      
      // Register new version
      await factory.registerImplementation(
        "2.0.0",
        await newImplementations[0].getAddress(),
        await newImplementations[1].getAddress(),
        await newImplementations[2].getAddress(),
        await newImplementations[3].getAddress(),
        await newImplementations[4].getAddress(),
        "0x"
      );
      
      // Check updated latest version
      expect(await factory.getLatestVersion()).to.equal("2.0.0");
    });

    it("Should emit ImplementationRegistered event with correct data", async function() {
      const { factory } = await loadFixture(deployFactoryFixture);
      
      const implementations = await Promise.all([
        ethers.deployContract("DAO"),
        ethers.deployContract("DAOToken"),
        ethers.deployContract("DAOTreasury"),
        ethers.deployContract("DAOStaking"),
        ethers.deployContract("DAOPresale")
      ]);
      
      await Promise.all(implementations.map(impl => impl.waitForDeployment()));
      
      await expect(factory.registerImplementation(
        "1.0.0",
        await implementations[0].getAddress(),
        await implementations[1].getAddress(),
        await implementations[2].getAddress(),
        await implementations[3].getAddress(),
        await implementations[4].getAddress(),
        "0x"
      ))
        .to.emit(factory, "ImplementationRegistered")
        .withArgs("1.0.0", await implementations[0].getAddress());
    });

    it("Should return correct implementation addresses for a version", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      const impls = await factory.getImplementation("1.0.0");
      
      expect(impls.daoImpl).to.equal(await implementations.dao.getAddress());
      expect(impls.tokenImpl).to.equal(await implementations.token.getAddress());
      expect(impls.treasuryImpl).to.equal(await implementations.treasury.getAddress());
      expect(impls.stakingImpl).to.equal(await implementations.staking.getAddress());
      expect(impls.presaleImpl).to.equal(await implementations.presale.getAddress());
    });

    it("Should return empty addresses for non-existent version", async function() {
      const { factory } = await loadFixture(deployFactoryFixture);
      
      const impls = await factory.getImplementation("non.existent");
      
      expect(impls.daoImpl).to.equal(ethers.ZeroAddress);
      expect(impls.tokenImpl).to.equal(ethers.ZeroAddress);
      expect(impls.treasuryImpl).to.equal(ethers.ZeroAddress);
      expect(impls.stakingImpl).to.equal(ethers.ZeroAddress);
      expect(impls.presaleImpl).to.equal(ethers.ZeroAddress);
    });

    it("Should maintain version order correctly", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Deploy new implementations for multiple versions
      const deployNewImplementations = async () => {
        const impls = await Promise.all([
          ethers.deployContract("DAO"),
          ethers.deployContract("DAOToken"),
          ethers.deployContract("DAOTreasury"),
          ethers.deployContract("DAOStaking"),
          ethers.deployContract("DAOPresale")
        ]);
        await Promise.all(impls.map(impl => impl.waitForDeployment()));
        return impls;
      };

      // Register versions in non-sequential order
      const v2Impls = await deployNewImplementations();
      const v11Impls = await deployNewImplementations();
      const v12Impls = await deployNewImplementations();

      await factory.registerImplementation(
        "2.0.0",
        await v2Impls[0].getAddress(),
        await v2Impls[1].getAddress(),
        await v2Impls[2].getAddress(),
        await v2Impls[3].getAddress(),
        await v2Impls[4].getAddress(),
        "0x"
      );

      await factory.registerImplementation(
        "1.1.0",
        await v11Impls[0].getAddress(),
        await v11Impls[1].getAddress(),
        await v11Impls[2].getAddress(),
        await v11Impls[3].getAddress(),
        await v11Impls[4].getAddress(),
        "0x"
      );

      await factory.registerImplementation(
        "1.2.0",
        await v12Impls[0].getAddress(),
        await v12Impls[1].getAddress(),
        await v12Impls[2].getAddress(),
        await v12Impls[3].getAddress(),
        await v12Impls[4].getAddress(),
        "0x"
      );

      // Check version list
      const versions = await factory.getAvailableVersions();
      expect(versions).to.have.lengthOf(4); // Including initial 1.0.0
      expect(versions[0]).to.equal("1.0.0");
      expect(versions[1]).to.equal("2.0.0");
      expect(versions[2]).to.equal("1.1.0");
      expect(versions[3]).to.equal("1.2.0");

      // Latest version should be the most recently added
      expect(await factory.getLatestVersion()).to.equal("1.2.0");
    });

    it("Should handle long version strings", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      const longVersion = "999.999.999-alpha.beta.gamma.delta.epsilon";
      
      await factory.registerImplementation(
        longVersion,
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        await implementations.presale.getAddress(),
        "0x"
      );

      const impls = await factory.getImplementation(longVersion);
      expect(impls.daoImpl).to.equal(await implementations.dao.getAddress());
    });

    it("Should handle complex initialization data", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Create complex initialization data
      const initData = ethers.concat([
        ethers.randomBytes(100),  // Random bytes
        ethers.toUtf8Bytes("Complex initialization data"),
        ethers.randomBytes(100)
      ]);

      await factory.registerImplementation(
        "complex.init",
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        await implementations.presale.getAddress(),
        initData
      );

      // Version should be registered successfully
      const versions = await factory.getAvailableVersions();
      expect(versions).to.include("complex.init");
    });
  });

  describe("Factory Upgrades", function() {
    it("Should preserve implementations after factory upgrade", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Deploy new factory implementation
      const FactoryV1 = await ethers.getContractFactory("DAOFactory");
      const newImplementation = await FactoryV1.deploy();
      await newImplementation.waitForDeployment();

      // Store pre-upgrade state
      const preUpgradeImpl = await factory.getImplementation("1.0.0");
      const preUpgradeVersions = await factory.getAvailableVersions();

      // Upgrade factory
      await factory.upgradeToAndCall(await newImplementation.getAddress(), "0x");

      // Verify post-upgrade state
      const postUpgradeImpl = await factory.getImplementation("1.0.0");
      const postUpgradeVersions = await factory.getAvailableVersions();

      // Implementation addresses should be preserved
      expect(postUpgradeImpl.daoImpl).to.equal(preUpgradeImpl.daoImpl);
      expect(postUpgradeImpl.tokenImpl).to.equal(preUpgradeImpl.tokenImpl);
      expect(postUpgradeImpl.treasuryImpl).to.equal(preUpgradeImpl.treasuryImpl);
      expect(postUpgradeImpl.stakingImpl).to.equal(preUpgradeImpl.stakingImpl);
      expect(postUpgradeImpl.presaleImpl).to.equal(preUpgradeImpl.presaleImpl);

      // Versions should be preserved
      expect(postUpgradeVersions).to.deep.equal(preUpgradeVersions);
    });

    it("Should allow registering new implementations after upgrade", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Deploy and upgrade to new factory implementation
      const FactoryV1 = await ethers.getContractFactory("DAOFactory");
      const newImplementation = await FactoryV1.deploy();
      await factory.upgradeToAndCall(await newImplementation.getAddress(), "0x");

      // Try registering new implementation after upgrade
      const newVersion = "post.upgrade.version";
      await factory.registerImplementation(
        newVersion,
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        await implementations.presale.getAddress(),
        "0x"
      );

      // Verify new version was registered
      const versions = await factory.getAvailableVersions();
      expect(versions).to.include(newVersion);
      
      // Verify implementation addresses
      const impls = await factory.getImplementation(newVersion);
      expect(impls.daoImpl).to.equal(await implementations.dao.getAddress());
    });
  });
});
