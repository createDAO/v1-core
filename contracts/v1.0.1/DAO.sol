// SPDX-License-Identifier: MIT
//   _____          ____           _____ ____  _   _ _______ _____            _____ _______ 
//  |  __ \   /\   / __ \         / ____/ __ \| \ | |__   __|  __ \     /\   / ____|__   __|
//  | |  | | /  \ | |  | |       | |   | |  | |  \| |  | |  | |__) |   /  \ | |       | |   
//  | |  | |/ /\ \| |  | |       | |   | |  | | . ` |  | |  |  _  /   / /\ \| |       | |   
//  | |__| / ____ \ |__| |       | |___| |__| | |\  |  | |  | | \ \  / ____ \ |____   | |   
//  |_____/_/    \_\____/         \_____\____/|_| \_|  |_|  |_|  \_\/_/    \_\_____|  |_|   
//                                                                                         
//                                                                                         
// Deployed by createDAO.org -  Main DAO Implementation
// GitHub: https://github.com/createdao
// 
// 🌍 This code is free. Like speech. Like people should be.
// Use it, learn from it, build with it. Share what you make.
// But remember what this is for: not greed, not ego — but freedom, creativity, and unity.
// 
// Inspired by Chaplin's call in The Great Dictator:
// “You, the people, have the power — the power to create happiness!”
// 
// So build not for domination, but for decentralization.
// Not for walls, but bridges. Not for power, but empowerment.
// 
// Licensed under the MIT License — short, sweet, and to the point.
// No restrictions, no delays. Just create. Just be human. ✌️
// — Diornov



pragma solidity ^0.8.20;

import "./core/DAOProposals.sol";
import "./core/DAOExecutor.sol";
import "./core/storage/CoreStorage.sol";
import "./core/storage/ProposalStorage.sol";

/**
 * @title DAO
 * @dev Main DAO contract that combines all functionality through inheritance
 * Uses ERC-7201 namespaced storage pattern for better storage management
 * and safer upgrades
 * 
 * Inheritance chain:
 * - DAOProposals (IDAOProposals): Proposal creation and voting
 * - DAOExecutor (IDAOExecutor): Proposal execution and emergency functions
 * Both inherit from:
 * - DAOStorage (IDAOBase): Shared storage and base functionality with ERC-7201
 * - DAOEvents: Shared events
 */
contract DAO is DAOProposals, DAOExecutor {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        address _treasury,
        address _stakingContract,
        address _token,
        address _factory
    ) external initializer {
        require(bytes(_name).length > 0, "Empty name");
        require(_treasury != address(0), "Zero treasury");
        require(_stakingContract != address(0), "Zero staking");
        require(_token != address(0), "Zero token");
        require(_factory != address(0), "Zero factory");

        __Ownable_init(_factory);
        __UUPSUpgradeable_init();

        CoreStorage.Layout storage core = _getCore();
        core.name = _name;
        core.factory = _factory;

        // Initialize upgradeable contract addresses
        core.upgradeableContracts[IDAOBase.UpgradeableContract.DAO] = address(this);
        core.upgradeableContracts[IDAOBase.UpgradeableContract.Treasury] = _treasury;
        core.upgradeableContracts[IDAOBase.UpgradeableContract.Staking] = _stakingContract;
        core.upgradeableContracts[IDAOBase.UpgradeableContract.Token] = _token;

        // Initialize governance parameters
        core.votingPeriod = 3 days;
        core.minProposalStake = 1e18; // 1 token
        core.quorum = 5000; // 50%
    }

    string private constant VERSION = "1.0.2";

    function version() external pure virtual returns (string memory) {
        return VERSION;
    }

    function getPresaleContract(uint256 proposalId) external view returns (address) {
        return _getProposals().presaleContracts[proposalId];
    }

    // Required override for UUPS proxy
    function _authorizeUpgrade(
        address
    ) internal override view {
        CoreStorage.Layout storage core = _getCore();
        if (!core.executingProposal) {
            // Only allow owner for direct upgrades (initialization)
            _checkOwner();
        }
        // If _executingProposal is true, allow the upgrade
        // This means it's being called during proposal execution
        // which has already gone through governance checks:
        // - Proposer has enough stake
        // - Community voted in favor
        // - Quorum was reached
        // - Voting period has ended
    }
}
