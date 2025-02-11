// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

interface IDAOToken {
    function updateWhitelist(address[] memory accounts, bool status) external;
}
