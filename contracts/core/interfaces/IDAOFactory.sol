// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

interface IDAOFactory {
    function getImplementation(string calldata version)
        external
        view
        returns (
            address daoImpl,
            address tokenImpl,
            address treasuryImpl,
            address stakingImpl,
            address presaleImpl
        );
}
