const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect, should, assert } = require('chai');
const { ethers } = require('hardhat');

describe("Crowdsale", function() {

    const _name = "JoviToken";
    const _symbol = "JOVI";
    const _decimals = 18;

    const _rate = 500; //Number of tokens per 1 Eth

    async function deployFixture() {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        const ContractFactory = await ethers.getContractFactory("JoviToken");
        const contract = await ContractFactory.deploy(_name, _symbol, _decimals);
        await contract.deployed();


        const CrowdaleFactory = await ethers.getContractFactory("JoviTokenCrowdsale");
        const crowdsale = await CrowdaleFactory.deploy(_rate, addr1.address, contract.address);
        await crowdsale.deployed();
        
        //Add minter ownership
        await contract.addMinter(crowdsale.address);

        return { contract, crowdsale, owner, addr1, addr2};

    }

    it("Should match the token", async function () {
        const { contract, crowdsale, addr1} = await loadFixture(deployFixture);
        expect(await crowdsale.token()).to.equal(contract.address);
    });

    it("Should match the rate", async function () {
        const { contract, crowdsale, addr1} = await loadFixture(deployFixture);
        expect(await crowdsale.rate()).to.equal(_rate);
    });

    it("Should match the wallet", async function () {
        const { contract, crowdsale, addr1} = await loadFixture(deployFixture);
        expect(await crowdsale.wallet()).to.equal(addr1.address);
    });


    describe('accepting payments', function() {

        it('should accept payments', async function() {
            const {contract, owner, crowdsale, addr2} = await loadFixture(deployFixture);
            let ethersToWei = ethers.utils.parseUnits("1", "ether");
            await expect(
                crowdsale.buyTokens(addr2.address, {value: ethersToWei})
            ).to.emit(crowdsale, "TokensPurchased");
        });

    });

    describe('minted crowdsale', function() {
        it('mints tokens after purchase', async function() {
            const {contract, owner, crowdsale, addr2} = await loadFixture(deployFixture);
            const originalTS = await contract.totalSupply();

            let ethersToWei = ethers.utils.parseUnits("1", "ether");
            await expect(
                crowdsale.buyTokens(addr2.address, {value: ethersToWei})
            ).to.emit(crowdsale, "TokensPurchased");

            const newTS = await contract.totalSupply();
            assert.isTrue(newTS > originalTS);

        })
    });

});