// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./DAOStorage.sol";

/**
 * @dev Events for DAO contracts
 * This contract contains all events to maintain consistency across the system
 */
abstract contract DAOEvents {
    // Proposal events
    event ProposalCreated(
        uint256 indexed proposalId,
        DAOStorage.ProposalType proposalType,
        address token, // For transfer proposals
        address recipient, // For transfer proposals
        uint256 amount, // For transfer proposals
        DAOStorage.UpgradeableContract contractToUpgrade, // For upgrade proposals
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
}
