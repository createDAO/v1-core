const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main() {
  console.log("Starting DAOFactory deployment (v1.0.0)...");

  // Deploy implementation
  const DAOFactory = await ethers.getContractFactory("DAOFactory");
  const implementation = await DAOFactory.deploy();
  await implementation.waitForDeployment();
  
  const implementationAddress = await implementation.getAddress();
  console.log("DAOFactory implementation deployed to:", implementationAddress);

  // Get initialization data
  const [deployer] = await ethers.getSigners();
  const initData = DAOFactory.interface.encodeFunctionData("initialize", [deployer.address]);

  // Deploy proxy
  const DAOFactoryProxy = await ethers.getContractFactory("contracts/DAOFactoryProxy.sol:DAOFactoryProxy");
  const proxy = await DAOFactoryProxy.deploy(implementationAddress, initData);
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  console.log("DAOFactoryProxy deployed to:", proxyAddress);

  // Verify the implementation contract
  console.log("\nVerifying implementation contract on Etherscan...");
  await verify(implementationAddress, []);

  // Verify the proxy contract
  console.log("\nVerifying proxy contract on Etherscan...");
  await verify(proxyAddress, [implementationAddress, initData], "contracts/DAOFactoryProxy.sol:DAOFactoryProxy");

  console.log("\nDeployment completed!");
  console.log("Implementation:", implementationAddress);
  console.log("Proxy:", proxyAddress);

  // Return addresses for use in other scripts
  return {
    implementationAddress,
    proxyAddress
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
