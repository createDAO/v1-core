import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployPresaleFixture } from "../../fixtures/presale.fixture";
import { ethers } from "hardhat";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAOPresale Admin Functions", function () {
    describe("Presale Control Through DAO", function () {
        it("Should pause presale through DAO proposal", async function () {
            const { dao, presale } = await loadFixture(deployPresaleFixture);
            const presaleAddress = await presale.getAddress();

            // Create pause proposal
            await dao.proposePresalePause(presaleAddress, true);
            await dao.vote(2, true); // proposalId 2 since we already have 2 proposals in fixture
            await advanceToEndOfVotingPeriod();
            await dao.execute(2);

            expect(await presale.paused()).to.be.true;

            // Verify buying is prevented
            const deadline = (await time.latest()) + 3600;
            await expect(
                presale.buy(0, deadline, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Presale is paused");
        });

        it("Should unpause presale through DAO proposal", async function () {
            const { dao, presale } = await loadFixture(deployPresaleFixture);
            const presaleAddress = await presale.getAddress();

            // First pause
            await dao.proposePresalePause(presaleAddress, true);
            await dao.vote(2, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(2);

            // Then unpause through proposal
            await dao.proposePresalePause(presaleAddress, false);
            await dao.vote(3, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(3);

            expect(await presale.paused()).to.be.false;
        });

        it("Should withdraw to treasury through DAO proposal", async function () {
            const { dao, presale, treasury } = await loadFixture(deployPresaleFixture);
            const presaleAddress = await presale.getAddress();
            const deadline = (await time.latest()) + 3600;

            // First buy some tokens to get ETH in the contract
            await presale.buy(0, deadline, { value: ethers.parseEther("1") });

            const treasuryBalanceBefore = await ethers.provider.getBalance(await treasury.getAddress());

            // Create withdraw proposal
            await dao.proposePresaleWithdraw(presaleAddress);
            await dao.vote(2, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(2);

            const treasuryBalanceAfter = await ethers.provider.getBalance(await treasury.getAddress());
            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(ethers.parseEther("1"));
        });

        

        it("Should prevent direct calls to admin functions", async function () {
            const { presale } = await loadFixture(deployPresaleFixture);

            await expect(
                presale.setPaused(true)
            ).to.be.revertedWith("Only DAO");

            await expect(
                presale.withdrawToTreasury()
            ).to.be.revertedWith("Only DAO");
        });

        it("Should not allow changing treasury address even through initialization", async function () {
            const { dao, presale, owner } = await loadFixture(deployPresaleFixture);
            const presaleAddress = await presale.getAddress();
            
            // Try to initialize again with a different treasury
            await expect(
                presale.initialize(
                    await presale.token(),
                    owner.address, // Try to set owner as treasury
                    ethers.parseEther("100000"),
                    ethers.parseEther("0.001")
                )
            ).to.be.reverted; // OpenZeppelin uses custom error for initialization
        });

        it("Should prevent upgrade except through DAO proposal", async function () {
            const { presale } = await loadFixture(deployPresaleFixture);
            const newImplementation = await ethers.deployContract("DAOPresale");
            await newImplementation.waitForDeployment();

            await expect(
                presale.upgradeToAndCall(await newImplementation.getAddress(), "0x")
            ).to.be.revertedWith("Only DAO");
        });
    });
});
