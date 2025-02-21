// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./IDAOBase.sol";
import "./IDAOModule.sol";

/**
 * @title IDAOEvents
 * @dev Interface containing all DAO event definitions
 */
interface IDAOEvents {
    /**
     * @dev Base event emitted when any proposal is created
     */
    event ProposalCreated(
        uint256 indexed proposalId,
        IDAOBase.ProposalType indexed proposalType,
        uint256 endTime
    );

    /**
     * @dev Emitted when a transfer proposal is created
     */
    event TransferProposalCreated(
        uint256 indexed proposalId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @dev Emitted when a presale proposal is created
     */
    event PresaleProposalCreated(
        uint256 indexed proposalId,
        address token,
        uint256 amount,
        uint256 initialPrice
    );

    /**
     * @dev Emitted when a presale pause proposal is created
     */
    event PresalePauseProposalCreated(
        uint256 indexed proposalId,
        address presaleContract,
        bool pause
    );

    /**
     * @dev Emitted when a presale withdraw proposal is created
     */
    event PresaleWithdrawProposalCreated(
        uint256 indexed proposalId,
        address presaleContract
    );

    /**
     * @dev Emitted when an upgrade proposal is created
     */
    event UpgradeProposalCreated(
        uint256 indexed proposalId,
        address[] newImplementations,
        string version
    );

    /**
     * @dev Emitted when a module upgrade proposal is created
     */
    event ModuleUpgradeProposalCreated(
        uint256 indexed proposalId,
        IDAOModule.ModuleType moduleType,
        address moduleAddress,
        string version
    );

    /**
     * @dev Emitted when a vote is cast on a proposal
     */
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );

    /**
     * @dev Emitted when a proposal is executed
     */
    event ProposalExecuted(uint256 indexed proposalId);

    /**
     * @dev Emitted when the DAO is paused
     */
    event DAOPaused(address indexed account);

    /**
     * @dev Emitted when the DAO is unpaused
     */
    event DAOUnpaused(address indexed account);

    /**
     * @dev Emitted during emergency withdrawals
     */
    event EmergencyWithdraw(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @dev Emitted when a new presale contract is deployed
     */
    event PresaleDeployed(
        uint256 indexed proposalId,
        address indexed presaleContract,
        uint256 amount,
        uint256 initialPrice
    );

    /**
     * @dev Emitted when a module is upgraded
     */
    event ModuleUpgraded(
        uint256 indexed proposalId,
        address indexed moduleAddress,
        string moduleType,
        string version
    );
}
