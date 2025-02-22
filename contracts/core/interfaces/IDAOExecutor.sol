// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./IDAOEvents.sol";

/**
 * @title IDAOExecutor
 * @dev Interface for proposal execution functionality
 */
interface IDAOExecutor is IDAOEvents {
    /**
     * @dev Executes a proposal that has passed voting
     * @param proposalId The ID of the proposal to execute
     */
    function execute(uint256 proposalId) external;

    /**
     * @dev Performs an emergency withdrawal when the DAO is paused
     * @param token The token to withdraw (address(0) for ETH)
     * @param recipient The recipient of the withdrawn funds
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) external;
}
