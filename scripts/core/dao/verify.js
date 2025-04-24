const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main() {
  // Hardcoded variables
  const factoryAddress = "0xCe1368c6b408B23b31D387eb0FB517D4485005E9";
  const daoAddress = "0x3b10b5f28a2c6ca1bD5Aa9bda1bc8726a8D6aC96";
  const tokenAddress = "0x45dC442D161146b6372aBe99875B2262c6D87461";
  const treasuryAddress = "0xc75C1b27510b2b5C6dF59149042bd348a15D103A";
  const stakingAddress = "0x45CF70FAE9c7975931e9FB73B28EaE91833ee9Bd";
  const creator = "0x983332bB0b689Ed97907F658525d19F4D876D96c"; // wallet that called create_dao
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
