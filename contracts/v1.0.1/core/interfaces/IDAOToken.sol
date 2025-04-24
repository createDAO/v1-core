// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDAOToken {
    function updateWhitelist(address[] memory accounts, bool status) external;
}
