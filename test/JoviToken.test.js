const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect, should, assert } = require('chai');
const { ethers } = require('hardhat');

describe("Token contract", function() {

    const _name = "JoviToken";
    const _symbol = "JOVI";
    const _decimals = 18;

    async function deployTokenFixture() {
        const ContractFactory = await ethers.getContractFactory("JoviToken");
        const [owner, addr1, addr2] = await ethers.getSigners();

        const contract = await ContractFactory.deploy(_name, _symbol, _decimals);
        await contract.deployed();

        return { ContractFactory, contract, owner, addr1, addr2};
    }

    it("Should have same name", async function () {
        const {contract, owner} = await loadFixture(deployTokenFixture);
        const name = await contract.name();

        expect(name).to.equal(_name);
    });

    it("Should have same symbol", async function () {
        const {contract} = await loadFixture(deployTokenFixture);
        expect(await contract.symbol(), _symbol);
    });

    it("Should match the number of decimal places", async function () {
        const { contract } = await loadFixture(deployTokenFixture);
        expect(await contract.decimals(), _decimals);
    });

});