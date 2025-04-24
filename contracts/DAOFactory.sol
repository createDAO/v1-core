// SPDX-License-Identifier: MIT
//   _____          ____       ______      _____ _______ ____  _______     __
//  |  __ \   /\   / __ \     |  ____/\   / ____|__   __/ __ \|  __ \ \   / /
//  | |  | | /  \ | |  | |    | |__ /  \ | |       | | | |  | | |__) \ \_/ / 
//  | |  | |/ /\ \| |  | |    |  __/ /\ \| |       | | | |  | |  _  / \   /  
//  | |__| / ____ \ |__| |    | | / ____ \ |____   | | | |__| | | \ \  | |   
//  |_____/_/    \_\____/     |_|/_/    \_\_____|  |_|  \____/|_|  \_\ |_|   
//                                                                                         
//                                                                                         
// Deployed by createDAO.org - DAO Factory Implementation
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

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DAOV1Interfaces.sol";
import "./DAOProxy.sol";
import "./DAOTokenProxy.sol";
import "./DAOTreasuryProxy.sol";
import "./DAOStakingProxy.sol";
import "./core/interfaces/IDAOModule.sol";

/**
 * @title DAOFactory
 * @dev This contract is designed to be upgradeable using UUPS proxy pattern.
 * IMPORTANT: When upgrading, maintain the storage layout to prevent storage collisions.
 * Storage layout:
 * - bytes32 slot 0: VERSION (constant, not stored)
 * - bytes32 slot 1-50: reserved for parent contracts (Initializable, UUPSUpgradeable, OwnableUpgradeable)
 * - bytes32 slot 51: implementations mapping
 * - bytes32 slot 52-200: gap for future storage variables
 */
contract DAOFactory is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // Constants (not stored in contract storage)
    string public constant FACTORY_VERSION = "1.0.0";

    /**
     * @dev Storage layout is critical for upgradeable contracts.
     * - Never modify the order of existing storage variables
     * - Only append new variables at the end
     * - Leave enough gap for future storage variables
     */
    struct CoreImplementation {
        address daoImplementation;
        address tokenImplementation;
        address treasuryImplementation;
        address stakingImplementation;
        bytes initializationTemplate;
    }

    /**
     * @dev Checks if a version is the latest registered version
     * @param versionId The version to check
     * @return bool True if this is the latest version
     */
    function _isLatestVersion(string memory versionId) internal view returns (bool) {
        DAOFactoryStorage storage $ = _getStorage();
        if ($.availableVersions.length == 0) return false;
        
        string memory latestVersion = $.availableVersions[$.availableVersions.length - 1];
        return keccak256(abi.encodePacked(versionId)) == keccak256(abi.encodePacked(latestVersion));
    }

    struct ModuleImplementation {
        address implementation;
    }

    /// @custom:storage-location erc7201:dao.factory.storage
    struct DAOFactoryStorage {
        // Core DAO implementations
        mapping(string => CoreImplementation) coreImplementations;
        
        // Module implementations by type and version
        mapping(IDAOModule.ModuleType => mapping(string => ModuleImplementation)) moduleImplementations;
        
        // Available versions for core implementations
        string[] availableVersions;
        
        // Track available versions for each module type
        mapping(IDAOModule.ModuleType => string[]) moduleVersions;
    }

    // keccak256(abi.encode(uint256(keccak256("dao.factory.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_LOCATION =
        0x9dd4c01fb54f0c00000000000000000000000000000000000000000000000000;

    function _getStorage() private pure returns (DAOFactoryStorage storage $) {
        assembly {
            $.slot := STORAGE_LOCATION
        }
    }

    // Events
    event DAOCreated(
        address indexed daoAddress,
        address indexed tokenAddress,
        address indexed treasuryAddress,
        address stakingAddress,
        string name,
        string versionId
    );

    event CoreImplementationRegistered(string versionId, address daoImpl);
    event ModuleImplementationRegistered(
        IDAOModule.ModuleType indexed moduleType,
        string versionId,
        address implementation,
        string moduleTypeName
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        require(_owner != address(0), "Zero owner");
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function registerCoreImplementation(
        string calldata versionId,
        address daoImpl,
        address tokenImpl,
        address treasuryImpl,
        address stakingImpl,
        bytes calldata initTemplate
    ) external onlyOwner {
        require(daoImpl != address(0), "Zero DAO implementation");
        require(tokenImpl != address(0), "Zero token implementation");
        require(treasuryImpl != address(0), "Zero treasury implementation");
        require(stakingImpl != address(0), "Zero staking implementation");

        DAOFactoryStorage storage $ = _getStorage();
        require(
            $.coreImplementations[versionId].daoImplementation == address(0),
            "Version exists"
        );

        $.coreImplementations[versionId] = CoreImplementation({
            daoImplementation: daoImpl,
            tokenImplementation: tokenImpl,
            treasuryImplementation: treasuryImpl,
            stakingImplementation: stakingImpl,
            initializationTemplate: initTemplate
        });

        $.availableVersions.push(versionId);
        emit CoreImplementationRegistered(versionId, daoImpl);
    }

    function registerModuleImplementation(
        IDAOModule.ModuleType moduleType,
        string calldata versionId,
        address implementation
    ) external onlyOwner {
        require(implementation != address(0), "Zero implementation");

        DAOFactoryStorage storage $ = _getStorage();
        require(
            $.moduleImplementations[moduleType][versionId].implementation == address(0),
            "Version exists"
        );

        $.moduleImplementations[moduleType][versionId] = ModuleImplementation({
            implementation: implementation
        });

        // Track version for this module type
        $.moduleVersions[moduleType].push(versionId);
        emit ModuleImplementationRegistered(
            moduleType,
            versionId,
            implementation,
            moduleTypeToString(moduleType)
        );
    }

    function createDAO(
        string calldata versionId,
        string memory name,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply
    )
        external
        returns (
            address daoAddress,
            address tokenAddress,
            address treasuryAddress,
            address stakingAddress
        )
    {
        require(_isLatestVersion(versionId), "Only latest version is active");
        // Validate token symbol length
        require(bytes(tokenSymbol).length < 7, "Symbol must be less than 7 chars");
        // Validate maximum token supply
        require(initialSupply <= 999_999_999_999 * 10**18, "Token amount exceeds maximum");
        CoreImplementation storage impl = _getStorage().coreImplementations[versionId];

        // Deploy token proxy
        bytes memory tokenInit = abi.encodeWithSelector(
            IDAOToken.initialize.selector,
            tokenName,
            tokenSymbol,
            initialSupply,
            msg.sender, // Creator gets initial tokens
            address(this), // Factory holds rest temporarily
            address(this) // Factory is initial owner
        );
        DAOTokenProxy tokenProxy = new DAOTokenProxy(
            impl.tokenImplementation,
            tokenInit
        );
        tokenAddress = address(tokenProxy);

        // Deploy treasury proxy (uninitialized)
        bytes memory emptyInit = "";
        DAOTreasuryProxy treasuryProxy = new DAOTreasuryProxy(
            impl.treasuryImplementation,
            emptyInit
        );
        treasuryAddress = address(treasuryProxy);

        // Deploy staking proxy
        bytes memory stakingInit = abi.encodeWithSelector(
            IDAOStaking.initialize.selector,
            tokenAddress
        );
        DAOStakingProxy stakingProxy = new DAOStakingProxy(
            impl.stakingImplementation,
            stakingInit
        );
        stakingAddress = address(stakingProxy);

        // Create and initialize proxy in one step
        bytes memory daoInit = abi.encodeWithSelector(
            IDAO.initialize.selector,
            name,
            treasuryAddress,
            stakingAddress,
            tokenAddress,
            address(this)
        );
        DAOProxy daoProxy = new DAOProxy(impl.daoImplementation, daoInit);
        daoAddress = address(daoProxy);

        // Initialize treasury
        IDAOTreasury(payable(treasuryAddress)).initialize(daoAddress);

        // Set staking contract in token
        IDAOToken(tokenAddress).setStakingContract(stakingAddress);

        // Transfer token ownership to DAO
        OwnableUpgradeable(tokenAddress).transferOwnership(daoAddress);

        // Transfer remaining tokens to treasury
        uint256 factoryBalance = IERC20(tokenAddress).balanceOf(address(this));
        if (factoryBalance > 0) {
            IERC20(tokenAddress).transfer(treasuryAddress, factoryBalance);
        }

        OwnableUpgradeable(daoAddress).transferOwnership(daoAddress);
        OwnableUpgradeable(stakingAddress).transferOwnership(daoAddress);

        emit DAOCreated(
            daoAddress,
            tokenAddress,
            treasuryAddress,
            stakingAddress,
            name,
            versionId
        );
    }

    function getLatestVersion() external view returns (string memory) {
        DAOFactoryStorage storage $ = _getStorage();
        uint256 length = $.availableVersions.length;
        require(length > 0, "No versions registered");
        return $.availableVersions[length - 1];
    }

    function getCoreImplementation(
        string calldata versionId
    )
        external
        view
        returns (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl
        )
    {
        CoreImplementation storage impl = _getStorage().coreImplementations[versionId];
        return (
            impl.daoImplementation,
            impl.tokenImplementation,
            impl.treasuryImplementation,
            impl.stakingImplementation
        );
    }

    function getModuleImplementation(
        IDAOModule.ModuleType moduleType,
        string calldata versionId
    ) external view returns (address implementation) {
        DAOFactoryStorage storage $ = _getStorage();
        string[] storage versions = $.moduleVersions[moduleType];
        require(versions.length > 0, "No versions for module");
        
        // Check if this is the latest version
        string memory latestVersion = versions[versions.length - 1];
        require(
            keccak256(abi.encodePacked(versionId)) == keccak256(abi.encodePacked(latestVersion)),
            "Only latest version is active"
        );
        
        return $.moduleImplementations[moduleType][versionId].implementation;
    }

    function moduleTypeToString(IDAOModule.ModuleType moduleType) public pure returns (string memory) {
        if (moduleType == IDAOModule.ModuleType.Presale) return "presale";
        if (moduleType == IDAOModule.ModuleType.Vesting) return "vesting";
        revert("Unknown module type");
    }

    function getModuleVersions(IDAOModule.ModuleType moduleType) 
        external view returns (string[] memory) {
        return _getStorage().moduleVersions[moduleType];
    }

    function getLatestModuleVersion(IDAOModule.ModuleType moduleType) 
        external view returns (string memory) {
        DAOFactoryStorage storage $ = _getStorage();
        string[] storage versions = $.moduleVersions[moduleType];
        require(versions.length > 0, "No versions for module");
        return versions[versions.length - 1];
    }

    function getAvailableVersions() external view returns (string[] memory) {
        return _getStorage().availableVersions;
    }

    function getFactoryVersion() external pure returns (string memory) {
        return FACTORY_VERSION;
    }

    // Required override for UUPS proxy
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[148] private __gap;
}
