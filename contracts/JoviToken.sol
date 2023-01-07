// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol"; 
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol"; 
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol"; 

contract JoviToken is ERC20Mintable, ERC20Pausable, ERC20Detailed {

    constructor(string memory name_, string memory symbol_, uint8 decimals) ERC20Detailed(name_, symbol_, decimals) public {
    }
}