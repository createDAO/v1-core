const { ethers } = require("hardhat");

const VERSION = "1.0.0"; // Must match FACTORY_VERSION in DAOFactory.sol

async function main(params = {}) {
  const {
    FACTORY_PROXY_ADDRESS,
    DAO_IMPL_ADDRESS,
    TOKEN_IMPL_ADDRESS,
    TREASURY_IMPL_ADDRESS,
    STAKING_IMPL_ADDRESS,
    PRESALE_IMPL_ADDRESS,
  } = params;

  // const FACTORY_PROXY_ADDRESS = "0x6Cf2fCbC483578ee80e3B8802780C20f461DCcFe";
  // const DAO_IMPL_ADDRESS = "0x50B4C26572E4364533A07D06BD53cFB9ea4C08fc";
  // const TOKEN_IMPL_ADDRESS = "0xabF664d55aAB01C368acaCcd9647639dcbBB76f1";
  // const TREASURY_IMPL_ADDRESS = "0xfCc8C70eaDc509672F2591fb45B57CCECBCB0b22";
  // const STAKING_IMPL_ADDRESS = "0x630fDB745c5341004E4b9bA745D16BB355C02533";

  // Verify all addresses are provided
  const addresses = {
    factory: FACTORY_PROXY_ADDRESS,
    dao: DAO_IMPL_ADDRESS,
    token: TOKEN_IMPL_ADDRESS,
    treasury: TREASURY_IMPL_ADDRESS,
    staking: STAKING_IMPL_ADDRESS,
    presale: PRESALE_IMPL_ADDRESS,
  };

  for (const [name, address] of Object.entries(addresses)) {
    if (!address) {
      console.error(`Missing ${name.toUpperCase()}_ADDRESS parameter`);
      process.exit(1);
    }
  }

  console.log("Starting implementation registration...");
  console.log("Factory proxy address:", FACTORY_PROXY_ADDRESS);
  console.log("DAO implementation:", DAO_IMPL_ADDRESS);
  console.log("Token implementation:", TOKEN_IMPL_ADDRESS);
  console.log("Treasury implementation:", TREASURY_IMPL_ADDRESS);
  console.log("Staking implementation:", STAKING_IMPL_ADDRESS);
  console.log("Presale implementation:", PRESALE_IMPL_ADDRESS);
  console.log("Version to register:", VERSION);

  // // Get the factory contract
  const DAOFactory = await ethers.getContractFactory("DAOFactory");
  const factory = DAOFactory.attach(FACTORY_PROXY_ADDRESS);

  // // Create initialization template (empty for now as it's optional)
  const initTemplate = "0x";

  // Register the implementations
  console.log("\nRegistering implementations...");
  const tx = await factory.registerImplementation(
    VERSION,
    DAO_IMPL_ADDRESS,
    TOKEN_IMPL_ADDRESS,
    TREASURY_IMPL_ADDRESS,
    STAKING_IMPL_ADDRESS,
    PRESALE_IMPL_ADDRESS,
    initTemplate
  );
  await tx.wait();

  console.log("\nImplementations registered successfully!");
  console.log("Version:", VERSION);

  // // Verify setup through proxy
  console.log("\nVerifying setup through proxy...");

  // // Get latest version
  const latestVersion = await factory.getLatestVersion();
  console.log("Latest version from proxy:", latestVersion);

  // Get implementations for this version
  const [daoImpl, tokenImpl, treasuryImpl, stakingImpl, presaleImpl] =
    await factory.getImplementation(latestVersion);

  console.log("\nRegistered implementations:");
  console.log("- DAO:", daoImpl);
  console.log("- Token:", tokenImpl);
  console.log("- Treasury:", treasuryImpl);
  console.log("- Staking:", stakingImpl);
  console.log("- Presale:", presaleImpl);

  // Verify all addresses match
  const implementationsMatch =
    daoImpl.toLowerCase() === DAO_IMPL_ADDRESS.toLowerCase() &&
    tokenImpl.toLowerCase() === TOKEN_IMPL_ADDRESS.toLowerCase() &&
    treasuryImpl.toLowerCase() === TREASURY_IMPL_ADDRESS.toLowerCase() &&
    stakingImpl.toLowerCase() === STAKING_IMPL_ADDRESS.toLowerCase() &&
    presaleImpl.toLowerCase() === PRESALE_IMPL_ADDRESS.toLowerCase();

  if (implementationsMatch && latestVersion === VERSION) {
    console.log("\n✅ Verification successful!");
    console.log("- Version matches:", latestVersion === VERSION);
    console.log("- All implementation addresses match");
    console.log(
      "\nUsers can now create DAOs using the factory at:",
      FACTORY_PROXY_ADDRESS
    );
  } else {
    console.log("\n❌ Verification failed!");
    if (latestVersion !== VERSION) {
      console.log("Version mismatch:");
      console.log("Expected:", VERSION);
      console.log("Got:", latestVersion);
    }
    if (!implementationsMatch) {
      console.log("Implementation address mismatch!");
      console.log("Check the addresses above against the expected addresses.");
    }
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
