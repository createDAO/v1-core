// SPDX-License-Identifier: MIT
/**
*
*  _____  ______          _____      __  __ ______ 
* |  __ \|  ____|   /\   |  __ \    |  \/  |  ____|
* | |__) | |__     /  \  | |  | |   | \  / | |__   
* |  _  /|  __|   / /\ \ | |  | |   | |\/| |  __|  
* | | \ \| |____ / ____ \| |__| |   | |  | | |____ 
* |_|  \_\______/_/    \_\_____/    |_|  |_|______|
*                                                  
*                                                  
*
* Thank you for reviewing the source code of this contract! The fact that you're doing your own research (DYOR) is great.  
*  
* This is a Proxy contract, developed using OpenZeppelin’s robust and battle-tested framework and deployed by CreateDAO.  
*  
* We understand that proxy contracts can sometimes raise concerns - after all, they allow the contract logic to be upgraded.  
* However, this is not a vulnerability but rather a necessary feature that ensures CreateDAO can fix bugs, enhance security,  
* and introduce new features without requiring users to migrate to a new contract manually.  
*  
* But does this mean a single person can arbitrarily change the DAO's smart contracts? Absolutely not.  
* The upgrade process is fully governed by the DAO itself. Here’s how it works:  
*  
* 1. Any upgrade must first be proposed through a DAO governance proposal.  
* 2. The proposal undergoes a mandatory 3-day voting period, allowing all DAO members to review and cast their votes.  
* 3. Only if the proposal is approved by the majority of voters can the upgrade be executed.  
*  
* Furthermore, DAO contracts cannot be upgraded arbitrarily. Upgrades can only apply to new contract versions  
* that have been explicitly registered in the DAOFactory. This ensures that all upgrades follow a transparent  
* and pre-approved process.  
*  
* In short, proxy contracts are not a risk in this context - they are a necessary tool for ensuring  
* long-term security, flexibility, and governance-driven improvements. 
*  
* ---  
*  
* How to verify the actual implementation behind this proxy?  
* 1. Go to the **Read Contract** tab.  
* 2. Click on **Implementation** to reveal the current implementation address.  
* 3. Click on the address, and when it opens, navigate to the **Contract** tab, just as you did with this proxy.  
*  
* This will allow you to review the real source code running behind this project!
*
* Join the discussion here https://t.me/CreateDAO_org
* Our GitHub https://github.com/createdao
* — Diornov 
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
}
