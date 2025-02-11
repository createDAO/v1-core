// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "../interfaces/IDAOBase.sol";

/**
 * @dev Internal library for DAO events
 * This library contains all events used across the DAO system
 */
library DAOEvents {
    // Proposal events
    event ProposalCreated(
        uint256 indexed proposalId,
        IDAOBase.ProposalType proposalType,
        address token, // For transfer proposals
        address recipient, // For transfer proposals
        uint256 amount, // For transfer proposals
        IDAOBase.UpgradeableContract contractToUpgrade, // For upgrade proposals
        string newVersion // For upgrade proposals
    );

    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );

    event ProposalExecuted(uint256 indexed proposalId);

    // Presale events
    event PresaleDeployed(
        uint256 indexed proposalId,
        address indexed presaleContract,
        uint256 tokenAmount,
        uint256 initialPrice
    );

    // System events
    event DAOPaused(address indexed account);
    event DAOUnpaused(address indexed account);
    event EmergencyWithdraw(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    // Event emitting functions
    function emitProposalCreated(
        uint256 proposalId,
        IDAOBase.ProposalType proposalType,
        address token,
        address recipient,
        uint256 amount,
        IDAOBase.UpgradeableContract contractToUpgrade,
        string memory newVersion
    ) internal {
        emit ProposalCreated(
            proposalId,
            proposalType,
            token,
            recipient,
            amount,
            contractToUpgrade,
            newVersion
        );
    }

    function emitVoted(
        uint256 proposalId,
        address voter,
        bool support,
        uint256 votingPower
    ) internal {
        emit Voted(proposalId, voter, support, votingPower);
    }

    function emitProposalExecuted(uint256 proposalId) internal {
        emit ProposalExecuted(proposalId);
    }

    function emitPresaleDeployed(
        uint256 proposalId,
        address presaleContract,
        uint256 tokenAmount,
        uint256 initialPrice
    ) internal {
        emit PresaleDeployed(
            proposalId,
            presaleContract,
            tokenAmount,
            initialPrice
        );
    }

    function emitDAOPaused(address account) internal {
        emit DAOPaused(account);
    }

    function emitDAOUnpaused(address account) internal {
        emit DAOUnpaused(account);
    }

    function emitEmergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) internal {
        emit EmergencyWithdraw(token, recipient, amount);
    }
}
