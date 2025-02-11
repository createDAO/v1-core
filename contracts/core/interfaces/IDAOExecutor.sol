// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./IDAOBase.sol";

interface IDAOExecutor is IDAOBase {
    function execute(uint256 proposalId) external;
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount
    ) external;
}
