const { run, network } = require("hardhat");

// Helper function to wait for a specified time
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const verify = async (contractAddress, args, contract) => {
  // Only verify on networks other than hardhat and localhost
  if (network.name === "hardhat" || network.name === "localhost") {
    return;
  }

  console.log("\nStarting verification process...");
  
  // Retry verification with exponential backoff
  const maxRetries = 5;
  const initialDelay = 10000; // 30 seconds
  
  for (let i = 0; i < maxRetries; i++) {
    const waitTime = initialDelay * Math.pow(2, i); // Exponential backoff
    console.log(`\nAttempt ${i + 1}/${maxRetries}: Waiting ${waitTime/1000} seconds before verification...`);
    await delay(waitTime);
    
    console.log("Attempting verification...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
        contract: contract
      });
      console.log("Verification successful!");
      return; // Exit on successful verification
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log("Contract already verified!");
        return;
      }
      
      // Log the full error for debugging
      console.log("\nVerification attempt failed with error:");
      console.log(e);
      
      if (i === maxRetries - 1) {
        console.log("\nMax retries reached. Verification failed.");
      } else {
        console.log("\nVerification failed, will retry after delay...");
      }
    }
  }
};

module.exports = { verify };
