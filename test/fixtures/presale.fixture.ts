import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { deployDAOFixture } from "./dao.fixture";
import { stakeTokens } from "../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../utils/time.utils";

export async function deployPresaleFixture() {
  const daoFixture = await loadFixture(deployDAOFixture);
  const { dao, staking, token, treasury, owner } = daoFixture;

  // Deploy and register presale implementation
  const presaleImpl = await ethers.deployContract("DAOPresale");
  await presaleImpl.waitForDeployment();

  // Register presale as a module implementation
  await daoFixture.factory.registerModuleImplementation(
    0, // ModuleType.Presale = 0
    "1.0.0", // Use proper version
    await presaleImpl.getAddress()
  );

  // Setup voting power
  await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));
  const totalStaked = await staking.totalStaked();
  const neededVotes = (totalStaked * 1000n) / 10000n + 1n; // 10% + 1

  // Get enough tokens to meet quorum
  await dao.proposeTransfer(
    await token.getAddress(),
    await owner.getAddress(),
    neededVotes
  );
  await dao.vote(0, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(0);

  // Stake tokens for presale proposal
  await token.approve(await staking.getAddress(), neededVotes);
  await staking.stake(neededVotes);

  // Create presale
  const presaleAmount = ethers.parseEther("100000");
  const initialPrice = ethers.parseEther("0.001"); // 0.001 ETH per token

  await dao.proposePresale(presaleAmount, initialPrice);
  await dao.vote(1, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(1);

  const presaleAddress = await dao.getPresaleContract(1);
  const presale = await ethers.getContractAt("DAOPresale", presaleAddress);
  const tokensPerTier = await presale.tokensPerTier();

  return {
    ...daoFixture,
    presale,
    presaleAmount,
    initialPrice,
    tokensPerTier
  };
}
