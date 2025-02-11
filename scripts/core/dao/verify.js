const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main() {
  // Hardcoded variables
  const factoryAddress = "0xb4c290F46025E50DB27280a5AF1D93B3A7a91b61";
  const daoAddress = "0x90BC6DeD2cb342038E9585c30c1Fa6f1d4c24DeD";
  const tokenAddress = "0xf76bD38d04C7760C012d14522beF92839460CA3F";
  const treasuryAddress = "0x983053AF2116F3f27C236ae5E069aF4e1D9E7b4b";
  const stakingAddress = "0x5C25F2D7131855bF5D6d3Da5597326d21aD3bA3e";
  const creator = "0x41bfbe4153F247C8629ab528b41b9Eb011773B2C"; // wallet that called create_dao
  // DAO and Token details
  const name = "Test DAO";
  const tokenName = "Test Token";
  const tokenSymbol = "TEST";
  const initialSupply = "1000000000000000000000000"; // 1 million tokens

  console.log("\nStarting proxy verifications...");

  // Get the factory contract to get implementation addresses
  const DAOFactory = await ethers.getContractFactory("DAOFactory");
  const factory = DAOFactory.attach(factoryAddress);
  const latestVersion = await factory.getLatestVersion();
  const [daoImpl, tokenImpl, treasuryImpl, stakingImpl] =
    await factory.getImplementation(latestVersion);

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
  const DAOToken = await ethers.getContractFactory("DAOToken");
  
  // Encode initialization data using the contract's interface
  const tokenInit = DAOToken.interface.encodeFunctionData("initialize", [
    tokenName,
    tokenSymbol,
    initialSupply,
    creator,         // Creator gets initial tokens
    factoryAddress,  // Factory holds rest temporarily
    factoryAddress   // Factory is initial owner
  ]);

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
}

// Execute verification
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
