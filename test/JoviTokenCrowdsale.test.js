const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { expect, should, assert } = require('chai');
const { ethers } = require('hardhat');
const { duration } = require('./helpers/time');

describe("Crowdsale", function() {

    const _name = "JoviToken";
    const _symbol = "JOVI";
    const _decimals = 18;

    const _rate = 500; //Number of tokens per 1 Eth
    const _cap = ethers.utils.parseEther("2", "ether");
    const investorMinCap = ethers.utils.parseEther("0.002", "ether");
    const investorMaxCap = ethers.utils.parseEther("50", "ether");
    

    async function deployFixture() {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        const ContractFactory = await ethers.getContractFactory("JoviToken");
        const contract = await ContractFactory.deploy(_name, _symbol, _decimals);
        await contract.deployed();


        const _openingTime = await time.latest()  + duration.weeks(1);
        const _closingTime = _openingTime + duration.weeks(1);

        const CrowdaleFactory = await ethers.getContractFactory("JoviTokenCrowdsale");
        const crowdsale = await CrowdaleFactory.deploy(_rate, addr1.address, contract.address, _cap, _openingTime, _closingTime);
        await crowdsale.deployed();
        
        //Add minter ownership
        await contract.addMinter(crowdsale.address);

        //Adavace time of the blockchain so that the crowdsale is open
        await time.increaseTo(_openingTime+1);

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

    describe("Capped Crowdsale", function () {
        it("should match the cap", async function () {
            const {contract, owner, crowdsale, addr2} = await loadFixture(deployFixture);
            expect(await crowdsale.cap()).to.equal(_cap);
        });
    });

    describe('Buy tokens', function() {
        describe('when the contribution is less than the min cap', function() {
            it('should reject the transaction', async function() {
                const {crowdsale, owner, addr1, addr2} = await loadFixture(deployFixture);
                await expect(
                    crowdsale.buyTokens(addr2.address, {value: investorMinCap-1})
                ).to.be.reverted
            });    
        });

        describe('when the investor has already met the min cap', function() {
            it('allow the user to contribute below the min cap', async function() {
                const {crowdsale, addr2} = await loadFixture(deployFixture);
                await expect(
                    crowdsale.buyTokens(addr2.address, {value: investorMinCap})
                ).to.be.fulfilled;

                await expect(
                    crowdsale.buyTokens(addr2.address, {value: 1}) //Buy 1 wei
                ).to.be.fulfilled;

            });
        });

        describe('when the investor total contribution has exceeds the max cap', function() {
            it('reject the transaction', async function() {
                const {crowdsale, addr2} = await loadFixture(deployFixture);
                await expect(
                    crowdsale.buyTokens(addr2.address, {value: ethers.utils.parseEther('1', 'ether')})
                ).to.be.fulfilled;

                await expect(
                    crowdsale.buyTokens(addr2.address, {value: investorMaxCap}) 
                ).to.be.rejected;

            });
        });

        describe('when the contribution is valid then it should be fullfilled', function() {
            it('Succeds and updates the contribution amount', async function() {
                const {crowdsale, addr2} = await loadFixture(deployFixture);
                const constibutionAmount = ethers.utils.parseEther("2", "ether");
                await expect(
                    crowdsale.buyTokens(addr2.address, {value: constibutionAmount})
                ).to.be.fulfilled;

               expect(await crowdsale.getUserContribution(addr2.address)).to.equal(constibutionAmount);

            });
        });
    });


});