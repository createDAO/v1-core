// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDAOStaking {
    function getVotingPower(address account) external view returns (uint256);
    function totalStaked() external view returns (uint256);
    function setExecutingProposal(bool executing) external;
}
