const { run, ethers } = require("hardhat");

async function main() {
  // Hardcoded variables
  const presaleAddress = "0xe5d575cd4123357b5306d938b726a8046db0c05f"; // Deployed proxy address
  const presaleImpl = "0x432B3C0e4dD5e58394D21f538D58531E7A20B930"; // Implementation address
  const tokenAddress = "0xD304727Af83478800206132f47cc0A4B8600FC9F"; // Token address
  const treasuryAddress = "0x2db0e933916587689684d6378d5C0D0beb403152"; // Treasury address
  const totalTokens = "50000000000000000000000"; // Total tokens (in wei)
  const initialPrice = "10000000000000"; // Initial price (in wei)

  console.log("\nStarting DAOPresaleProxy verification (final method)...");

  // Get the interface for the DAOPresale contract
  const IDAOPresale = await ethers.getContractAt(
    "contracts/core/interfaces/IDAOPresale.sol:IDAOPresale",
    presaleAddress
  );

  // Encode initialization data using the contract's interface
  const initData = IDAOPresale.interface.encodeFunctionData("initialize", [
    tokenAddress,
    treasuryAddress,
    totalTokens,
    initialPrice,
  ]);

  console.log("Encoded initialization data:", initData);

  try {
    // Use the raw verify:verify command directly
    await run("verify:verify", {
      address: presaleAddress,
      constructorArguments: [presaleImpl, initData],
      contract: "contracts/DAOPresaleProxy.sol:DAOPresaleProxy",
    });
    console.log("\n✅ DAOPresaleProxy verified successfully!");
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.error("Verification failed:", e);
    }
  }
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
