// SPDX-License-Identifier: MIT
//   _____          ____       _____  _____  ______  _____         _      ______ 
//  |  __ \   /\   / __ \     |  __ \|  __ \|  ____|/ ____|  /\   | |    |  ____|
//  | |  | | /  \ | |  | |    | |__) | |__) | |__  | (___   /  \  | |    | |__   
//  | |  | |/ /\ \| |  | |    |  ___/|  _  /|  __|  \___ \ / /\ \ | |    |  __|  
//  | |__| / ____ \ |__| |    | |    | | \ \| |____ ____) / ____ \| |____| |____ 
//  |_____/_/    \_\____/     |_|    |_|  \_\______|_____/_/    \_\______|______|
//                                                                                         
//                                                                                         
// Deployed by createDAO.org - DAO Presale Implementation
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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DAOPresale is Initializable, UUPSUpgradeable {
    address public dao;
    // Constants
    uint256 public constant TIER_MULTIPLIER = 125; // 1.25x as 125/100
    uint256 public constant TIER_COUNT = 10;
    uint256 private constant PRECISION = 1e18;

    // State variables
    IERC20 public token;
    address public treasury;
    uint256 public initialPrice;
    uint256 public tokensPerTier;
    uint256 public totalEthRaised;
    uint256 public totalEthPaidOut;
    bool public paused;

    // Events
    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    event TokensSold(
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    event PresaleEnded(uint256 totalRaised);
    event Paused(bool status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _token,
        address _treasury,
        uint256 _totalTokens,
        uint256 _initialPrice
    ) external initializer {
        require(_token != address(0), "Zero token address");
        require(_treasury != address(0), "Zero treasury address");
        require(_totalTokens > 0, "Zero tokens");
        require(_initialPrice > 0, "Zero initial price");

        __UUPSUpgradeable_init();

        dao = msg.sender;
        token = IERC20(_token);
        treasury = _treasury;
        initialPrice = _initialPrice;
        tokensPerTier = _totalTokens / TIER_COUNT;

        require(tokensPerTier > 0, "Tier size too small");
    }

    function buy(uint256 minTokensExpected, uint256 deadline) external payable {
        require(!paused, "Presale is paused");
        require(block.timestamp <= deadline, "Transaction expired");
        require(msg.value > 0, "Zero ETH sent");

        uint256 tokens = calculatePurchaseAcrossTiers(msg.value);
        require(tokens >= minTokensExpected, "Slippage too high");
        require(tokens <= token.balanceOf(address(this)), "Not enough tokens");

        totalEthRaised += msg.value;

        // Transfer tokens to buyer
        require(token.transfer(msg.sender, tokens), "Token transfer failed");

        emit TokensPurchased(msg.sender, msg.value, tokens);

        // Check if presale ended
        if (token.balanceOf(address(this)) == 0) {
            emit PresaleEnded(totalEthRaised);
        }
    }

    function sell(
        uint256 tokenAmount,
        uint256 minEthExpected,
        uint256 deadline
    ) external {
        require(!paused, "Presale is paused");
        require(block.timestamp <= deadline, "Transaction expired");
        require(tokenAmount > 0, "Zero tokens");

        uint256 ethOut = calculateSellReturn(tokenAmount);
        require(ethOut >= minEthExpected, "Slippage too high");
        require(address(this).balance >= ethOut, "Insufficient ETH balance");

        // Transfer tokens from seller
        require(
            token.transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );

        // Track ETH paid out
        totalEthPaidOut += ethOut;

        // Transfer ETH to seller
        (bool success, ) = payable(msg.sender).call{value: ethOut}("");
        require(success, "ETH transfer failed");

        emit TokensSold(msg.sender, tokenAmount, ethOut);
    }

    function calculatePurchaseAcrossTiers(
        uint256 ethAmount
    ) public view returns (uint256) {
        uint256 remainingEth = ethAmount;
        uint256 totalTokens = 0;
        uint256 currentTierTokens = getRemainingInCurrentTier();
        uint256 price = getCurrentPrice();
        uint256 maxTokens = tokensPerTier * TIER_COUNT;

        while (remainingEth > 0 && currentTierTokens > 0) {
            uint256 tokensAtCurrentPrice = (remainingEth * PRECISION) / price;

            if (tokensAtCurrentPrice > currentTierTokens) {
                totalTokens += currentTierTokens;
                if (totalTokens > maxTokens) {
                    totalTokens = maxTokens;
                    break;
                }
                remainingEth -= (currentTierTokens * price) / PRECISION;
                price = (price * TIER_MULTIPLIER) / 100;
                currentTierTokens = tokensPerTier;
            } else {
                totalTokens += tokensAtCurrentPrice;
                if (totalTokens > maxTokens) {
                    totalTokens = maxTokens;
                    break;
                }
                break;
            }
        }
        return totalTokens;
    }

function calculateSellReturn(uint256 tokenAmount) public view returns (uint256) {
    uint256 tokensSold = getTokensSold();
    
    // If attempting to sell more than have been sold, revert
    if (tokenAmount > tokensSold) {
        revert("Cannot sell more than have been purchased");
    }
    
    uint256 remainingTokens = tokenAmount;
    uint256 totalEth = 0;
    
    // Starting tier and position within that tier
    uint256 currentTier = tokensSold / tokensPerTier;
    uint256 positionInTier = tokensSold % tokensPerTier;
    
    while (remainingTokens > 0) {
        // Calculate price for current tier
        uint256 price = (initialPrice * (TIER_MULTIPLIER ** currentTier)) / (100 ** currentTier);
        
        // How many tokens can be sold in the current tier
        uint256 tokensInCurrentTier = positionInTier;
        
        if (remainingTokens <= tokensInCurrentTier) {
            // All remaining tokens can be sold in current tier
            uint256 ethForTier = (remainingTokens * price) / PRECISION;
            totalEth += ethForTier;
            break;
        } else {
            // Sell what we can in the current tier
            uint256 ethForTier = (tokensInCurrentTier * price) / PRECISION;
            totalEth += ethForTier;
            remainingTokens -= tokensInCurrentTier;
            
            // Move to previous tier if possible
            if (currentTier > 0) {
                currentTier--;
                positionInTier = tokensPerTier; // Full tier
            } else {
                // We've gone through all tiers
                break;
            }
        }
    }
    
    return totalEth;
}

    function getCurrentTier() public view returns (uint256) {
        uint256 tokensSold = getTokensSold();
        return tokensSold / tokensPerTier;
    }

    function getCurrentPrice() public view returns (uint256) {
        uint256 tier = getCurrentTier();
        return (initialPrice * (TIER_MULTIPLIER ** tier)) / (100 ** tier);
    }

    function getRemainingInCurrentTier() public view returns (uint256) {
        uint256 tokensSold = getTokensSold();
        uint256 soldInCurrentTier = tokensSold % tokensPerTier;
        return tokensPerTier - soldInCurrentTier;
    }

    function getTokensSold() public view returns (uint256) {
        uint256 initialTokens = tokensPerTier * TIER_COUNT;
        return initialTokens - token.balanceOf(address(this));
    }

    function quoteTokensForExactETH(
        uint256 ethAmount
    )
        external
        view
        returns (
            uint256 tokensReceived,
            uint256[] memory pricesPerTier,
            uint256[] memory tokensPerTierBought
        )
    {
        tokensReceived = calculatePurchaseAcrossTiers(ethAmount);

        uint256 remainingEth = ethAmount;
        uint256 currentTier = getCurrentTier();

        pricesPerTier = new uint256[](TIER_COUNT - currentTier);
        tokensPerTierBought = new uint256[](TIER_COUNT - currentTier);

        uint256 price = getCurrentPrice();
        uint256 remaining = getRemainingInCurrentTier();

        for (uint i = 0; i < pricesPerTier.length && remainingEth > 0; i++) {
            pricesPerTier[i] = price;

            uint256 tokensAtCurrentPrice = (remainingEth * PRECISION) / price;
            if (tokensAtCurrentPrice > remaining) {
                tokensPerTierBought[i] = remaining;
                remainingEth -= (remaining * price) / PRECISION;
                price = (price * TIER_MULTIPLIER) / 100;
                remaining = tokensPerTier;
            } else {
                tokensPerTierBought[i] = tokensAtCurrentPrice;
                break;
            }
        }

        return (tokensReceived, pricesPerTier, tokensPerTierBought);
    }

function quoteETHForExactTokens(
    uint256 tokenAmount
) external view returns (uint256 ethReceived, uint256 currentTierPrice) {
    currentTierPrice = getCurrentPrice();
    ethReceived = calculateSellReturn(tokenAmount);
    return (ethReceived, currentTierPrice);
}

    function getPresaleState()
        external
        view
        returns (
            uint256 currentTier,
            uint256 currentPrice,
            uint256 remainingInTier,
            uint256 totalRemaining,
            uint256 totalRaised
        )
    {
        currentTier = getCurrentTier();
        currentPrice = getCurrentPrice();
        remainingInTier = getRemainingInCurrentTier();
        totalRemaining = token.balanceOf(address(this));
        
        // Calculate net ETH raised (total raised minus total paid out)
        totalRaised = totalEthRaised - totalEthPaidOut;
        
        return (
            currentTier,
            currentPrice,
            remainingInTier,
            totalRemaining,
            totalRaised
        );
    }

    function withdrawToTreasury() external {
        require(msg.sender == dao, "Only DAO");
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool success, ) = payable(treasury).call{value: ethBalance}("");
            require(success, "ETH transfer failed");
        }

        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance > 0) {
            require(
                token.transfer(treasury, tokenBalance),
                "Token transfer failed"
            );
        }
    }

    function setPaused(bool _paused) external {
        require(msg.sender == dao, "Only DAO");
        paused = _paused;
        emit Paused(_paused);
    }

    function _authorizeUpgrade(
        address
    ) internal override view {
        require(msg.sender == dao, "Only DAO");
    }

    receive() external payable {}
}
