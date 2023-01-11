<a name="readme-top"></a>

## JoviToken Smart Contracts

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Jovian-Dsouza/JoviTokenIco-contracts">
    <img src="images/joviToken-logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">JoviToken</h3>

  <p align="center">
    Checkout my new JoviToken built with Ethereum blockchain!
    <br />
    <a href="https://jovitokenico.joviandsouza.repl.co/">View Demo</a>
    ·
    <a href="https://github.com/Jovian-Dsouza/JoviTokenIco-contracts/issues">Report Bug</a>
    ·
    <a href="https://github.com/Jovian-Dsouza/JoviTokenIco-contracts/issues">Request Feature</a>
  </p>
</div>


<!-- ABOUT THE PROJECT -->
## About The Project

[![JoviToken](images/screenshot.png)](https://jovitokenico.joviandsouza.repl.co/)

JoviToken is an ERC20 based token currently deployed on the Ethereum Goerli testnetwork. This token is for learning purposes only. ERC-20 is the technical standard for fungible tokens created using the Ethereum blockchain. A fungible token is one that is interchangeable with another token. This repo includes the Smart Contract files for the Presale and Initial Coin Offering (ICO) for JoviToken. This also includes the unit testing files for the solidity smart contracts.

For ICO Website 💻 implementation follow [JoviTokenIco-contracts](https://github.com/Jovian-Dsouza/JoviTokenICO)

Here are some cool features of this crowdsale:

* Minted Crowdsale : Instead of having  a fixed supply the tokens are minted according to the total purchase
* Capped Crowdsale : adds a cap to your crowdsale, invalidating any purchases that would exceed that cap
* Individually Capped Crowdsale : Caps an individual's contributions
* Timed Crowdale : Allows buying of token in a certain time interval only
* Refundable Crowdale : Refunds the buyer if the Goal is not reached
* Token Time Vesting and Token Distribution
* Testcases to make sure that the smart contract is working correctly



<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* Solidity
* OpenZeppelin
* Hardhat
* Mocha testing framework
* Chai


<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* npm
  ```sh
  npm install npm@latest -g
  ```
* hardhat
  ```sh
  npm install --save-dev hardhat
  ```

### Installation

1. Creat a free QuickNode Endpoint at https://www.quicknode.com/endpoints
2. Clone the repo
   ```sh
   git clone https://github.com/Jovian-Dsouza/JoviTokenIco-contracts
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. create a `.env` file in project root directory and copy 
    ```Properties
    QUICK_NODE_URL=ENTER_YOUR_QUICKNODE_HTTP_ENDPOINT
    GOERLI_PRIVATE_KEY=ENTER_WALLET_PRIVATE_KEY
    ```

### Run Smart contract tests 
```sh
npx hardhat test
```

### Local Deployment
```sh
npx hardhat node
npx hardhat run scripts/deploy.js 
```

### Testnet Deployment - Goerli
```sh
npx hardhat run scripts/deploy.js --network goerli
```


<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Your Name - [@DsouzaJovian](https://twitter.com/DsouzaJovian) - dsouzajovian123@gmail.com

Project Link: [https://github.com/Jovian-Dsouza/JoviTokenIco-contracts](https://github.com/Jovian-Dsouza/JoviTokenIco-contracts)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
