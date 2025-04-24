// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IDAOBase.sol";
import "./storage/CoreStorage.sol";
import "./storage/ProposalStorage.sol";

/**
 * @dev Base implementation contract that provides storage and basic functionality
 * This contract uses ERC-7201 namespaced storage pattern for better storage management
 * and safer upgrades
 */
abstract contract DAOStorage is Initializable, UUPSUpgradeable, OwnableUpgradeable, IDAOBase {
    using CoreStorage for CoreStorage.Layout;
    using ProposalStorage for ProposalStorage.Layout;

    // Constants (don't use storage)
    string internal constant VERSION = "1.0.0";

    function _getCore() internal pure returns (CoreStorage.Layout storage) {
        return CoreStorage.layout();
    }

    function _getProposals() internal pure returns (ProposalStorage.Layout storage) {
        return ProposalStorage.layout();
    }

    // Required override for UUPS proxy - implementation in DAO.sol
    function _authorizeUpgrade(address newImplementation) internal virtual override {}

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
}
