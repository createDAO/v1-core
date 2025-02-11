// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./DAOProposals.sol";
import "./interfaces/IDAOExecutor.sol";
import "./interfaces/IDAOTreasury.sol";
import "./interfaces/IDAOToken.sol";
import "./interfaces/IDAOPresale.sol";
import "./interfaces/IUpgradeable.sol";
import "../DAOPresaleProxy.sol";
import "./storage/CoreStorage.sol";
import "./storage/ProposalStorage.sol";

/**
 * @dev Implementation of proposal execution and emergency functions
 * Uses ERC-7201 namespaced storage pattern
 */
abstract contract DAOExecutor is DAOProposals, IDAOExecutor {
    using CoreStorage for CoreStorage.Layout;
    using ProposalStorage for ProposalStorage.Layout;
    using DAOEvents for *;

    function execute(uint256 proposalId) external {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();
        
        core.executingProposal = true; // Set flag before execution
        
        ProposalStorage.Proposal storage proposal = proposals.proposals[proposalId];

        require(block.timestamp >= proposal.endTime, "Voting ongoing");
        require(!proposal.executed, "Already executed");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalStaked = IDAOStaking(
            core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking]
        ).totalStaked();

        require(
            totalStaked > 0 && (totalVotes * 10000) / totalStaked >= core.quorum,
            "Quorum not reached"
        );
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");

        proposal.executed = true;

        if (proposal.proposalType == IDAOBase.ProposalType.Transfer) {
            _executeTransfer(proposalId);
        } else if (proposal.proposalType == IDAOBase.ProposalType.Presale) {
            _executePresale(proposalId);
        } else if (proposal.proposalType == IDAOBase.ProposalType.Upgrade) {
            _executeUpgrade(proposalId);
        } else if (proposal.proposalType == IDAOBase.ProposalType.PresalePause) {
            _executePresalePause(proposalId);
        } else if (proposal.proposalType == IDAOBase.ProposalType.PresaleWithdraw) {
            _executePresaleWithdraw(proposalId);
        } else if (proposal.proposalType == IDAOBase.ProposalType.Pause) {
            _executePause();
        } else if (proposal.proposalType == IDAOBase.ProposalType.Unpause) {
            _executeUnpause();
        }

        DAOEvents.emitProposalExecuted(proposalId);
        
        core.executingProposal = false; // Reset flag after execution
    }

    function _executePresalePause(uint256 proposalId) internal {
        ProposalStorage.PresalePauseData storage pData = _getProposals().presalePauseData[proposalId];
        require(pData.presaleContract != address(0), "Invalid presale contract");

        IDAOPresale(pData.presaleContract).setPaused(pData.pause);
    }

    function _executePresaleWithdraw(uint256 proposalId) internal {
        ProposalStorage.PresaleWithdrawData storage pData = _getProposals().presaleWithdrawData[proposalId];
        require(pData.presaleContract != address(0), "Invalid presale contract");

        IDAOPresale(pData.presaleContract).withdrawToTreasury();
    }

    function _executeTransfer(uint256 proposalId) internal {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.TransferData storage tData = _getProposals().transferData[proposalId];
        
        if (tData.token == address(0)) {
            IDAOTreasury(core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury])
                .transferETH(payable(tData.recipient), tData.amount);
        } else {
            IDAOTreasury(core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury])
                .transferERC20(tData.token, tData.recipient, tData.amount);
        }
    }

    function _executePresale(uint256 proposalId) internal {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();
        ProposalStorage.PresaleData storage pData = proposals.presaleData[proposalId];
        
        // Deploy presale contract
        bytes memory presaleInit = abi.encodeWithSelector(
            IDAOPresale.initialize.selector,
            pData.token,
            core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury],
            pData.amount,
            pData.initialPrice
        );

        // Get latest presale implementation from factory
        (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl,
            address presaleImpl
        ) = IDAOFactory(core.factory).getImplementation("latest");

        require(presaleImpl != address(0), "No presale implementation");

        // Deploy presale proxy
        DAOPresaleProxy presaleProxy = new DAOPresaleProxy(
            presaleImpl,
            presaleInit
        );
        proposals.presaleContracts[proposalId] = address(presaleProxy);

        // Whitelist presale contract to avoid tax
        address[] memory toWhitelist = new address[](1);
        toWhitelist[0] = address(presaleProxy);
        IDAOToken(core.upgradeableContracts[IDAOBase.UpgradeableContract.Token])
            .updateWhitelist(toWhitelist, true);

        // Transfer tokens to presale contract
        IDAOTreasury(core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury])
            .transferERC20(
                pData.token,
                address(presaleProxy),
                pData.amount
            );

        DAOEvents.emitPresaleDeployed(
            proposalId,
            address(presaleProxy),
            pData.amount,
            pData.initialPrice
        );
    }

    function _executeUpgrade(uint256 proposalId) internal {
        CoreStorage.Layout storage core = _getCore();
        ProposalStorage.Layout storage proposals = _getProposals();
        ProposalStorage.UpgradeData storage uData = proposals.upgradeData[proposalId];
        
        (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl,
            address presaleImpl
        ) = IDAOFactory(core.factory).getImplementation(uData.newVersion);

        address expectedImpl = _getImplementationAddress(
            uData.contractToUpgrade,
            daoImpl,
            tokenImpl,
            treasuryImpl,
            stakingImpl,
            presaleImpl
        );

        if (uData.contractToUpgrade == IDAOBase.UpgradeableContract.Presale) {
            require(
                proposals.presaleContracts[proposalId] != address(0),
                "Presale not found"
            );
        }

        require(
            expectedImpl == uData.newImplementation,
            "Implementation changed"
        );

        address contractToUpgrade = core.upgradeableContracts[
            uData.contractToUpgrade
        ];

        if (uData.contractToUpgrade == IDAOBase.UpgradeableContract.Presale) {
            IUpgradeable(proposals.presaleContracts[proposalId]).upgradeToAndCall(
                uData.newImplementation,
                ""
            );
        } else if (uData.contractToUpgrade == IDAOBase.UpgradeableContract.DAO) {
            _authorizeUpgrade(uData.newImplementation);
            upgradeToAndCall(uData.newImplementation, "");
        } else if (uData.contractToUpgrade == IDAOBase.UpgradeableContract.Staking) {
            // Set executing flag on staking contract before upgrade
            IDAOStaking(contractToUpgrade).setExecutingProposal(true);
            IUpgradeable(contractToUpgrade).upgradeToAndCall(
                uData.newImplementation,
                ""
            );
            // Reset executing flag after upgrade
            IDAOStaking(contractToUpgrade).setExecutingProposal(false);
        } else {
            IUpgradeable(contractToUpgrade).upgradeToAndCall(
                uData.newImplementation,
                ""
            );
        }
    }

    // Emergency functions
    function _executePause() internal {
        CoreStorage.Layout storage core = _getCore();
        require(!core.paused, "Already paused");
        core.paused = true;
        DAOEvents.emitDAOPaused(msg.sender);
    }

    function _executeUnpause() internal {
        CoreStorage.Layout storage core = _getCore();
        require(core.paused, "Not paused");
        core.paused = false;
        DAOEvents.emitDAOUnpaused(msg.sender);
    }

    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) external {
        CoreStorage.Layout storage core = _getCore();
        require(msg.sender == address(this), "Only DAO");
        require(core.paused, "Not paused");
        require(recipient != address(0), "Zero recipient");
        require(amount > 0, "Zero amount");

        if (token == address(0)) {
            IDAOTreasury(core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury])
                .transferETH(payable(recipient), amount);
        } else {
            IDAOTreasury(core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury])
                .transferERC20(token, recipient, amount);
        }

        DAOEvents.emitEmergencyWithdraw(token, recipient, amount);
    }
}
