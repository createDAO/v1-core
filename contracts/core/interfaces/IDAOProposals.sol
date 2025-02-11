// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import "./IDAOBase.sol";

interface IDAOProposals is IDAOBase {
    function proposeTransfer(
        address token,
        address recipient,
        uint256 amount
    ) external returns (uint256);

    function proposePresale(
        uint256 tokenAmount,
        uint256 initialPrice
    ) external returns (uint256);

    function proposeUpgrade(
        UpgradeableContract contractType,
        string calldata newVersion
    ) external returns (uint256);

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
        returns (
            UpgradeableContract contractToUpgrade,
            address newImplementation,
            string memory newVersion
        );

    function getPresaleData(uint256 proposalId)
        external
        view
        returns (
            address token,
            uint256 amount,
            uint256 initialPrice
        );

    function proposePresalePause(
        address presaleContract,
        bool pause
    ) external returns (uint256);

    function proposePresaleWithdraw(
        address presaleContract
    ) external returns (uint256);

    function getPresalePauseData(uint256 proposalId)
        external
        view
        returns (
            address presaleContract,
            bool pause
        );

    function getPresaleWithdrawData(uint256 proposalId)
        external
        view
        returns (address presaleContract);

    function proposePause() external returns (uint256);
    function proposeUnpause() external returns (uint256);
}
