import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { deployDAOFixture, deployDAOFixtureWithStakedToken } from "../../fixtures/dao.fixture";
import { ethers } from "hardhat";
import { MIN_PROPOSAL_STAKE, stakeTokens } from "../../utils/token.utils";
import { advanceToEndOfVotingPeriod } from "../../utils/time.utils";

describe("DAO Governance", function () {
    describe("Pause/Unpause", function () {
        it("Should pause DAO through governance", async function () {
            const { dao, staking, token, owner } = await loadFixture(deployDAOFixtureWithStakedToken);
            
            // Create pause proposal
            await dao.proposePause();
            await dao.vote(0, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(0);

            expect(await dao.paused()).to.be.true;

            // Verify can't create new proposals while paused
            await expect(
                dao.proposeTransfer(
                    await token.getAddress(),
                    owner.address,
                    ethers.parseEther("1")
                )
            ).to.be.revertedWith("DAO: paused");
        });

        it("Should unpause DAO through governance", async function () {
            const { dao, staking, token, owner } = await loadFixture(deployDAOFixtureWithStakedToken);  
            
            // First pause
            await dao.proposePause();
            await dao.vote(0, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(0);

            // Then unpause
            await dao.proposeUnpause();
            await dao.vote(1, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(1);

            expect(await dao.paused()).to.be.false;

            // Verify can create proposals again
            await expect(
                dao.proposeTransfer(
                    await token.getAddress(),
                    owner.address,
                    ethers.parseEther("1")
                )
            ).to.not.be.reverted;
        });

        it("Should prevent proposing pause when already paused", async function () {
            const { dao, staking, token, owner } = await loadFixture(deployDAOFixtureWithStakedToken);
            
            // First pause
            await dao.proposePause();
            await dao.vote(0, true);
            await advanceToEndOfVotingPeriod();
            await dao.execute(0);

            // Try to pause again
            await expect(
                dao.proposePause()
            ).to.be.revertedWith("DAO: paused");
        });

        it("Should prevent proposing unpause when not paused", async function () {
            const { dao } = await loadFixture(deployDAOFixture);

            await expect(
                dao.proposeUnpause()
            ).to.be.revertedWith("Not paused");
        });

        it("Should prevent executing pause proposal if already paused", async function () {
            const { dao, staking, token, owner } = await loadFixture(deployDAOFixtureWithStakedToken);

            // Create two pause proposals
            await dao.proposePause();
            await dao.proposePause();

            // Vote and execute first proposal
            await dao.vote(1, true);
            await dao.vote(0, true);
            
            await advanceToEndOfVotingPeriod();
            await dao.execute(0);

            // Try to execute second proposal
            await expect(
                dao.execute(1)
            ).to.be.revertedWith("Already paused");
        });        
    });
});
