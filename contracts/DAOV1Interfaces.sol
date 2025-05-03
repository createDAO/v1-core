// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDAO {
    function initialize(
        string memory _name,
        address _treasury,
        address _stakingContract,
        address _token,
        address _factory
    ) external;
}

interface IDAOToken {
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialHolder,
        address treasury,
        address owner
    ) external;

    function setStakingContract(address _stakingContract) external;
}

interface IDAOTreasury {
    function initialize(address _dao) external;
}

interface IDAOStaking {
    function initialize(address _token) external;
}

interface IDAOPresale {
    function initialize(
        address token,
        address treasury,
        uint256 totalTokens,
        uint256 initialPrice
    ) external;
}

interface IDAOFactory {
    function getImplementation(string calldata version) external view returns (
        address daoImpl,
        address tokenImpl,
        address treasuryImpl,
        address stakingImpl,
        address presaleImpl
    );
}

interface IUpgradeable {
    function upgradeToAndCall(address newImplementation, bytes memory data) external;
}
