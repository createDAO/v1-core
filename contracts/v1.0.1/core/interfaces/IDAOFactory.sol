// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IDAOModule.sol";

interface IDAOFactory {
    function getCoreImplementation(string calldata version)
        external
        view
        returns (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl
        );

    function getModuleImplementation(
        IDAOModule.ModuleType moduleType,
        string calldata version
    ) external view returns (address implementation);

    function getModuleVersions(IDAOModule.ModuleType moduleType) 
        external view returns (string[] memory);

    function getLatestModuleVersion(IDAOModule.ModuleType moduleType) 
        external view returns (string memory);

    function getAvailableVersions() external view returns (string[] memory);
}
