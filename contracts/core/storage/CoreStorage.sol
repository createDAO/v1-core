// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IDAOBase.sol";

library CoreStorage {
    // keccak256("dao.core.storage") = "0x056d7b0e20ac32e10b30e7c6e0a547e9a5a5c7ba7e2aef2c7c75b92c50e3f05b"
    bytes32 constant STORAGE_LOCATION = keccak256("dao.core.storage");

    struct Layout {
        // Core state variables
        string name;
        address factory;
        mapping(IDAOBase.UpgradeableContract => address) upgradeableContracts;
        uint256 votingPeriod;
        uint256 minProposalStake;
        uint256 quorum;
        bool paused;
        bool executingProposal;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = STORAGE_LOCATION;
        assembly {
            l.slot := position
        }
    }
}
