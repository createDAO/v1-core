// SPDX-License-Identifier: MIT
/**
   _____          ____  ______         _                   _____                     
 |  __ \   /\   / __ \|  ____|       | |                 |  __ \                    
 | |  | | /  \ | |  | | |__ __ _  ___| |_ ___  _ __ _   _| |__) | __ _____  ___   _ 
 | |  | |/ /\ \| |  | |  __/ _` |/ __| __/ _ \| '__| | | |  ___/ '__/ _ \ \/ / | | |
 | |__| / ____ \ |__| | | | (_| | (__| || (_) | |  | |_| | |   | | | (_) >  <| |_| |
 |_____/_/    \_\____/|_|  \__,_|\___|\__\___/|_|   \__, |_|   |_|  \___/_/\_\\__, |
                                                     __/ |                     __/ |
                                                    |___/                     |___/ 
 deployed by createDAO.org.                                                       
                                                   
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

contract DAOFactoryProxy is Proxy {
    constructor(address initialImplementation, bytes memory _data) {
        _upgradeToAndCall(initialImplementation, _data);
    }

    function implementation() public view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    function _implementation() internal view virtual override returns (address) {
        return ERC1967Utils.getImplementation();
    }

    function _upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) internal {
        ERC1967Utils.upgradeToAndCall(newImplementation, data);
    }

    fallback() external payable virtual override {
        _fallback();
    }

    receive() external payable virtual {
        _fallback();
    }
}
