// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

interface IDAOBase {
    enum UpgradeableContract {
        DAO,
        Token,
        Treasury,
        Staking
    }

    enum ProposalType {
        Transfer,
        Upgrade,
        ModuleUpgrade,  // New type for module upgrades
        Presale,
        PresalePause,
        PresaleWithdraw,
        Pause,
        Unpause
    }

    function name() external view returns (string memory);
    function factory() external view returns (address);
    function upgradeableContracts(UpgradeableContract) external view returns (address);
    function proposalCount() external view returns (uint256);
    function votingPeriod() external view returns (uint256);
    function minProposalStake() external view returns (uint256);
    function quorum() external view returns (uint256);
    function paused() external view returns (bool);
}
