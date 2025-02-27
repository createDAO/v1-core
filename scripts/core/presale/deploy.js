const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main() {
  console.log("Starting DAOPresale implementation deployment...");

  // Deploy DAOPresale implementation
  console.log("\nDeploying DAOPresale implementation...");
  const DAOPresale = await ethers.getContractFactory("DAOPresale");
  const presale = await DAOPresale.deploy();
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log("DAOPresale implementation deployed to:", presaleAddress);
  
  // Verify on Etherscan
  await verify(presaleAddress, []);

  console.log("\n✅ DAOPresale implementation deployed successfully!");

  // Return address for use in other scripts
  return presaleAddress;
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
