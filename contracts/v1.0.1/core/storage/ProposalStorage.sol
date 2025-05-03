// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDAOBase.sol";
import "../interfaces/IDAOModule.sol";

library ProposalStorage {
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

    struct PresaleData {
        address token;
        uint256 amount;
        uint256 initialPrice;
    }

    struct PresalePauseData {
        address presaleContract;
        bool pause;
    }

    struct PresaleWithdrawData {
        address presaleContract;
    }

    struct UpgradeData {
        address[] newImplementations;
        string newVersion;
    }

    struct ModuleUpgradeData {
        IDAOModule.ModuleType moduleType;
        address moduleAddress;
        string newVersion;
    }

    struct Layout {
        uint256 proposalCount;
        mapping(uint256 => Proposal) proposals;
        mapping(uint256 => TransferData) transferData;
        mapping(uint256 => PresaleData) presaleData;
        mapping(uint256 => PresalePauseData) presalePauseData;
        mapping(uint256 => PresaleWithdrawData) presaleWithdrawData;
        mapping(uint256 => UpgradeData) upgradeData;
        mapping(uint256 => ModuleUpgradeData) moduleUpgradeData;
        mapping(uint256 => address) presaleContracts;
    }

    bytes32 private constant STORAGE_SLOT =
        keccak256("dao.storage.proposals");

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
