// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import "hardhat/console.sol";

contract JoviToken is ERC20 {

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) public {
        console.log("New JoviToken created");
    }
}