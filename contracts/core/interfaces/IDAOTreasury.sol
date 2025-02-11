// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

interface IDAOTreasury {
    function transferETH(address payable recipient, uint256 amount) external;
    function transferERC20(
        address token,
        address recipient,
        uint256 amount
    ) external;
}
