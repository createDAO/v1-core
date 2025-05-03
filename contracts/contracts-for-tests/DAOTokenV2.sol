// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../DAOToken.sol";

contract DAOTokenV2 is DAOToken {
    string private constant VERSION = "2.0.0";

    function version() external pure override returns (string memory) {
        return VERSION;
    }
}
