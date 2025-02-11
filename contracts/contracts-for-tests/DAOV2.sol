// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "../DAO.sol";

contract DAOV2 is DAO {
    string private constant VERSION = "2.0.0";

    function version() external pure override returns (string memory) {
        return VERSION;
    }
}
