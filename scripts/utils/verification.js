const { run, network, config } = require("hardhat");

// Helper function to wait for a specified time
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const verify = async (contractAddress, args, contract) => {
  // Only verify on networks other than hardhat and localhost
  if (network.name === "hardhat" || network.name === "localhost") {
    return;
  }
  console.log("\nStarting verification process...");

  await verifyWithEtherscan(contractAddress, args, contract);

  const sourcifyEnabled = config.sourcify && config.sourcify.enabled;

  if (sourcifyEnabled) {

    await verifyWithSourcify(contractAddress, args, contract);

  }
};

const verifyWithEtherscan = async (contractAddress, args, contract) => {
  const maxRetries = 5;
  const initialDelay = 10000;

  console.log("\nStarting Etherscan verification...");

  for (let i = 0; i < maxRetries; i++) {
    const waitTime = initialDelay * Math.pow(2, i);
    console.log(
      `\nEtherscan attempt ${i + 1}/${maxRetries}: Waiting ${
        waitTime / 1000
      } seconds before verification...`
    );
    await delay(waitTime);

    console.log("Attempting Etherscan verification...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
        contract: contract,
        force: true

      });
      console.log("Etherscan verification successful!");
      return;
    } catch (e) {
      if (e.message.toLowerCase().includes("already been verified")) {
        console.log("Contract already verified on Etherscan!");
        return;
      }

      console.log("\nEtherscan verification attempt failed with error:");
      console.log(e);

      if (i === maxRetries - 1) {
        console.log("\nMax retries reached. Etherscan verification failed.");
      } else {
        console.log(
          "\nEtherscan verification failed, will retry after delay..."
        );
      }
    }
  }
};

const verifyWithSourcify = async (contractAddress, args, contract) => {
  const maxRetries = 3;
  const initialDelay = 5000;

  console.log("\nStarting Sourcify verification...");

  for (let i = 0; i < maxRetries; i++) {
    const waitTime = initialDelay * Math.pow(2, i);
    console.log(
      `\nSourcify attempt ${i + 1}/${maxRetries}: Waiting ${
        waitTime / 1000
      } seconds before verification...`
    );
    await delay(waitTime);

    console.log("Attempting Sourcify verification...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
        verificationProvider: "sourcify",
        contract: contract,
        force: true

      });
      console.log("Sourcify verification successful!");
      return;
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log("Contract already verified on Sourcify!");
        return;
      }

      console.log("\nSourcify verification attempt failed with error:");
      console.log(e);

      if (i === maxRetries - 1) {
        console.log("\nMax retries reached. Sourcify verification failed.");
      } else {
        console.log(
          "\nSourcify verification failed, will retry after delay..."
        );
      }
    }
  }
};

module.exports = { verify };
