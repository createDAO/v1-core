// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../DAOTreasury.sol";

contract DAOTreasuryV2 is DAOTreasury {
    string private constant VERSION = "2.0.0";

    function version() external pure override returns (string memory) {
        return VERSION;
    }
}
