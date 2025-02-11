// SPDX-License-Identifier: BSL-1.1

//   _____          ____ _______                                              _ 
//  |  __ \   /\   / __ \__   __|                                            | |
//  | |  | | /  \ | |  | | | |_ __ ___  __ _ ___ _   _ _ __ _   _   ___  ___ | |
//  | |  | |/ /\ \| |  | | | | '__/ _ \/ _` / __| | | | '__| | | | / __|/ _ \| |
//  | |__| / ____ \ |__| | | | | |  __/ (_| \__ \ |_| | |  | |_| |_\__ \ (_) | |
//  |_____/_/    \_\____/  |_|_|  \___|\__,_|___/\__,_|_|   \__, (_)___/\___/|_|
//                                                           __/ |              
//                                                          |___/    

//  deployed by createDAO.org for main DAO implementation

// Hey! This code is for mother Earth's prosperity. Feel free to learn from it,
// but I'm tired of cheapskate copycats deploying clones to make quick cash
// without adding any value. That's why it's BSL licensed for 4 years.
// After that, it's all yours. Peace ✌️
// Diornov
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract DAOTreasury is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // Constants
    string private constant VERSION = "1.0.0";

    address public dao;
    
    event ETHTransferred(address indexed recipient, uint256 amount);
    event ERC20Transferred(address indexed token, address indexed recipient, uint256 amount);
    
    modifier onlyDAO() {
        require(msg.sender == dao, "Only DAO");
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _dao) external initializer {
        require(_dao != address(0), "Zero address");
        __Ownable_init(_dao);
        __UUPSUpgradeable_init();
        dao = _dao;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function version() external pure returns (string memory) {
        return VERSION;
    }
    
    receive() external payable {}
    
    function transferETH(address payable recipient, uint256 amount) external onlyDAO {
        require(recipient != address(0), "Zero recipient");
        require(amount > 0, "Zero amount");
        require(address(this).balance >= amount, "Insufficient ETH");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit ETHTransferred(recipient, amount);
    }
    
    function transferERC20(address token, address recipient, uint256 amount) external onlyDAO {
        require(token != address(0), "Zero token");
        require(recipient != address(0), "Zero recipient");
        require(amount > 0, "Zero amount");
        
        IERC20(token).safeTransfer(recipient, amount);
        
        emit ERC20Transferred(token, recipient, amount);
    }
    
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getERC20Balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
