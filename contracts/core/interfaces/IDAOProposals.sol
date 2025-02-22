// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./IDAOBase.sol";
import "./IDAOModule.sol";
import "./IDAOEvents.sol";

/**
 * @title IDAOProposals
 * @dev Interface for proposal creation and voting functionality
 */
interface IDAOProposals is IDAOBase, IDAOEvents {
    function proposeTransfer(
        address token,
        address recipient,
        uint256 amount
    ) external returns (uint256);

    function proposeUpgrade(string calldata newVersion) external returns (uint256);

    function proposeModuleUpgrade(
        IDAOModule.ModuleType moduleType,
        address moduleAddress,
        string calldata newVersion
    ) external returns (uint256);

    function proposePresale(
        uint256 tokenAmount,
        uint256 initialPrice
    ) external returns (uint256);

    function proposePresalePause(
        address presaleContract,
        bool pause
    ) external returns (uint256);

    function proposePresaleWithdraw(
        address presaleContract
    ) external returns (uint256);

    function proposePause() external returns (uint256);

    function proposeUnpause() external returns (uint256);

    function vote(uint256 proposalId, bool support) external;

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            ProposalType proposalType,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 endTime,
            bool executed
        );

    function getTransferData(uint256 proposalId)
        external
        view
        returns (address token, address recipient, uint256 amount);

    function getUpgradeData(uint256 proposalId)
        external
        view
        returns (address[] memory newImplementations, string memory newVersion);

    function getModuleUpgradeData(uint256 proposalId)
        external
        view
        returns (
            IDAOModule.ModuleType moduleType,
            address moduleAddress,
            string memory newVersion
        );

    function getPresaleData(uint256 proposalId)
        external
        view
        returns (address token, uint256 amount, uint256 initialPrice);

    function getPresalePauseData(uint256 proposalId)
        external
        view
        returns (address presaleContract, bool pause);

    function getPresaleWithdrawData(uint256 proposalId)
        external
        view
        returns (address presaleContract);
}
