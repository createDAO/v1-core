// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IDAOProposals.sol";
import "./interfaces/IDAOStaking.sol";
import "./interfaces/IDAOFactory.sol";
import "./interfaces/IDAOModule.sol";
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

    function _validateAndInitializeProposal() internal returns (uint256 proposalId) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        // Check proposer has enough stake
        require(
            IDAOStaking(core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking])
                .getVotingPower(msg.sender) >= core.minProposalStake,
            "Insufficient stake"
        );

        proposalId = proposals.proposalCount++;
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.endTime = block.timestamp + core.votingPeriod;
        
        return proposalId;
    }

    function proposeModuleUpgrade(
        IDAOModule.ModuleType moduleType,
        address moduleAddress,
        string calldata newVersion
    ) external whenNotPaused returns (uint256) {
        require(moduleAddress != address(0), "Zero module address");

        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        // Verify new implementation exists
        address newImpl = IDAOFactory(core.factory).getModuleImplementation(moduleType, newVersion);
        require(newImpl != address(0), "Invalid version");

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.ModuleUpgrade;

        // Store module upgrade data
        proposals.moduleUpgradeData[proposalId].moduleType = moduleType;
        proposals.moduleUpgradeData[proposalId].moduleAddress = moduleAddress;
        proposals.moduleUpgradeData[proposalId].newVersion = newVersion;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.ModuleUpgrade,
            proposal.endTime
        );
        
        DAOEvents.emitModuleUpgradeProposalCreated(
            proposalId,
            moduleType,
            moduleAddress,
            newVersion
        );
        return proposalId;
    }

    function proposeTransfer(
        address token,
        address recipient,
        uint256 amount
    ) external whenNotPaused returns (uint256) {
        require(recipient != address(0), "Zero recipient");
        require(amount > 0, "Zero amount");

        ProposalStorage.Layout storage proposals = _getProposals();

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.Transfer;

        // Set transfer specific data
        proposals.transferData[proposalId].token = token;
        proposals.transferData[proposalId].recipient = recipient;
        proposals.transferData[proposalId].amount = amount;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Transfer,
            proposal.endTime
        );
        
        DAOEvents.emitTransferProposalCreated(
            proposalId,
            token,
            recipient,
            amount
        );
        return proposalId;
    }

    function proposePresalePause(
        address presaleContract,
        bool pause
    ) external whenNotPaused returns (uint256) {
        require(presaleContract != address(0), "Zero presale address");

        ProposalStorage.Layout storage proposals = _getProposals();

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.PresalePause;

        // Set presale pause data
        proposals.presalePauseData[proposalId].presaleContract = presaleContract;
        proposals.presalePauseData[proposalId].pause = pause;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.PresalePause,
            proposal.endTime
        );
        
        DAOEvents.emitPresalePauseProposalCreated(
            proposalId,
            presaleContract,
            pause
        );
        return proposalId;
    }

    function proposePresaleWithdraw(
        address presaleContract
    ) external whenNotPaused returns (uint256) {
        require(presaleContract != address(0), "Zero presale address");

        ProposalStorage.Layout storage proposals = _getProposals();

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.PresaleWithdraw;

        // Set presale withdraw data
        proposals.presaleWithdrawData[proposalId].presaleContract = presaleContract;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.PresaleWithdraw,
            proposal.endTime
        );
        
        DAOEvents.emitPresaleWithdrawProposalCreated(
            proposalId,
            presaleContract
        );
        return proposalId;
    }

    function proposePause() external whenNotPaused returns (uint256) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        require(!core.paused, "Already paused");

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.Pause;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Pause,
            proposal.endTime
        );
        return proposalId;
    }

    function proposeUnpause() external returns (uint256) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        require(core.paused, "Not paused");

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.Unpause;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Unpause,
            proposal.endTime
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

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.Presale;

        // Set presale specific data
        proposals.presaleData[proposalId].token = core.upgradeableContracts[
            IDAOBase.UpgradeableContract.Token
        ];
        proposals.presaleData[proposalId].amount = tokenAmount;
        proposals.presaleData[proposalId].initialPrice = initialPrice;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Presale,
            proposal.endTime
        );
        
        DAOEvents.emitPresaleProposalCreated(
            proposalId,
            core.upgradeableContracts[IDAOBase.UpgradeableContract.Token],
            tokenAmount,
            initialPrice
        );
        return proposalId;
    }

    function proposeUpgrade(
        string calldata newVersion
    ) external whenNotPaused returns (uint256) {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();

        (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl
        ) = IDAOFactory(core.factory).getCoreImplementation(newVersion);

        require(daoImpl != address(0), "Invalid version");
        require(tokenImpl != address(0), "Invalid version");
        require(treasuryImpl != address(0), "Invalid version");
        require(stakingImpl != address(0), "Invalid version");

        uint256 proposalId = _validateAndInitializeProposal();
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];
        proposal.proposalType = IDAOBase.ProposalType.Upgrade;

        // Store all implementations
        address[] memory newImplementations = new address[](4);
        newImplementations[0] = daoImpl;
        newImplementations[1] = tokenImpl;
        newImplementations[2] = treasuryImpl;
        newImplementations[3] = stakingImpl;

        proposals.upgradeData[proposalId].newImplementations = newImplementations;
        proposals.upgradeData[proposalId].newVersion = newVersion;

        DAOEvents.emitProposalCreated(
            proposalId,
            IDAOBase.ProposalType.Upgrade,
            proposal.endTime
        );
        
        DAOEvents.emitUpgradeProposalCreated(
            proposalId,
            newImplementations,
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

    function getModuleUpgradeData(uint256 proposalId)
        external
        view
        returns (
            IDAOModule.ModuleType moduleType,
            address moduleAddress,
            string memory newVersion
        )
    {
        ProposalStorage.ModuleUpgradeData storage data = _getProposals().moduleUpgradeData[proposalId];
        return (data.moduleType, data.moduleAddress, data.newVersion);
    }

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
            address[] memory newImplementations,
            string memory newVersion
        )
    {
        ProposalStorage.UpgradeData storage data = _getProposals().upgradeData[proposalId];
        return (
            data.newImplementations,
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
