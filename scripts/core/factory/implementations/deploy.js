const { ethers } = require("hardhat");
const { verify } = require("../../../utils/verification");

async function main() {
  console.log("Starting implementations deployment...");

  // Deploy DAO implementation
  console.log("\nDeploying DAO implementation...");
  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("DAO implementation deployed to:", daoAddress);
  await verify(daoAddress, []);

  // Deploy Token implementation
  console.log("\nDeploying Token implementation...");
  const DAOToken = await ethers.getContractFactory("DAOToken");
  const token = await DAOToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token implementation deployed to:", tokenAddress);
  await verify(tokenAddress, []);

  // Deploy Treasury implementation
  console.log("\nDeploying Treasury implementation...");
  const DAOTreasury = await ethers.getContractFactory("DAOTreasury");
  const treasury = await DAOTreasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury implementation deployed to:", treasuryAddress);
  await verify(treasuryAddress, []);

  // Deploy Staking implementation
  console.log("\nDeploying Staking implementation...");
  const DAOStaking = await ethers.getContractFactory("DAOStaking");
  const staking = await DAOStaking.deploy();
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("Staking implementation deployed to:", stakingAddress);
  await verify(stakingAddress, []);

  console.log("\n✅ All implementations deployed successfully!");

  // Return addresses for use in other scripts
  return {
    daoAddress,
    tokenAddress,
    treasuryAddress,
    stakingAddress,
  };
}

// Run directly or export for use in other scripts
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
