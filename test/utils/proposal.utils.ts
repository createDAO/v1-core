import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DAO } from "../../typechain-types";
import { advanceToEndOfVotingPeriod } from "./time.utils";
import { expect } from "chai";

export enum ProposalType {
  Transfer,
  Upgrade,
  Presale,
  PresalePause,
  PresaleWithdraw,
  Pause,
  Unpause
}

export enum UpgradeableContract {
  DAO,
  Token,
  Treasury,
  Staking,
  Presale
}

export async function createAndExecuteProposal(
  dao: DAO,
  proposalType: ProposalType,
  params: {
    token?: string,
    recipient?: string,
    amount?: bigint,
    contractType?: UpgradeableContract,
    newVersion?: string,
    initialPrice?: bigint,
    presaleContract?: string,
    pause?: boolean
  }
) {
  switch (proposalType) {
    case ProposalType.Transfer:
      await dao.proposeTransfer(
        params.token!,
        params.recipient!,
        params.amount!
      );
      break;
    case ProposalType.Upgrade:
      await dao.proposeUpgrade(
        params.contractType!,
        params.newVersion!
      );
      break;
    case ProposalType.Presale:
      await dao.proposePresale(
        params.amount!,
        params.initialPrice!
      );
      break;
    case ProposalType.PresalePause:
      await dao.proposePresalePause(
        params.presaleContract!,
        params.pause!
      );
      break;
    case ProposalType.PresaleWithdraw:
      await dao.proposePresaleWithdraw(
        params.presaleContract!
      );
      break;
    case ProposalType.Pause:
      await dao.proposePause();
      break;
    case ProposalType.Unpause:
      await dao.proposeUnpause();
      break;
  }

  await dao.vote(0, true);
  await advanceToEndOfVotingPeriod();
  await dao.execute(0);
}

export async function voteAndExecute(
  dao: DAO,
  proposalId: number,
  support: boolean
) {
  await dao.vote(proposalId, support);
  await advanceToEndOfVotingPeriod();
  await dao.execute(proposalId);
}

export async function expectProposalRevert(
  dao: DAO,
  proposalId: number,
  errorMessage: string
) {
  await dao.vote(proposalId, true);
  await advanceToEndOfVotingPeriod();
  
  // Handle custom errors
  if (errorMessage === "Insufficient balance") {
    await expect(dao.execute(proposalId))
      .to.be.revertedWithCustomError(dao, "ERC20InsufficientBalance");
  } else if (errorMessage === "Quorum not reached") {
    await expect(dao.execute(proposalId))
      .to.be.revertedWith("Quorum not reached");
  } else if (errorMessage === "Invalid contract type") {
    await expect(dao.execute(proposalId))
      .to.be.revertedWith("Invalid contract type");
  } else {
    await expect(dao.execute(proposalId))
      .to.be.revertedWith(errorMessage);
  }
}
