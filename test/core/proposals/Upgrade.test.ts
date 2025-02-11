import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import {
  deployDAOFixture,
  deployDAOFixtureWithStakedToken,
} from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";
import {
  MIN_PROPOSAL_STAKE,
  stakeTokens,
  transferTokensFromTreasury,
} from "../../utils/token.utils";

describe("DAO Upgrade Proposals", function () {
  it("Should upgrade DAO implementation", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );
    // spend 12 hours to fix the logic in the contract. Now even Vitalik can't upgrade thoose contracts without proposals in DAO.
    // console.log("Factory Implementations:", await factory.getImplementation('1.0.0'));
    // console.log("Factory Address:", await factory.getAddress());
    // console.log("DAO Owner:", await dao.owner(););
    // console.log("Owner wallet:", owner.address);
    // console.log("DAO address:", await dao.getAddress());

    // Deploy new V2 implementation
    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    // Register new version
    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x" // Empty initialization data
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);

    // Propose upgrade
    await dao.proposeUpgrade(
      0, // DAO is index 0
      "2.0.0"
    );

    await dao.vote(0, true);
    await advanceToEndOfVotingPeriod();
    await dao.execute(0);

    // Verify upgrade
    expect(await dao.version()).to.equal("2.0.0");
  });

  it("Should maintain state after upgrade", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );

    // Create a proposal before upgrade
    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);
    await dao.proposeTransfer(
      await token.getAddress(),
      await owner.getAddress(),
      ethers.parseEther("100")
    );

    // Deploy new V2 implementation
    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    // Register new version
    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x" // Empty initialization data
    );

    // Propose and execute upgrade
    await dao.proposeUpgrade(0, "2.0.0");
    await dao.vote(1, true);
    await advanceToEndOfVotingPeriod();
    await dao.execute(1);

    // Verify old proposal still exists
    const proposal = await dao.getTransferData(0);
    expect(proposal[2]).to.equal(ethers.parseEther("100"));
  });

  it("Should upgrade token implementation", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );

    // Deploy new V2 implementation
    const TokenV2Factory = await ethers.getContractFactory("DAOTokenV2");
    const newImplementation = await TokenV2Factory.deploy();

    // Register new version
    await factory.registerImplementation(
      "2.0.0",
      await dao.getAddress(),
      await newImplementation.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x" // Empty initialization data
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);

    // Propose upgrade
    await dao.proposeUpgrade(
      1, // Token is index 1
      "2.0.0"
    );

    await dao.vote(0, true);
    await advanceToEndOfVotingPeriod();
    await dao.execute(0);

    // Verify upgrade
    expect(await token.version()).to.equal("2.0.0");
  });

  it("Should upgrade staking implementation", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );

    // Deploy new V2 implementation
    const StakingV2Factory = await ethers.getContractFactory("DAOStakingV2");
    const newImplementation = await StakingV2Factory.deploy();

    // Register new version
    await factory.registerImplementation(
      "2.0.0",
      await dao.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await newImplementation.getAddress(),
      await staking.getAddress(),
      "0x" // Empty initialization data
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);

    // Propose upgrade
    await dao.proposeUpgrade(
      3, // Staking is index 3
      "2.0.0"
    );

    await dao.vote(0, true);
    await advanceToEndOfVotingPeriod();
    await dao.execute(0);

    // Verify upgrade
    expect(await staking.version()).to.equal("2.0.0");
  });

  it("Should revert upgrade with invalid version", async function () {
    const { dao, owner, staking, token, treasury } = await loadFixture(
      deployDAOFixture
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);

    await expect(
      dao.proposeUpgrade(
        0,
        "3.0.0" // Non-existent version
      )
    ).to.be.revertedWith("Invalid version");
  });

  it("Should revert upgrade with invalid contract type", async function () {
    const { dao, owner, staking, token, treasury } = await loadFixture(
      deployDAOFixture
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);

    await expect(
      dao.proposeUpgrade(
        99, // Invalid contract type
        "1.0.0"
      )
    ).to.be.reverted;
  });

  it("Should prevent direct upgradeToAndCall without proposal", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );

    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    // Try to call upgradeToAndCall directly
    await expect(
      dao.upgradeToAndCall(await newImplementation.getAddress(), "0x")
    ).to.be.revertedWithCustomError(dao, "OwnableUnauthorizedAccount");
  });

  it("Should prevent upgrade from non-owner without proposal", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );
    const [, otherAccount] = await ethers.getSigners();

    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x"
    );
    await token.transfer(otherAccount.address, MIN_PROPOSAL_STAKE);
    await stakeTokens(dao, staking, token, otherAccount, MIN_PROPOSAL_STAKE);

    // Try to propose upgrade from non-owner account
    await expect(dao.connect(otherAccount).proposeUpgrade(0, "2.0.0")).to.not.be
      .reverted; // Should be allowed as they have enough stake

    // But direct upgrade should fail
    await expect(
      dao
        .connect(otherAccount)
        .upgradeToAndCall(await newImplementation.getAddress(), "0x")
    ).to.be.reverted;
  });

  it("Should revert executing upgrade proposal before voting period ends", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );

    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x"
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);
    await dao.proposeUpgrade(0, "2.0.0");
    await dao.vote(0, true);

    // Try to execute before voting period ends
    await expect(dao.execute(0)).to.be.revertedWith("Voting ongoing");
  });

  it("Should revert upgrade with insufficient quorum", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixtureWithStakedToken
    );
    const [, largeStaker, mediumStaker, smallStaker] =
      await ethers.getSigners();

    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x"
    );

    await transferTokensFromTreasury(
      dao,
      token,
      largeStaker,
      ethers.parseEther("100000")
    );
    await transferTokensFromTreasury(
      dao,
      token,
      mediumStaker,
      ethers.parseEther("50000")
    );
    await transferTokensFromTreasury(
      dao,
      token,
      smallStaker,
      ethers.parseEther("10000")
    );
    await stakeTokens(
      dao,
      staking,
      token,
      smallStaker,
      ethers.parseEther("10000")
    );
    await stakeTokens(
      dao,
      staking,
      token,
      largeStaker,
      ethers.parseEther("100000")
    );
    await stakeTokens(
      dao,
      staking,
      token,
      mediumStaker,
      ethers.parseEther("50000")
    );

    await dao.proposeUpgrade(0, "2.0.0");
    await dao.vote(3, true);
    await advanceToEndOfVotingPeriod();

    // Should fail due to insufficient quorum
    await expect(dao.execute(3)).to.be.revertedWith("Quorum not reached");
  });

  it("Should prevent executing the same proposal twice", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );

    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x"
    );

    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);
    await dao.proposeUpgrade(0, "2.0.0");
    await dao.vote(0, true);
    await advanceToEndOfVotingPeriod();

    // First execution should succeed
    await dao.execute(0);

    // Second execution should fail
    await expect(dao.execute(0)).to.be.revertedWith("Already executed");
  });

  it("Should revert upgrade with more against votes than for votes", async function () {
    const { dao, owner, staking, token, treasury, factory } = await loadFixture(
      deployDAOFixture
    );
    const [, voter1, voter2] = await ethers.getSigners();

    const DAOV2Factory = await ethers.getContractFactory("DAOV2");
    const newImplementation = await DAOV2Factory.deploy();

    await factory.registerImplementation(
      "2.0.0",
      await newImplementation.getAddress(),
      await token.getAddress(),
      await treasury.getAddress(),
      await staking.getAddress(),
      await staking.getAddress(),
      "0x"
    );

    // Give voting power to multiple accounts
    await stakeTokens(dao, staking, token, owner, MIN_PROPOSAL_STAKE);
    await transferTokensFromTreasury(dao, token, voter1, ethers.parseEther("2"));
    await stakeTokens(dao, staking, token, voter1,  ethers.parseEther("2"));

    await dao.proposeUpgrade(1, "2.0.0");
    await dao.vote(1, true); // 1 vote for
    await dao.connect(voter1).vote(1, false); // 2 votes against

    await advanceToEndOfVotingPeriod();

    // Should fail due to more against votes
    await expect(dao.execute(1)).to.be.revertedWith("Proposal rejected");
  });
});
