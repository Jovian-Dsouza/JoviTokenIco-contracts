require('babel-register');
require('babel-polyfill');
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.5.0",
  networks: {
    goerli: {
      url: process.env.QUICK_NODE_URL,
      accounts: [
                  process.env.GOERLI_PRIVATE_KEY
                ]
    },
  },
};
