// SPDX-License-Identifier: BSL-1.1
//   _____          ____    _____  ____  _
//  |  __ \   /\   / __ \  / ____|/ __ \| |
//  | |  | | /  \ | |  | || (___ | |  | | |
//  | |  | |/ /\ \| |  | | \___ \| |  | | |
//  | |__| / ____ \ |__| | ____) | |__| | |____
//  |_____/_/    \_\____(_)_____/ \____/|______|
//  deployed by createDAO.org for main DAO implementation

// Hey! This code is for mother Earth's prosperity. Feel free to learn from it,
// but I'm tired of cheapskate copycats deploying clones to make quick cash
// without adding any value. That's why it's BSL licensed for 4 years.
// After that, it's all yours. Peace ✌️
// Diornov
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
        core.quorum = 1000; // 10%
    }

    string private constant VERSION = "1.0.0";

    function version() external pure virtual returns (string memory) {
        return VERSION;
    }

    function getPresaleContract(uint256 proposalId) external view returns (address) {
        return _getProposals().presaleContracts[proposalId];
    }

    // Required override for UUPS proxy
    function _authorizeUpgrade(
        address newImplementation
    ) internal override {
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
