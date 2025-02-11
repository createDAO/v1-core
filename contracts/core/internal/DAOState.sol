// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IDAOBase.sol";

/**
 * @dev Internal library for DAO state management
 * This contract contains all storage variables and state management functions
 */
library DAOState {
    struct State {
        // Core state variables
        string name;
        address factory;
        mapping(IDAOBase.UpgradeableContract => address) upgradeableContracts;
        
        // Proposal storage
        mapping(uint256 => Proposal) proposals;
        mapping(uint256 => TransferData) transferData;
        mapping(uint256 => UpgradeData) upgradeData;
        mapping(uint256 => PresaleData) presaleData;
        mapping(uint256 => PresalePauseData) presalePauseData;
        mapping(uint256 => PresaleWithdrawData) presaleWithdrawData;
        mapping(uint256 => address) presaleContracts;
        
        // Note: Pause and Unpause proposals don't need additional data
        // They just use the basic Proposal struct with ProposalType.Pause or ProposalType.Unpause
        uint256 proposalCount;
        uint256 votingPeriod;
        uint256 minProposalStake;
        uint256 quorum;
        
        // Control flags
        bool executingProposal;
        bool paused;
    }

    struct PresalePauseData {
        address presaleContract;
        bool pause;
    }

    struct PresaleWithdrawData {
        address presaleContract;
    }

    struct Proposal {
        IDAOBase.ProposalType proposalType;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 endTime;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    struct TransferData {
        address token;
        address recipient;
        uint256 amount;
    }

    struct UpgradeData {
        IDAOBase.UpgradeableContract contractToUpgrade;
        address newImplementation;
        string newVersion;
    }

    struct PresaleData {
        address token;
        uint256 amount;
        uint256 initialPrice;
    }
}
