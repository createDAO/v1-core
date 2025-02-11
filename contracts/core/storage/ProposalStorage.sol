// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "../interfaces/IDAOBase.sol";

library ProposalStorage {
    // keccak256("dao.proposal.storage") = "0x9437d2bf59d6bd7f83fc2efe4f09c0b4690a8f3476f49b3788339d2a13dfe7b4"
    bytes32 constant STORAGE_LOCATION = keccak256("dao.proposal.storage");

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

    struct PresalePauseData {
        address presaleContract;
        bool pause;
    }

    struct PresaleWithdrawData {
        address presaleContract;
    }

    struct Layout {
        mapping(uint256 => Proposal) proposals;
        mapping(uint256 => TransferData) transferData;
        mapping(uint256 => UpgradeData) upgradeData;
        mapping(uint256 => PresaleData) presaleData;
        mapping(uint256 => PresalePauseData) presalePauseData;
        mapping(uint256 => PresaleWithdrawData) presaleWithdrawData;
        mapping(uint256 => address) presaleContracts;
        uint256 proposalCount;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = STORAGE_LOCATION;
        assembly {
            l.slot := position
        }
    }
}
