// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "../interfaces/IDAOBase.sol";
import "../interfaces/IDAOEvents.sol";
import "../interfaces/IDAOModule.sol";

/**
 * @title DAOEvents
 * @dev Library for handling DAO event emissions
 * Uses events defined in IDAOEvents interface
 * Provides helper functions for emitting events with proper parameters
 */
library DAOEvents {
    // Mapping for module type strings to avoid repeated string comparisons
    // Note: Solidity doesn't support constant mappings, so we'll use a function
    function _getModuleTypeString(IDAOModule.ModuleType moduleType) private pure returns (string memory) {
        if (moduleType == IDAOModule.ModuleType.Presale) return "presale";
        if (moduleType == IDAOModule.ModuleType.Vesting) return "vesting";
        revert("Unknown module type");
    }
    function emitProposalCreated(
        uint256 proposalId,
        IDAOBase.ProposalType proposalType,
        uint256 endTime
    ) internal {
        emit IDAOEvents.ProposalCreated(
            proposalId,
            proposalType,
            endTime
        );
    }

    function emitTransferProposalCreated(
        uint256 proposalId,
        address token,
        address recipient,
        uint256 amount
    ) internal {
        emit IDAOEvents.TransferProposalCreated(
            proposalId,
            token,
            recipient,
            amount
        );
    }

    function emitPresaleProposalCreated(
        uint256 proposalId,
        address token,
        uint256 amount,
        uint256 initialPrice
    ) internal {
        emit IDAOEvents.PresaleProposalCreated(
            proposalId,
            token,
            amount,
            initialPrice
        );
    }

    function emitPresalePauseProposalCreated(
        uint256 proposalId,
        address presaleContract,
        bool pause
    ) internal {
        emit IDAOEvents.PresalePauseProposalCreated(
            proposalId,
            presaleContract,
            pause
        );
    }

    function emitPresaleWithdrawProposalCreated(
        uint256 proposalId,
        address presaleContract
    ) internal {
        emit IDAOEvents.PresaleWithdrawProposalCreated(
            proposalId,
            presaleContract
        );
    }

    function emitUpgradeProposalCreated(
        uint256 proposalId,
        address[] memory newImplementations,
        string memory version
    ) internal {
        emit IDAOEvents.UpgradeProposalCreated(
            proposalId,
            newImplementations,
            version
        );
    }

    function emitModuleUpgradeProposalCreated(
        uint256 proposalId,
        IDAOModule.ModuleType moduleType,
        address moduleAddress,
        string memory version
    ) internal {
        emit IDAOEvents.ModuleUpgradeProposalCreated(
            proposalId,
            moduleType,
            moduleAddress,
            version
        );
    }

    function emitVoted(
        uint256 proposalId,
        address voter,
        bool support,
        uint256 votingPower
    ) internal {
        emit IDAOEvents.Voted(proposalId, voter, support, votingPower);
    }

    function emitProposalExecuted(uint256 proposalId) internal {
        emit IDAOEvents.ProposalExecuted(proposalId);
    }

    function emitDAOPaused(address account) internal {
        emit IDAOEvents.DAOPaused(account);
    }

    function emitDAOUnpaused(address account) internal {
        emit IDAOEvents.DAOUnpaused(account);
    }

    function emitEmergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) internal {
        emit IDAOEvents.EmergencyWithdraw(token, recipient, amount);
    }

    function emitPresaleDeployed(
        uint256 proposalId,
        address presaleContract,
        uint256 amount,
        uint256 initialPrice
    ) internal {
        emit IDAOEvents.PresaleDeployed(proposalId, presaleContract, amount, initialPrice);
    }

    function emitModuleUpgraded(
        uint256 proposalId,
        address moduleAddress,
        IDAOModule.ModuleType moduleType,
        string memory version
    ) internal {
        emit IDAOEvents.ModuleUpgraded(
            proposalId,
            moduleAddress,
            moduleTypeToString(moduleType),
            version
        );
    }

    /**
     * @dev Converts a module type enum to its string representation
     * @param moduleType The module type to convert
     * @return The string representation of the module type
     */
    function moduleTypeToString(IDAOModule.ModuleType moduleType) internal pure returns (string memory) {
        return _getModuleTypeString(moduleType);
    }

}
