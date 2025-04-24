const { ethers } = require("hardhat");

/**
 * Validates DAO contract relationships and configuration
 * @param {Object} params - Validation parameters
 * @param {Object} params.factory - Factory contract instance
 * @param {string} params.factoryAddress - Factory contract address
 * @param {string} params.daoAddress - DAO contract address
 * @param {string} params.tokenAddress - Token contract address
 * @param {string} params.treasuryAddress - Treasury contract address
 * @param {string} params.stakingAddress - Staking contract address
 * @param {Object} params.config - DAO configuration
 * @param {string} params.config.name - DAO name
 * @param {string} params.config.tokenName - Token name
 * @param {string} params.config.tokenSymbol - Token symbol
 */
async function validateDAOSetup(params) {
  const {
    factory,
    factoryAddress,
    daoAddress,
    tokenAddress,
    treasuryAddress,
    stakingAddress,
    config
  } = params;

  // Get contracts
  const DAO = await ethers.getContractFactory("contracts/DAO.sol:DAO");
  const Token = await ethers.getContractFactory("contracts/DAOToken.sol:DAOToken");
  const Treasury = await ethers.getContractFactory("contracts/DAOTreasury.sol:DAOTreasury");
  const Staking = await ethers.getContractFactory("contracts/DAOStaking.sol:DAOStaking");

  console.log("\nVerifying addresses...");
  console.log("DAO address:", daoAddress);
  console.log("Token address:", tokenAddress);
  console.log("Treasury address:", treasuryAddress);
  console.log("Staking address:", stakingAddress);
  console.log("Factory address:", factoryAddress);

  const dao = DAO.attach(daoAddress);
  const token = Token.attach(tokenAddress);
  const treasury = Treasury.attach(treasuryAddress);
  const staking = Staking.attach(stakingAddress);

  // First verify the proxy is properly initialized
  console.log("\nVerifying proxy initialization...");
  try {
    await dao.name();
  } catch (error) {
    console.error("DAO proxy not properly initialized!");
    console.error("This might mean the implementation contract is not properly set");
    throw error;
  }

  // Verify DAO configuration
  const daoName = await dao.name();
  const daoToken = await dao.upgradeableContracts(1); // Token = 1
  const daoTreasury = await dao.upgradeableContracts(2); // Treasury = 2
  const daoStaking = await dao.upgradeableContracts(3); // Staking = 3
  const daoFactory = await dao.factory();

  // Verify Token configuration
  const tokenOwner = await token.owner();
  const totalSupply = await token.totalSupply();
  const creatorBalance = await token.balanceOf((await ethers.provider.getSigner()).address);
  const treasuryBalance = await token.balanceOf(treasuryAddress);
  const expectedTreasuryBalance = totalSupply - creatorBalance;

  // Verify Staking configuration
  const stakingToken = await staking.token.staticCall();

  // Verify all relationships are correct
  const checks = {
    "DAO name matches": daoName === config.name,
    "DAO token reference correct": daoToken === tokenAddress,
    "DAO treasury reference correct": daoTreasury === treasuryAddress,
    "DAO staking reference correct": daoStaking === stakingAddress,
    "DAO factory reference correct": daoFactory === factoryAddress,
    "Token owner is DAO": tokenOwner === daoAddress,
    "Staking token reference correct": stakingToken === tokenAddress,
    "Treasury holds correct token balance": treasuryBalance === expectedTreasuryBalance
  };

  console.log("\nValidation Results:");
  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`- ${check}: ${passed ? "✅" : "❌"}`);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    throw new Error("Validation failed! Check the logs above for details.");
  }

  return true;
}

module.exports = {
  validateDAOSetup
};
