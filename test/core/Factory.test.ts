import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployFactoryFixture, deployImplementationsFixture } from "../fixtures/factory.fixture";

describe("DAOFactory", function() {
  describe("Deployment", function() {
    it("Should deploy factory and initialize correctly", async function() {
      const { factory, owner } = await loadFixture(deployFactoryFixture);
      expect(await factory.owner()).to.equal(await owner.getAddress());
    });

    it("Should have correct factory version", async function() {
      const { factory } = await loadFixture(deployFactoryFixture);
      expect(await factory.getFactoryVersion()).to.equal("1.0.0");
    });
  });

  describe("Implementation Registration", function() {
    it("Should register new implementation version", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Get registered implementations
      const registeredImpls = await factory.getImplementation("1.0.0");
      
      // Verify each implementation address matches
      expect(registeredImpls.daoImpl).to.equal(await implementations.dao.getAddress());
      expect(registeredImpls.tokenImpl).to.equal(await implementations.token.getAddress());
      expect(registeredImpls.treasuryImpl).to.equal(await implementations.treasury.getAddress());
      expect(registeredImpls.stakingImpl).to.equal(await implementations.staking.getAddress());
      expect(registeredImpls.presaleImpl).to.equal(await implementations.presale.getAddress());
    });

    it("Should prevent duplicate version registration", async function() {
      const { factory, implementations } = await loadFixture(deployImplementationsFixture);
      
      // Try to register same version again
      await expect(factory.registerImplementation(
        "1.0.0",
        await implementations.dao.getAddress(),
        await implementations.token.getAddress(),
        await implementations.treasury.getAddress(),
        await implementations.staking.getAddress(),
        await implementations.presale.getAddress(),
        "0x"
      )).to.be.revertedWith("Version exists");
    });

    it("Should return latest version correctly", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      expect(await factory.getLatestVersion()).to.equal("1.0.0");
    });
  });
});
