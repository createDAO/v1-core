import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployDAOFixture, deployDAOFixtureWithStakedToken } from "../../fixtures/dao.fixture";
import { ProposalType, UpgradeableContract } from "../../utils/proposal.utils";
import { MIN_PROPOSAL_STAKE, transferTokensFromTreasury } from "../../utils/token.utils";

describe("DAO Storage", function () {
    it("Should initialize storage variables correctly", async function () {
        const { dao, token, treasury, staking, factory, daoName } = await loadFixture(deployDAOFixture);

        // Core storage
        expect(await dao.name()).to.equal(daoName);
        expect(await dao.factory()).to.equal(await factory.getAddress());
        expect(await dao.votingPeriod()).to.equal(3 * 24 * 60 * 60); // 3 days
        expect(await dao.minProposalStake()).to.equal(ethers.parseEther("1")); // 1 token
        expect(await dao.quorum()).to.equal(1000); // 10%
        expect(await dao.paused()).to.equal(false);

        // Upgradeable contracts storage
        expect(await dao.upgradeableContracts(UpgradeableContract.DAO)).to.equal(await dao.getAddress());
        expect(await dao.upgradeableContracts(UpgradeableContract.Token)).to.equal(await token.getAddress());
        expect(await dao.upgradeableContracts(UpgradeableContract.Treasury)).to.equal(await treasury.getAddress());
        expect(await dao.upgradeableContracts(UpgradeableContract.Staking)).to.equal(await staking.getAddress());
    });

    it("Should maintain correct proposal storage", async function () {
        const { dao, token, accounts } = await loadFixture(deployDAOFixtureWithStakedToken);
        const [addr1] = accounts;

        // Create a transfer proposal
        const amount = ethers.parseEther("100");
        const tx = await dao.proposeTransfer(await token.getAddress(), addr1.address, amount);
        const receipt = await tx.wait();
        const proposalId = await dao.proposalCount() - 1n;

        // Check proposal storage
        const proposal = await dao.getProposal(proposalId);
        expect(proposal[0]).to.equal(ProposalType.Transfer); // proposalType
        expect(proposal[1]).to.equal(0n); // forVotes
        expect(proposal[2]).to.equal(0n); // againstVotes
        expect(proposal[4]).to.equal(false); // executed

        // Check transfer data storage
        const transferData = await dao.getTransferData(proposalId);
        expect(transferData[0]).to.equal(await token.getAddress()); // token
        expect(transferData[1]).to.equal(addr1.address); // recipient
        expect(transferData[2]).to.equal(amount); // amount
    });

    it("Should maintain storage isolation between proposals", async function () {
        const { dao, token, accounts } = await loadFixture(deployDAOFixtureWithStakedToken);
        const [addr1, addr2] = accounts;

        // Create two transfer proposals
        const amount1 = ethers.parseEther("100");
        const amount2 = ethers.parseEther("200");
        
        await dao.proposeTransfer(await token.getAddress(), addr1.address, amount1);
        await dao.proposeTransfer(await token.getAddress(), addr2.address, amount2);
        
        const proposalId1 = await dao.proposalCount() - 2n;
        const proposalId2 = await dao.proposalCount() - 1n;

        // Check transfer data storage for both proposals
        const transferData1 = await dao.getTransferData(proposalId1);
        const transferData2 = await dao.getTransferData(proposalId2);

        expect(transferData1[1]).to.equal(addr1.address);
        expect(transferData1[2]).to.equal(amount1);
        expect(transferData2[1]).to.equal(addr2.address);
        expect(transferData2[2]).to.equal(amount2);
    });

    it("Should maintain storage isolation between different proposal types", async function () {
        const { dao, token, accounts } = await loadFixture(deployDAOFixtureWithStakedToken);
        const [addr1] = accounts;

        // Create transfer proposal
        const transferAmount = ethers.parseEther("100");
        await dao.proposeTransfer(await token.getAddress(), addr1.address, transferAmount);
        const transferProposalId = await dao.proposalCount() - 1n;

        // Create presale proposal
        const tokenAmount = ethers.parseEther("1000");
        const initialPrice = ethers.parseEther("0.1");
        await dao.proposePresale(tokenAmount, initialPrice);
        const presaleProposalId = await dao.proposalCount() - 1n;

        // Check transfer proposal storage
        const transferData = await dao.getTransferData(transferProposalId);
        expect(transferData[1]).to.equal(addr1.address);
        expect(transferData[2]).to.equal(transferAmount);

        // Check presale proposal storage
        const presaleData = await dao.getPresaleData(presaleProposalId);
        expect(presaleData[0]).to.equal(await token.getAddress());
        expect(presaleData[1]).to.equal(tokenAmount);
        expect(presaleData[2]).to.equal(initialPrice);

        // Verify no cross-contamination
        const proposal1 = await dao.getProposal(transferProposalId);
        const proposal2 = await dao.getProposal(presaleProposalId);
        expect(proposal1[0]).to.equal(ProposalType.Transfer);
        expect(proposal2[0]).to.equal(ProposalType.Presale);
    });

    it("Should maintain correct storage after voting", async function () {
        const { dao, token, accounts } = await loadFixture(deployDAOFixtureWithStakedToken);
        const [addr1] = accounts;

        // Create proposal
        const transferAmount = ethers.parseEther("100");
        await dao.proposeTransfer(await token.getAddress(), addr1.address, transferAmount);
        const proposalId = await dao.proposalCount() - 1n;

        // Vote
        await dao.vote(proposalId, true);

        // Check proposal storage after voting
        const proposal = await dao.getProposal(proposalId);
        expect(proposal[1]).to.equal(MIN_PROPOSAL_STAKE); // forVotes
        expect(proposal[2]).to.equal(0n); // againstVotes
    });

    it("Should prevent proposal creation without sufficient stake", async function () {
        const { dao, token, accounts } = await loadFixture(deployDAOFixture);
        const [addr1] = accounts;

        // Try to create proposal without staking
        const transferAmount = ethers.parseEther("100");
        await expect(
            dao.proposeTransfer(await token.getAddress(), addr1.address, transferAmount)
        ).to.be.revertedWith("Insufficient stake");
    });

    it("Should maintain correct storage for multiple voters", async function () {
        const { dao, token, staking, accounts } = await loadFixture(deployDAOFixtureWithStakedToken);
        const [addr1] = accounts;

        // Setup voting power for addr1
        const stakingAmount = ethers.parseEther("5");
        await transferTokensFromTreasury(dao, token, addr1, stakingAmount);
        await token.connect(addr1).approve(await staking.getAddress(), stakingAmount);
        await staking.connect(addr1).stake(stakingAmount);

        // Create proposal
        const transferAmount = ethers.parseEther("100");
        await dao.proposeTransfer(await token.getAddress(), addr1.address, transferAmount);
        const proposalId = await dao.proposalCount() - 1n;

        // Vote with multiple accounts
        await dao.vote(proposalId, true); // owner votes yes
        await dao.connect(addr1).vote(proposalId, false); // addr1 votes no

        // Check proposal storage after multiple votes
        const proposal = await dao.getProposal(proposalId);
        expect(proposal[1]).to.equal(MIN_PROPOSAL_STAKE); // forVotes (owner)
        expect(proposal[2]).to.equal(stakingAmount); // againstVotes (addr1)
    });
});
