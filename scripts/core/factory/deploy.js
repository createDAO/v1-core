const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main() {
  console.log("Starting DAOFactory deployment (v1.0.0)...");

  // Deploy implementation
  const DAOFactory = await ethers.getContractFactory(
    "contracts/DAOFactory.sol:DAOFactory"
  );

  const implementation = await DAOFactory.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();

  // const implementationAddress = '0x9b541216B78e2dcec4b68919F94368b1edF230bB'

  console.log("DAOFactory implementation deployed to:", implementationAddress);

  // Get initialization data
  const [deployer] = await ethers.getSigners();
  const initData = DAOFactory.interface.encodeFunctionData("initialize", [
    deployer.address,
  ]);

  // Deploy proxy
  const DAOFactoryProxy = await ethers.getContractFactory(
    "contracts/DAOFactoryProxy.sol:DAOFactoryProxy"
  );

  const proxy = await DAOFactoryProxy.deploy(implementationAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  // const proxyAddress = '0x8d2D2fb9388B16a51263593323aBBDf80aee54e6'


  console.log("DAOFactoryProxy deployed to:", proxyAddress);

  // Verify the implementation contract
  console.log("\nVerifying implementation contract...");
  await verify(implementationAddress, []);

  // Verify the proxy contract
  console.log("\nVerifying proxy contract...");
  await verify(
    proxyAddress,
    [implementationAddress, initData],
    "contracts/DAOFactoryProxy.sol:DAOFactoryProxy"
  );

  console.log("\nDeployment completed!");
  console.log("Implementation:", implementationAddress);
  console.log("Proxy:", proxyAddress);

  // Return addresses for use in other scripts
  return {
    implementationAddress,
    proxyAddress,
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
