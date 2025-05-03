const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main(params = {}) {
  // Hardcoded default values
  const defaults = {
    factoryAddress: "0x8d2D2fb9388B16a51263593323aBBDf80aee54e6",
    daoAddress: "0x25718D871117FE677372FdE2282334753Dbd33f0",
    tokenAddress: "0x6D5d3549ad39069B3bF11159c349c56A271C3651",
    treasuryAddress: "0x95541AFc780cEb56bBfb146A30C3Bf52EC7aCA93",
    stakingAddress: "0x6c4722b349E2fDa91CB40Aa25376Abe7b365E91F",
    creator: "0x983332bB0b689Ed97907F658525d19F4D876D96c", // wallet that called create_dao
    name: "Test DAO",
    tokenName: "Test Token",
    tokenSymbol: "TEST",
    initialSupply: "1000000000000000000000000" // 1 million tokens
  };

  // Use provided params or fall back to defaults
  const {
    factoryAddress = defaults.factoryAddress,
    daoAddress = defaults.daoAddress,
    tokenAddress = defaults.tokenAddress,
    treasuryAddress = defaults.treasuryAddress,
    stakingAddress = defaults.stakingAddress,
    creator = defaults.creator,
    name = defaults.name,
    tokenName = defaults.tokenName,
    tokenSymbol = defaults.tokenSymbol,
    initialSupply = defaults.initialSupply
  } = params;

  console.log("\nStarting proxy verifications...");
  console.log("DAO Address:", daoAddress);
  console.log("Token Address:", tokenAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("Staking Address:", stakingAddress);
  console.log("Factory Address:", factoryAddress);
  console.log("Creator Address:", creator);

  // Get the factory contract to get implementation addresses
  const DAOFactory = await ethers.getContractFactory("contracts/DAOFactory.sol:DAOFactory");
  const factory = DAOFactory.attach(factoryAddress);
  const latestVersion = await factory.getLatestVersion();
  const [daoImpl, tokenImpl, treasuryImpl, stakingImpl] =
    await factory.getCoreImplementation(latestVersion);

  console.log("\nImplementation addresses:");
  console.log("- DAO:", daoImpl);
  console.log("- Token:", tokenImpl);
  console.log("- Treasury:", treasuryImpl);
  console.log("- Staking:", stakingImpl);

  // Get interfaces for selectors
  const IDAO = await ethers.getContractAt(
    "contracts/DAOV1Interfaces.sol:IDAO",
    daoAddress
  );
  const IDAOStaking = await ethers.getContractAt(
    "contracts/DAOV1Interfaces.sol:IDAOStaking",
    stakingAddress
  );

  // Verify DAOProxy
  console.log("\nVerifying DAOProxy...");
  const daoInit = IDAO.interface.encodeFunctionData("initialize", [
    name,
    treasuryAddress,
    stakingAddress,
    tokenAddress,
    factoryAddress
  ]);
  await verify(
    daoAddress,
    [daoImpl, daoInit],
    "contracts/DAOProxy.sol:DAOProxy"
  );

  // Verify DAOTokenProxy
  console.log("\nVerifying DAOTokenProxy...");
  console.log("\nToken initialization parameters:");
  console.log("- Name:", tokenName);
  console.log("- Symbol:", tokenSymbol);
  console.log("- Initial Supply:", initialSupply);
  console.log("- Creator:", creator);
  console.log("- Factory:", factoryAddress);

  // Get the token contract interface
  const DAOToken = await ethers.getContractFactory("contracts/DAOToken.sol:DAOToken");
  
  // Encode initialization data using the contract's interface
  const tokenInit = DAOToken.interface.encodeFunctionData("initialize", [
    tokenName,
    tokenSymbol,
    initialSupply,
    creator,         // Creator gets initial tokens
    factoryAddress,  // Factory holds rest temporarily
    factoryAddress   // Factory is initial owner
  ]);
  console.log(tokenInit);
  

  // Verify the token proxy contract
  await verify(
    tokenAddress,
    [tokenImpl, tokenInit],
    "contracts/DAOTokenProxy.sol:DAOTokenProxy"
  );

  // Verify DAOTreasuryProxy
  console.log("\nVerifying DAOTreasuryProxy...");
  const treasuryInit = "0x"; // Must be "0x" for empty bytes, not empty string

  await verify(
    treasuryAddress,
    [treasuryImpl, treasuryInit],
    "contracts/DAOTreasuryProxy.sol:DAOTreasuryProxy"
  );

  // Verify DAOStakingProxy
  console.log("\nVerifying DAOStakingProxy...");
  const stakingInit = IDAOStaking.interface.encodeFunctionData("initialize", [
    tokenAddress
  ]);
  await verify(
    stakingAddress,
    [stakingImpl, stakingInit],
    "contracts/DAOStakingProxy.sol:DAOStakingProxy"
  );

  console.log("\n✅ All proxy contracts verified successfully!");
  
  // Return verification results
  return {
    daoAddress,
    tokenAddress,
    treasuryAddress,
    stakingAddress,
    verified: true
  };
}

// Execute verification if script is run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
