const { ethers } = require("hardhat");

const VERSION = "1.0.0"; // Must match FACTORY_VERSION in DAOFactory.sol

async function main(params = {}) {
  const {
    FACTORY_PROXY_ADDRESS,
    PRESALE_IMPL_ADDRESS,
  } = params;

  // Verify all addresses are provided
  const addresses = {
    factory: FACTORY_PROXY_ADDRESS,
    presale: PRESALE_IMPL_ADDRESS,
  };

  for (const [name, address] of Object.entries(addresses)) {
    if (!address) {
      console.error(`Missing ${name.toUpperCase()}_ADDRESS parameter`);
      process.exit(1);
    }
  }

  console.log("Starting DAOPresale module registration...");
  console.log("Factory proxy address:", FACTORY_PROXY_ADDRESS);
  console.log("DAOPresale implementation:", PRESALE_IMPL_ADDRESS);
  console.log("Version to register:", VERSION);

  // Get the factory contract
  const DAOFactory = await ethers.getContractFactory("contracts/DAOFactory.sol:DAOFactory");
  const factory = DAOFactory.attach(FACTORY_PROXY_ADDRESS);

  // Register the DAOPresale module implementation
  // ModuleType.Presale = 0 (from IDAOModule.sol)
  console.log("\nRegistering DAOPresale module implementation...");
  const tx = await factory.registerModuleImplementation(
    0, // ModuleType.Presale
    VERSION,
    PRESALE_IMPL_ADDRESS
  );
  await tx.wait();

  console.log("\nDAOPresale module registered successfully!");
  console.log("Version:", VERSION);

  // Verify setup through proxy
  console.log("\nVerifying setup through proxy...");

  // Get module implementation for this version
  const presaleImpl = await factory.getModuleImplementation(0, VERSION); // 0 = Presale

  console.log("\nRegistered module implementation:");
  console.log("- DAOPresale:", presaleImpl);

  // Verify address matches
  const implementationMatches = presaleImpl.toLowerCase() === PRESALE_IMPL_ADDRESS.toLowerCase();

  if (implementationMatches) {
    console.log("\n✅ Verification successful!");
    console.log("- Module implementation address matches");
  } else {
    console.log("\n❌ Verification failed!");
    console.log("Implementation address mismatch!");
    console.log("Expected:", PRESALE_IMPL_ADDRESS);
    console.log("Got:", presaleImpl);
    process.exit(1);
  }

  return true;
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
