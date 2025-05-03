// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUpgradeable {
    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;
}
