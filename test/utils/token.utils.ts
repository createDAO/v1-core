import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DAO, DAOToken } from "../../typechain-types";
import { advanceToEndOfVotingPeriod } from "./time.utils";

export async function transferTokensFromTreasury(
  dao: DAO,
  token: DAOToken,
  recipient: HardhatEthersSigner,
  amount: bigint
) {
  // Create proposal and get its ID
  const tx = await dao.proposeTransfer(
    await token.getAddress(),
    await recipient.getAddress(),
    amount
  );
  const receipt = await tx.wait();
  // Get proposal ID from event
  const event = receipt?.logs.find(
    (log) =>
      dao.interface.parseLog({ topics: log.topics as string[], data: log.data })
        ?.name === "ProposalCreated"
  );
  const proposalId = event
    ? dao.interface.parseLog({ topics: event.topics, data: event.data })?.args
        ?.proposalId
    : 0;

  await dao.vote(proposalId, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(proposalId);
  return proposalId; // Return the proposal ID for reference
}

export async function approveAndStake(
  token: DAOToken,
  staking: any,
  owner: HardhatEthersSigner,
  amount: bigint
) {
  await token.approve(await staking.getAddress(), amount);
  await staking.stake(amount);
}

export const DEFAULT_TOKEN_AMOUNT = ethers.parseEther("100");
export const MIN_PROPOSAL_STAKE = ethers.parseEther("1");

export async function stakeTokens(
  dao: DAO,
  staking: any,
  token: DAOToken,
  owner: HardhatEthersSigner,
  amount: bigint
) {
  await token.connect(owner).approve(await staking.getAddress(), amount);
  await staking.connect(owner).stake(amount);
}
