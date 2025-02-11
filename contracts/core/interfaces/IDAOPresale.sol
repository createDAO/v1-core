// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

interface IDAOPresale {
    function initialize(
        address token,
        address treasury,
        uint256 totalTokens,
        uint256 initialPrice
    ) external;

    function setPaused(bool _paused) external;
    function withdrawToTreasury() external;
    function paused() external view returns (bool);
    function getPresaleState() external view returns (
        uint256 currentTier,
        uint256 currentPrice,
        uint256 remainingInTier,
        uint256 totalRemaining,
        uint256 totalRaised
    );
}
