// SPDX-License-Identifier: MIT
//   _____          ____  _____                     
//  |  __ \   /\   / __ \|  __ \                    
//  | |  | | /  \ | |  | | |__) | __ _____  ___   _ 
//  | |  | |/ /\ \| |  | |  ___/ '__/ _ \ \/ / | | |
//  | |__| / ____ \ |__| | |   | | | (_) >  <| |_| |
//  |_____/_/    \_\____/|_|   |_|  \___/_/\_\\__, |
//                                             __/ |
//                                            |___/ 
// Deployed from createDAO.org // OpenZeppelin is awesome

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

/**
 * @dev This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an
 * implementation address that can be changed. This address is stored in storage in the location specified by
 * https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn't conflict with the storage layout of the
 * implementation behind the proxy.
 */
contract DAOProxy is Proxy {
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
