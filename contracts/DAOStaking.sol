// SPDX-License-Identifier: BSL-1.1

//   _____          ____   _____ _        _    _                _____  ____  _      
//  |  __ \   /\   / __ \ / ____| |      | |  (_)              / ____|/ __ \| |     
//  | |  | | /  \ | |  | | (___ | |_ __ _| | ___ _ __   __ _  | (___ | |  | | |     
//  | |  | |/ /\ \| |  | |\___ \| __/ _` | |/ / | '_ \ / _` |  \___ \| |  | | |     
//  | |__| / ____ \ |__| |____) | || (_| |   <| | | | | (_| |_ ____) | |__| | |____ 
//  |_____/_/    \_\____/|_____/ \__\__,_|_|\_\_|_| |_|\__, (_)_____/ \____/|______|
//                                                      __/ |                       
//                                                     |___/                        

//  deployed by createDAO.org for main DAO implementation

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
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

contract DAOStaking is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // Constants
    string private constant VERSION = "1.0.0";
    uint256 private constant MULTIPLIER_DENOMINATOR = 10000; // Base 100%

    // Core state variables
    IERC20 public token;
    uint256 public totalStaked;
    bool private _executingProposal;
    
    // Staking state
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public stakingTime;
    
    // Voting power multipliers (in basis points)
    uint256[4] public multipliers; // [1x, 1.25x, 1.5x, 2x] = [10000, 12500, 15000, 20000]
    uint256[3] public thresholds; // Time thresholds for multiplier tiers [1 week, 1 month, 3 months]
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event MultipliersUpdated(uint256[4] multipliers);
    event ThresholdsUpdated(uint256[3] thresholds);
    
    // Gap for future storage variables
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _token) external initializer {
        require(_token != address(0), "Zero token");
        
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        token = IERC20(_token);
        
        // Initialize multipliers [1x, 1.25x, 1.5x, 2x]
        multipliers[0] = 10000; // 1x
        multipliers[1] = 12500; // 1.25x
        multipliers[2] = 15000; // 1.5x
        multipliers[3] = 20000; // 2x
        
        // Initialize thresholds
        thresholds[0] = 1 weeks;
        thresholds[1] = 30 days;
        thresholds[2] = 90 days;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Zero amount");
        
        // Update staking time if first stake
        if (stakedAmount[msg.sender] == 0) {
            stakingTime[msg.sender] = block.timestamp;
        }
        
        // Transfer tokens to contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update state
        stakedAmount[msg.sender] += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(stakedAmount[msg.sender] >= amount, "Insufficient stake");
        
        // Update state
        stakedAmount[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Reset staking time if fully unstaked
        if (stakedAmount[msg.sender] == 0) {
            stakingTime[msg.sender] = 0;
        }
        
        // Transfer tokens back to user
        token.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }

    function getVotingPower(address account) public view returns (uint256) {
        uint256 staked = stakedAmount[account];
        if (staked == 0) return 0;
        
        uint256 stakeDuration = block.timestamp - stakingTime[account];
        uint256 multiplier = multipliers[0]; // Base multiplier
        
        // Apply time-based multiplier
        if (stakeDuration >= thresholds[2]) {
            multiplier = multipliers[3];
        } else if (stakeDuration >= thresholds[1]) {
            multiplier = multipliers[2];
        } else if (stakeDuration >= thresholds[0]) {
            multiplier = multipliers[1];
        }
        
        return (staked * multiplier) / MULTIPLIER_DENOMINATOR;
    }

    function updateMultipliers(uint256[4] memory _multipliers) external onlyOwner {
        require(_multipliers[0] >= 10000, "Base multiplier < 1x");
        require(_multipliers[3] <= 100000, "Max multiplier > 10x");
        require(
            _multipliers[0] <= _multipliers[1] &&
            _multipliers[1] <= _multipliers[2] &&
            _multipliers[2] <= _multipliers[3],
            "Invalid multiplier sequence"
        );
        
        multipliers = _multipliers;
        emit MultipliersUpdated(_multipliers);
    }

    function updateThresholds(uint256[3] memory _thresholds) external onlyOwner {
        require(_thresholds[2] <= 365 days, "Max threshold > 1 year");
        require(
            _thresholds[0] < _thresholds[1] &&
            _thresholds[1] < _thresholds[2],
            "Invalid threshold sequence"
        );
        
        thresholds = _thresholds;
        emit ThresholdsUpdated(_thresholds);
    }

    function version() external pure virtual returns (string memory) {
        return VERSION;
    }

    // Functions to control upgrade execution (only callable by DAO)
    function setExecutingProposal(bool executing) external onlyOwner {
        _executingProposal = executing;
    }

    // Required override for UUPS proxy
    function _authorizeUpgrade(address newImplementation) internal override {
        if (!_executingProposal) {
            // Only allow owner for direct upgrades
            _checkOwner();
        }
        // If _executingProposal is true, allow the upgrade
        // This means it's being called during proposal execution
        // which has already gone through governance checks
    }
}
