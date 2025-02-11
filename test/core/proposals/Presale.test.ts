import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAO Presale Proposals", function () {
  async function registerPresaleImplementation() {
    const { factory } = await loadFixture(deployDAOFixture);

    // Deploy new implementations to keep version consistent
    const daoImpl = await ethers.deployContract("DAO");
    const tokenImpl = await ethers.deployContract("DAOToken");
    const treasuryImpl = await ethers.deployContract("DAOTreasury");
    const stakingImpl = await ethers.deployContract("DAOStaking");
    const presaleImpl = await ethers.deployContract("DAOPresale");

    await Promise.all([
      daoImpl.waitForDeployment(),
      tokenImpl.waitForDeployment(),
      treasuryImpl.waitForDeployment(),
      stakingImpl.waitForDeployment(),
      presaleImpl.waitForDeployment(),
    ]);

    // Register new version with presale implementation
    await factory.registerImplementation(
      "latest",
      await daoImpl.getAddress(),
      await tokenImpl.getAddress(),
      await treasuryImpl.getAddress(),
      await stakingImpl.getAddress(),
      await presaleImpl.getAddress(),
      "0x" // Empty initialization template
    );

    return presaleImpl;
  }

  it("Should create presale with correct parameters", async function () {
    const { dao, staking, token, treasury, owner } = await loadFixture(
      deployDAOFixture
    );
    await registerPresaleImplementation();

    await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

    // Need enough votes to meet quorum (10%)
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

    // Now propose and execute presale
    await token.approve(await staking.getAddress(), neededVotes);
    await staking.stake(neededVotes);

    const presaleAmount = ethers.parseEther("100000");
    const initialPrice = ethers.parseEther("0.001"); // 0.001 ETH per token

    await dao.proposePresale(presaleAmount, initialPrice);

    await dao.vote(1, true);
    await advanceToEndOfVotingPeriod();
    await dao.execute(1);

    const presaleAddress = await dao.getPresaleContract(1);
    const presale = await ethers.getContractAt("DAOPresale", presaleAddress);

    const presaleData = await dao.getPresaleData(1);
    expect(presaleData.amount).to.equal(presaleAmount);
    expect(presaleData.initialPrice).to.equal(initialPrice);
  });

  it("Should transfer correct token amount to presale", async function () {
    const { dao, staking, token, treasury, owner } = await loadFixture(
      deployDAOFixture
    );
    await registerPresaleImplementation();

    await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

    // Need enough votes to meet quorum (10%)
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

    // Now propose and execute presale
    await token.approve(await staking.getAddress(), neededVotes);
    await staking.stake(neededVotes);

    const presaleAmount = ethers.parseEther("100000");
    await dao.proposePresale(
      presaleAmount,
      ethers.parseEther("0.001")
    );

    await dao.vote(1, true);
    await advanceToEndOfVotingPeriod();
    await dao.execute(1);

    const presaleAddress = await dao.getPresaleContract(1);
    expect(await token.balanceOf(presaleAddress)).to.equal(presaleAmount);
  });

  it("Should revert if presale amount exceeds treasury balance", async function () {
    const { dao, staking, token, treasury, owner } = await loadFixture(
      deployDAOFixture
    );
    await registerPresaleImplementation();

    await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

    // Need enough votes to meet quorum (10%)
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

    // Now propose and execute presale
    await token.approve(await staking.getAddress(), neededVotes);
    await staking.stake(neededVotes);

    const tooMuch = ethers.parseEther("2000000"); // More than initial supply
    await dao.proposePresale(
      tooMuch,
      ethers.parseEther("0.001")
    );

    await dao.vote(1, true);
    await advanceToEndOfVotingPeriod();

    await expect(dao.execute(1)).to.be.revertedWithCustomError(
      token,
      "ERC20InsufficientBalance"
    );
  });

  it("Should revert if initial price is zero", async function () {
    const { dao, owner, staking, token } = await loadFixture(deployDAOFixture);

    await stakeTokens(dao, staking, token, owner, ethers.parseEther("1"));

    await expect(
      dao.proposePresale(
        ethers.parseEther("100000"),
        0
      )
    ).to.be.revertedWith("Zero initial price");
  });
});
