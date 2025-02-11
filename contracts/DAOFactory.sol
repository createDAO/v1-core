// SPDX-License-Identifier: BSL-1.1
//   _____          ____  ______         _
//  |  __ \   /\   / __ \|  ____|       | |
//  | |  | | /  \ | |  | | |__ __ _  ___| |_ ___  _ __ _   _
//  | |  | |/ /\ \| |  | |  __/ _` |/ __| __/ _ \| '__| | | |
//  | |__| / ____ \ |__| | | | (_| | (__| || (_) | |  | |_| |
//  |_____/_/    \_\____/|_|  \__,_|\___|\__\___/|_|   \__, |
//                                                      __/ |
//                                                     |___/
// deployed by createDAO.org.
// Hey! This code is for mother Earth's prosperity. Feel free to learn from it,
// but I'm tired of cheapskate copycats deploying clones to make quick cash
// without adding any value. That's why it's BSL licensed for 4 years.
// After that, it's all yours. Peace ✌️
// Diornov
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
    struct DAOImplementation {
        address daoImplementation;
        address tokenImplementation;
        address treasuryImplementation;
        address stakingImplementation;
        address presaleImplementation;
        bytes initializationTemplate;
        bool active;
    }

    /// @custom:storage-location erc7201:dao.factory.storage
    struct DAOFactoryStorage {
        mapping(string => DAOImplementation) implementations; // version -> implementations
        string[] availableVersions;
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

    event ImplementationRegistered(string versionId, address implementation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        require(_owner != address(0), "Zero owner");
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function registerImplementation(
        string calldata versionId,
        address daoImpl,
        address tokenImpl,
        address treasuryImpl,
        address stakingImpl,
        address presaleImpl,
        bytes calldata initTemplate
    ) external onlyOwner {
        require(daoImpl != address(0), "Zero DAO implementation");
        require(tokenImpl != address(0), "Zero token implementation");
        require(treasuryImpl != address(0), "Zero treasury implementation");
        require(stakingImpl != address(0), "Zero staking implementation");
        require(presaleImpl != address(0), "Zero presale implementation");

        DAOFactoryStorage storage $ = _getStorage();
        require(
            $.implementations[versionId].daoImplementation == address(0),
            "Version exists"
        );

        $.implementations[versionId] = DAOImplementation({
            daoImplementation: daoImpl,
            tokenImplementation: tokenImpl,
            treasuryImplementation: treasuryImpl,
            stakingImplementation: stakingImpl,
            presaleImplementation: presaleImpl,
            initializationTemplate: initTemplate,
            active: true
        });

        $.availableVersions.push(versionId);
        emit ImplementationRegistered(versionId, daoImpl);
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
        DAOFactoryStorage storage $ = _getStorage();
        DAOImplementation storage impl = $.implementations[versionId];
        require(impl.active, "Version not active");

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

    function getImplementation(
        string calldata versionId
    )
        external
        view
        returns (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl,
            address presaleImpl
        )
    {
        DAOImplementation storage impl = _getStorage().implementations[
            versionId
        ];
        return (
            impl.daoImplementation,
            impl.tokenImplementation,
            impl.treasuryImplementation,
            impl.stakingImplementation,
            impl.presaleImplementation
        );
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
