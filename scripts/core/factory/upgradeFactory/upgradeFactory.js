const { ethers } = require("hardhat");

async function main() {
  // 1. Deploy new DAOFactory implementation
  const DAOFactory = await ethers.getContractFactory("contracts/factoryV1.0.0/DAOFactory.sol:DAOFactory");
  const newImpl = await DAOFactory.deploy();
  await newImpl.waitForDeployment();
  const newImplementationAddress = await newImpl.getAddress();

  console.log("New DAOFactory implementation deployed at:", newImplementationAddress);

  // 2. Attach to the proxy at the hardcoded address
  const PROXY_ADDRESS = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F"; // <-- Replace with actual proxy address
  const proxy = await ethers.getContractAt("contracts/factoryV1.0.0/DAOFactory.sol:DAOFactory", PROXY_ADDRESS);

  // 3. Fetch FACTORY_VERSION before upgrade
  const versionBefore = await proxy.getFactoryVersion();
  console.log("FACTORY_VERSION before upgrade:", versionBefore);

  // 4. Upgrade the proxy to the new implementation
  // This must be called by the proxy owner
  const tx = await proxy.upgradeToAndCall(newImplementationAddress, '0x');
  await tx.wait();
  console.log("Proxy upgraded to new implementation!");

  // 5. Fetch FACTORY_VERSION after upgrade
  const versionAfter = await proxy.getFactoryVersion();
  console.log("FACTORY_VERSION after upgrade:", versionAfter);

  // 6. Verify that the version changed
  if (versionBefore !== versionAfter) {
    console.log("✅ Upgrade successful: FACTORY_VERSION changed.");
  } else {
    console.error("❌ Upgrade failed: FACTORY_VERSION did not change.");
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
