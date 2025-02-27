// SPDX-License-Identifier: BSL-1.1
//   _____          ____       _______ ____  _  ________ _   _ 
//  |  __ \   /\   / __ \     |__   __/ __ \| |/ /  ____| \ | |
//  | |  | | /  \ | |  | |       | | | |  | | ' /| |__  |  \| |
//  | |  | |/ /\ \| |  | |       | | | |  | |  < |  __| | . ` |
//  | |__| / ____ \ |__| |       | | | |__| | . \| |____| |\  |
//  |_____/_/    \_\____/        |_|  \____/|_|\_\______|_| \_| 
//                                                                                         
//                                                                                         
//  deployed by createDAO.org for main DAO token implementation
//
// Hey there! 🌍 This code is dedicated to building a better, greener future. 
// Feel free to study and learn from it. But hey, no lazy copy-paste clones for 
// quick profit without real innovation, okay? That's why it's licensed under 
// the Business Source License 1.1 (BUSL-1.1) for 4 years.
// After that, it’s open for everyone. Build something meaningful. ✌️
// — Diornov
//
//
//
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract DAOToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // Constants
    string private constant VERSION = "1.0.0";
    uint16 private constant MAX_TAX = 1000; // 10% in basis points
    
    // State variables
    address public stakingContract;
    address public taxRecipient;
    uint16 public taxRate; // In basis points (1 = 0.01%)
    mapping(address => bool) public isWhitelisted;
    
    // Events
    event StakingContractSet(address indexed stakingContract);
    event TaxRateUpdated(uint16 newRate);
    event TaxRecipientUpdated(address indexed newRecipient);
    event WhitelistUpdated(address[] accounts, bool status);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialHolder,
        address treasury,
        address owner
    ) external initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        require(initialHolder != address(0), "Zero holder");
        require(treasury != address(0), "Zero treasury");
        
        // Mint initial supply
        _mint(initialHolder, 1e18); // 1 token for initial holder
        _mint(treasury, initialSupply - 1e18); // Rest to treasury
        
        // Initialize tax settings
        taxRate = 0; // 1% default tax
        taxRecipient = treasury;
        
        // Whitelist important addresses
        isWhitelisted[treasury] = true;
        isWhitelisted[initialHolder] = true;
    }
    
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Zero staking");
        stakingContract = _stakingContract;
        isWhitelisted[_stakingContract] = true;
        emit StakingContractSet(_stakingContract);
    }
    
    function setTaxRate(uint16 newRate) external onlyOwner {
        require(newRate <= MAX_TAX, "Rate > 10%");
        taxRate = newRate;
        emit TaxRateUpdated(newRate);
    }
    
    function setTaxRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Zero recipient");
        taxRecipient = newRecipient;
        emit TaxRecipientUpdated(newRecipient);
    }
    
    function updateWhitelist(address[] calldata accounts, bool status) external onlyOwner {
        for(uint i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Zero address");
            isWhitelisted[accounts[i]] = status;
        }
        emit WhitelistUpdated(accounts, status);
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function version() external pure virtual returns (string memory) {
        return VERSION;
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (
            taxRate > 0 && // Tax is enabled
            !isWhitelisted[from] && // Sender not whitelisted
            !isWhitelisted[to] && // Recipient not whitelisted
            from != address(0) && // Not minting
            to != address(0) // Not burning
        ) {
            uint256 taxAmount = (amount * taxRate) / 10000;
            super._update(from, taxRecipient, taxAmount);
            super._update(from, to, amount - taxAmount);
        } else {
            super._update(from, to, amount);
        }
    }
}
