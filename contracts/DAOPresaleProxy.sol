// SPDX-License-Identifier: MIT
// OpenZeppelin is AWESOME!

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DAOPresaleProxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory _data
    ) ERC1967Proxy(implementation, _data) {}
}
