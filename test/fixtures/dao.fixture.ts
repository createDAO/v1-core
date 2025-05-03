import { ethers } from "hardhat";
import { deployImplementationsFixture } from "./factory.fixture";
import { stakeTokens as utilStakeTokens, MIN_PROPOSAL_STAKE } from "../utils/token.utils";

export async function deployDAOFixture() {
  const { factory, implementations, owner, accounts } = await deployImplementationsFixture();
  
  // Create a new DAO using the factory
  const daoName = "Test DAO";
  const tokenName = "Test Token";
  const tokenSymbol = "TEST";
  const initialSupply = ethers.parseEther("1000000"); // 1M tokens
  
  const tx = await factory.createDAO(
    "1.0.0",
    daoName,
    tokenName,
    tokenSymbol,
    initialSupply
  );
  const receipt = await tx.wait();
  
  // Get deployed addresses from event
  const event = receipt?.logs.find(
    log => {
      try {
        return factory.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "DAOCreated"
      } catch {
        return false;
      }
    }
  );
  
  if (!event) {
    throw new Error("DAOCreated event not found");
  }

  const { daoAddress, tokenAddress, treasuryAddress, stakingAddress } = 
    factory.interface.parseLog({ 
      topics: event.topics as string[], 
      data: event.data 
    })?.args as any;
  
  // Get contract instances
  const dao = await ethers.getContractAt("contracts/DAO.sol:DAO", daoAddress);
  const token = await ethers.getContractAt("contracts/DAOToken.sol:DAOToken", tokenAddress);
  const treasury = await ethers.getContractAt("contracts/DAOTreasury.sol:DAOTreasury", treasuryAddress);
  const staking = await ethers.getContractAt("contracts/DAOStaking.sol:DAOStaking", stakingAddress);
  
  // Helper function to stake tokens that matches our utility function signature
  const stakeTokens = async (account: any, amount: bigint) => {
    await utilStakeTokens(dao, staking, token, account, amount);
  };

  return {
    factory,
    dao,
    token,
    treasury,
    staking,
    owner,
    accounts,
    daoName,
    tokenName,
    tokenSymbol,
    initialSupply,
    stakeTokens
  };
}

export async function deployDAOFixtureWithStakedToken() {
  const fixture = await deployDAOFixture();
  
  // Stake the owner's initial token
  await utilStakeTokens(
    fixture.dao,
    fixture.staking,
    fixture.token,
    fixture.owner,
    MIN_PROPOSAL_STAKE
  );
  
  return fixture;
}
