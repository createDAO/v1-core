import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployImplementationsFixture } from "../../fixtures/factory.fixture";

describe("DAOFactory Validations", function() {
  describe("Token Symbol Validation", function() {
    it("Should allow token symbols with less than 7 characters", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const daoName = "Test DAO";
      const tokenName = "Test Token";
      const tokenSymbol = "TEST"; // 4 characters, should be valid
      const initialSupply = ethers.parseEther("1000000");
      
      // This should not revert
      await expect(factory.createDAO(
        "1.0.0",
        daoName,
        tokenName,
        tokenSymbol,
        initialSupply
      )).to.not.be.reverted;
    });

    it("Should reject token symbols with 7 or more characters", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const daoName = "Test DAO";
      const tokenName = "Test Token";
      const tokenSymbol = "TOOLONG"; // 7 characters, should be invalid
      const initialSupply = ethers.parseEther("1000000");
      
      // This should revert with the appropriate error message
      await expect(factory.createDAO(
        "1.0.0",
        daoName,
        tokenName,
        tokenSymbol,
        initialSupply
      )).to.be.revertedWith("Symbol must be less than 7 chars");
    });
  });

  describe("Token Supply Validation", function() {
    it("Should allow token supply up to the maximum limit", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const daoName = "Test DAO";
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("999999999999"); // Maximum allowed
      
      // This should not revert
      await expect(factory.createDAO(
        "1.0.0",
        daoName,
        tokenName,
        tokenSymbol,
        initialSupply
      )).to.not.be.reverted;
    });

    it("Should reject token supply exceeding the maximum limit", async function() {
      const { factory } = await loadFixture(deployImplementationsFixture);
      
      const daoName = "Test DAO";
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000000000"); // Exceeds maximum
      
      // This should revert with the appropriate error message
      await expect(factory.createDAO(
        "1.0.0",
        daoName,
        tokenName,
        tokenSymbol,
        initialSupply
      )).to.be.revertedWith("Token amount exceeds maximum");
    });
  });
});
