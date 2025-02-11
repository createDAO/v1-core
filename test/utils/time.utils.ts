import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

export const VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days
export const WEEK = 7 * 24 * 60 * 60;
export const MONTH = 30 * 24 * 60 * 60;
export const THREE_MONTHS = 90 * 24 * 60 * 60;

export async function advanceTime(seconds: number) {
  await time.increase(seconds);
}

export async function advanceToEndOfVotingPeriod() {
  await advanceTime(VOTING_PERIOD);
}
