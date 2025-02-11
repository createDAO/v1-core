// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IDAOProposals.sol";
import "./interfaces/IDAOStaking.sol";
import "./interfaces/IDAOFactory.sol";
import "./storage/CoreStorage.sol";
import "./storage/ProposalStorage.sol";
import "./internal/DAOEvents.sol";

/**
 * @dev Implementation of proposal creation and voting functionality
 * Uses ERC-7201 namespaced storage pattern
 */
abstract contract DAOProposals is Initializable, UUPSUpgradeable, OwnableUpgradeable, IDAOProposals {
    using CoreStorage for CoreStorage.Layout;
    using ProposalStorage for ProposalStorage.Layout;
    using DAOEvents for *;

    modifier whenNotPaused() {
        require(!_getCore().paused, "DAO: paused");
        _;
    }

    function proposeTransfer(
        address token,
        address recipient,
        uint256 amount
    ) external whenNotPaused returns (uint256) {
        require(recipient != address(0), "Zero recipient");
        require(amount > 0, "Zero amount");

        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        proposal.proposalType = IDAOBase.ProposalType.Transfer;
        proposal.endTime = block.timestamp + core.votingPeriod;

        // Set transfer specific data
        proposals.transferData[proposalId].token = token;
        proposals.transferData[proposalId].recipient = recipient;
        proposals.transferData[proposalId].amount = amount;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Transfer,
            token,
            recipient,
            amount,
            IDAOBase.UpgradeableContract.DAO,
            ""
        );
        return proposalId;
    }

    function proposePresalePause(
        address presaleContract,
        bool pause
    ) external whenNotPaused returns (uint256) {
        require(presaleContract != address(0), "Zero presale address");

        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        proposal.proposalType = IDAOBase.ProposalType.PresalePause;
        proposal.endTime = block.timestamp + core.votingPeriod;

        // Set presale pause data
        proposals.presalePauseData[proposalId].presaleContract = presaleContract;
        proposals.presalePauseData[proposalId].pause = pause;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.PresalePause,
            presaleContract,
            address(0),
            0,
            IDAOBase.UpgradeableContract.DAO,
            ""
        );
        return proposalId;
    }

    function proposePresaleWithdraw(
        address presaleContract
    ) external whenNotPaused returns (uint256) {
        require(presaleContract != address(0), "Zero presale address");

        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        proposal.proposalType = IDAOBase.ProposalType.PresaleWithdraw;
        proposal.endTime = block.timestamp + core.votingPeriod;

        // Set presale withdraw data
        proposals.presaleWithdrawData[proposalId].presaleContract = presaleContract;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.PresaleWithdraw,
            presaleContract,
            address(0),
            0,
            IDAOBase.UpgradeableContract.DAO,
            ""
        );
        return proposalId;
    }

    function proposePause() external whenNotPaused returns (uint256) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        require(!core.paused, "Already paused");

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        proposal.proposalType = IDAOBase.ProposalType.Pause;
        proposal.endTime = block.timestamp + core.votingPeriod;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Pause,
            address(0),
            address(0),
            0,
            IDAOBase.UpgradeableContract.DAO,
            ""
        );
        return proposalId;
    }

    function proposeUnpause() external returns (uint256) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        require(core.paused, "Not paused");

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        proposal.proposalType = IDAOBase.ProposalType.Unpause;
        proposal.endTime = block.timestamp + core.votingPeriod;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Unpause,
            address(0),
            address(0),
            0,
            IDAOBase.UpgradeableContract.DAO,
            ""
        );
        return proposalId;
    }

    function proposePresale(
        uint256 tokenAmount,
        uint256 initialPrice
    ) external whenNotPaused returns (uint256) {
        require(tokenAmount > 0, "Zero token amount");
        require(initialPrice > 0, "Zero initial price");

        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        proposal.proposalType = IDAOBase.ProposalType.Presale;
        proposal.endTime = block.timestamp + core.votingPeriod;

        // Set presale specific data
        proposals.presaleData[proposalId].token = core.upgradeableContracts[
            IDAOBase.UpgradeableContract.Token
        ];
        proposals.presaleData[proposalId].amount = tokenAmount;
        proposals.presaleData[proposalId].initialPrice = initialPrice;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Presale,
            core.upgradeableContracts[IDAOBase.UpgradeableContract.Token],
            address(0),
            tokenAmount,
            IDAOBase.UpgradeableContract.DAO,
            ""
        );
        return proposalId;
    }

    function proposeUpgrade(
        IDAOBase.UpgradeableContract contractType,
        string calldata newVersion
    ) external whenNotPaused returns (uint256) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        require(
            core.upgradeableContracts[contractType] != address(0),
            "Invalid contract type"
        );
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl,
            address presaleImpl
        ) = IDAOFactory(core.factory).getImplementation(newVersion);

        address newImplementation = _getImplementationAddress(
            contractType,
            daoImpl,
            tokenImpl,
            treasuryImpl,
            stakingImpl,
            presaleImpl
        );
        require(newImplementation != address(0), "Invalid version");

        uint256 proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.Upgrade;
        proposal.endTime = block.timestamp + core.votingPeriod;

        proposals.upgradeData[proposalId].contractToUpgrade = contractType;
        proposals.upgradeData[proposalId].newImplementation = newImplementation;
        proposals.upgradeData[proposalId].newVersion = newVersion;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Upgrade,
            address(0),
            address(0),
            0,
            contractType,
            newVersion
        );
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        require(block.timestamp < proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");

        uint256 votingPower = IDAOStaking(
            core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking]
        ).getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }

        DAOEvents.emitVoted(proposalId, msg.sender, support, votingPower);
    }

    function _getImplementationAddress(
        IDAOBase.UpgradeableContract contractType,
        address daoImpl,
        address tokenImpl,
        address treasuryImpl,
        address stakingImpl,
        address presaleImpl
    ) internal pure returns (address) {
        if (contractType == IDAOBase.UpgradeableContract.DAO) return daoImpl;
        if (contractType == IDAOBase.UpgradeableContract.Token) return tokenImpl;
        if (contractType == IDAOBase.UpgradeableContract.Treasury) return treasuryImpl;
        if (contractType == IDAOBase.UpgradeableContract.Staking) return stakingImpl;
        if (contractType == IDAOBase.UpgradeableContract.Presale) return presaleImpl;
        return address(0);
    }

    // View functions
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            IDAOBase.ProposalType proposalType,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 endTime,
            bool executed
        )
    {
        ProposalStorage.Proposal storage proposal = _getProposals().proposals[proposalId];
        return (
            proposal.proposalType,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.endTime,
            proposal.executed
        );
    }

    function getTransferData(uint256 proposalId)
        external
        view
        returns (address token, address recipient, uint256 amount)
    {
        ProposalStorage.TransferData storage data = _getProposals().transferData[proposalId];
        return (data.token, data.recipient, data.amount);
    }

    function getUpgradeData(uint256 proposalId)
        external
        view
        returns (
            IDAOBase.UpgradeableContract contractToUpgrade,
            address newImplementation,
            string memory newVersion
        )
    {
        ProposalStorage.UpgradeData storage data = _getProposals().upgradeData[proposalId];
        return (
            data.contractToUpgrade,
            data.newImplementation,
            data.newVersion
        );
    }

    function getPresaleData(uint256 proposalId)
        external
        view
        returns (
            address token,
            uint256 amount,
            uint256 initialPrice
        )
    {
        ProposalStorage.PresaleData storage data = _getProposals().presaleData[proposalId];
        return (data.token, data.amount, data.initialPrice);
    }

    function getPresalePauseData(uint256 proposalId)
        external
        view
        returns (
            address presaleContract,
            bool pause
        )
    {
        ProposalStorage.PresalePauseData storage data = _getProposals().presalePauseData[proposalId];
        return (data.presaleContract, data.pause);
    }

    function getPresaleWithdrawData(uint256 proposalId)
        external
        view
        returns (address presaleContract)
    {
        ProposalStorage.PresaleWithdrawData storage data = _getProposals().presaleWithdrawData[proposalId];
        return data.presaleContract;
    }

    // IDAOBase implementation
    function name() external view returns (string memory) {
        return _getCore().name;
    }

    function factory() external view returns (address) {
        return _getCore().factory;
    }

    function upgradeableContracts(IDAOBase.UpgradeableContract contractType) external view returns (address) {
        return _getCore().upgradeableContracts[contractType];
    }

    function proposalCount() external view returns (uint256) {
        return _getProposals().proposalCount;
    }

    function votingPeriod() external view returns (uint256) {
        return _getCore().votingPeriod;
    }

    function minProposalStake() external view returns (uint256) {
        return _getCore().minProposalStake;
    }

    function quorum() external view returns (uint256) {
        return _getCore().quorum;
    }

    function paused() external view returns (bool) {
        return _getCore().paused;
    }

    function _getCore() internal pure returns (CoreStorage.Layout storage) {
        return CoreStorage.layout();
    }

    function _getProposals() internal pure returns (ProposalStorage.Layout storage) {
        return ProposalStorage.layout();
    }
}
