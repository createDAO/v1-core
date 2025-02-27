const { ethers } = require("hardhat");
const { verify } = require("../../utils/verification");

async function main(params = {}) {
  const {
    factoryAddress,
    presaleAddress,
    tokenAddress,
    treasuryAddress,
    totalTokens,
    initialPrice
  } = params;

  // Verify all required addresses are provided
  const requiredParams = {
    factoryAddress,
    presaleAddress,
    tokenAddress,
    treasuryAddress,
    totalTokens,
    initialPrice
  };

  for (const [name, value] of Object.entries(requiredParams)) {
    if (!value) {
      console.error(`Missing ${name} parameter`);
      process.exit(1);
    }
  }

  console.log("\nStarting DAOPresale proxy verification...");
  console.log("Presale Address:", presaleAddress);
  console.log("Token Address:", tokenAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("Total Tokens:", totalTokens);
  console.log("Initial Price:", initialPrice);

  // Get the factory contract to get implementation address
  const DAOFactory = await ethers.getContractFactory("DAOFactory");
  const factory = DAOFactory.attach(factoryAddress);
  const latestVersion = await factory.getLatestVersion();
  const presaleImpl = await factory.getModuleImplementation(0, latestVersion); // 0 = Presale

  console.log("\nImplementation address:");
  console.log("- DAOPresale:", presaleImpl);

  // Get interface for selector
  const IDAOPresale = await ethers.getContractAt(
    "contracts/core/interfaces/IDAOPresale.sol:IDAOPresale",
    presaleAddress
  );

  // Verify DAOPresaleProxy
  console.log("\nVerifying DAOPresaleProxy...");
  const presaleInit = IDAOPresale.interface.encodeFunctionData("initialize", [
    tokenAddress,
    treasuryAddress,
    totalTokens,
    initialPrice
  ]);

  await verify(
    presaleAddress,
    [presaleImpl, presaleInit],
    "contracts/DAOPresaleProxy.sol:DAOPresaleProxy"
  );

  console.log("\n✅ DAOPresale proxy verified successfully!");
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
