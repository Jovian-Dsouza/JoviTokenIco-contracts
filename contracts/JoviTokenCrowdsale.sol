// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.5.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol"; 

contract JoviTokenCrowdsale is Crowdsale, MintedCrowdsale {

    constructor(uint256 rate, address payable wallet, IERC20 token) Crowdsale(rate, wallet, token) public {
        
    }

}