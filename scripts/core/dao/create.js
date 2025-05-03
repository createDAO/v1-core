const { ethers } = require("hardhat");
const { validateDAOSetup } = require("../../utils/validation");

const VERSION = "1.0.0"; // Must match registered version

async function main(params = {}) {
  const {
    factoryAddress = '0xb4c290F46025E50DB27280a5AF1D93B3A7a91b61',
    name = "Test DAO",
    tokenName = "Test Token",
    tokenSymbol = "TEST",
    initialSupply = ethers.parseEther("1000000") // 1 million tokens
  } = params;

  if (!factoryAddress) {
    console.error("Missing factoryAddress parameter");
    process.exit(1);
  }

  // Get the factory contract
  const DAOFactory = await ethers.getContractFactory("contracts/DAOFactory.sol:DAOFactory");
  const factory = DAOFactory.attach(factoryAddress);
  const latestVersion = await factory.getLatestVersion();
  console.log("Latest version from proxy:", latestVersion);
  const [daoImpl, tokenImpl, treasuryImpl, stakingImpl] = await factory.getCoreImplementation(latestVersion);
  
  console.log("\nRegistered implementations:");
  console.log("- DAO:", daoImpl);
  console.log("- Token:", tokenImpl);
  console.log("- Treasury:", treasuryImpl);
  console.log("- Staking:", stakingImpl);

  console.log("Creating new DAO...");
  console.log("Name:", name);
  console.log("Token Name:", tokenName);
  console.log("Token Symbol:", tokenSymbol);
  console.log("Initial Supply:", initialSupply.toString());
  console.log("Version:", VERSION);

  // Create the DAO
  console.log("\nCalling createDAO...");
  const tx = await factory.createDAO(
    VERSION,
    name,
    tokenName,
    tokenSymbol,
    initialSupply
  );
  
  console.log("Waiting for transaction...");
  const receipt = await tx.wait();

  // Find the DAOCreated event
  const event = receipt.logs.find(
    log => {
      try {
        return factory.interface.parseLog({ topics: log.topics, data: log.data }).name === "DAOCreated"
      } catch {
        return false;
      }
    }
  );

  if (!event) {
    throw new Error("DAOCreated event not found in transaction logs");
  }

  // Parse the event data
  const { 
    daoAddress, 
    tokenAddress, 
    treasuryAddress, 
    stakingAddress,
    versionId
  } = factory.interface.parseLog({ topics: event.topics, data: event.data }).args;

  console.log("\nDAO created successfully!");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("Staking Address:", stakingAddress);

  // Validate everything is set up correctly
  await validateDAOSetup({
    factory,
    factoryAddress,
    daoAddress,
    tokenAddress,
    treasuryAddress,
    stakingAddress,
    config: {
      name,
      tokenName,
      tokenSymbol
    }
  });

  console.log("\n✅ All verifications passed! DAO is ready to use.");
  console.log("\nDAO Contracts:");
  console.log("- DAO:", daoAddress);
  console.log("- Token:", tokenAddress);
  console.log("- Treasury:", treasuryAddress);
  console.log("- Staking:", stakingAddress);

  return {
    daoAddress,
    tokenAddress,
    treasuryAddress,
    stakingAddress
  };
}

// Run directly or export for use in other scripts
if (require.main === module) {
  main({
    factoryAddress: process.env.FACTORY_ADDRESS,
    name: process.env.DAO_NAME,
    tokenName: process.env.TOKEN_NAME,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    initialSupply: process.env.INITIAL_SUPPLY ? ethers.parseEther(process.env.INITIAL_SUPPLY) : undefined
  })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
