// SPDX-License-Identifier: MIT
//   _____          ____ _______                                  _____                     
//  |  __ \   /\   / __ \__   __|                                |  __ \                    
//  | |  | | /  \ | |  | | | |_ __ ___  __ _ ___ _   _ _ __ _   _| |__) | __ _____  ___   _ 
//  | |  | |/ /\ \| |  | | | | '__/ _ \/ _` / __| | | | '__| | | |  ___/ '__/ _ \ \/ / | | |
//  | |__| / ____ \ |__| | | | | |  __/ (_| \__ \ |_| | |  | |_| | |   | | | (_) >  <| |_| |
//  |_____/_/    \_\____/  |_|_|  \___|\__,_|___/\__,_|_|   \__, |_|   |_|  \___/_/\_\\__, |
//                                                           __/ |                     __/ |
//                                                          |___/                     |___/ 
// Deployed from createDAO.org // OpenZeppelin is awesome

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

contract DAOTreasuryProxy is Proxy {
    /**
     * @dev Initializes the upgradeable proxy with an initial implementation specified by `implementation`.
     * 
     * If `_data` is nonempty, it's used as data in a delegate call to `implementation`. This will typically be
     * an encoded function call, and allows initializing the storage of the proxy like a Solidity constructor.
     */
    constructor(address initialImplementation, bytes memory _data) {
        _upgradeToAndCall(initialImplementation, _data);
    }

    /**
     * @dev Returns the current implementation address.
     */
    function implementation() public view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Delegates the current call to `implementation`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _implementation() internal view virtual override returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Upgrades the proxy to a new implementation.
     * 
     * Emits an {Upgraded} event.
     */
    function _upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) internal {
        ERC1967Utils.upgradeToAndCall(newImplementation, data);
    }

    /**
     * @dev Fallback function that delegates calls to the implementation. Will run if no other
     * function in the contract matches the call data.
     */
    fallback() external payable virtual override {
        _fallback();
    }

    /**
     * @dev Fallback function that delegates calls to the implementation. Will run if call data
     * is empty.
     */
    receive() external payable virtual {
        _fallback();
    }
}
