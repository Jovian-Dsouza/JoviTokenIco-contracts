const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { expect, should, assert } = require('chai');
const { ethers } = require('hardhat');
const { duration } = require('./helpers/time');

describe("Crowdsale", function() {

    const _name = "JoviToken";
    const _symbol = "JOVI";
    const _decimals = 18;

    const _rate = 500; //Number of tokens per 1 Eth
    const _cap = ethers.utils.parseEther("100", "ether");
    const _goal = ethers.utils.parseEther("50", "ether");
    const investorMinCap = ethers.utils.parseEther("0.002", "ether");
    const investorMaxCap = ethers.utils.parseEther("50", "ether");
    
    const stagePreICO = 0;
    const ratePreICO = _rate;
    const stageICO = 1;
    const rateICO = 250;

    let _openingTime, _closingTime;

    async function deployFixture() {
        const [owner, wallet, addr1, addr2] = await ethers.getSigners();
        
        const ContractFactory = await ethers.getContractFactory("JoviToken");
        const contract = await ContractFactory.deploy(_name, _symbol, _decimals);
        await contract.deployed();


        _openingTime = await time.latest()  + duration.weeks(1);
        _closingTime = _openingTime + duration.weeks(1);

        const CrowdaleFactory = await ethers.getContractFactory("JoviTokenCrowdsale");
        const crowdsale = await CrowdaleFactory.deploy(_rate, wallet.address, contract.address, _cap, _goal, _openingTime, _closingTime);
        await crowdsale.deployed();
        
        // Pause the token
        await contract.pause();

        //Add Pauser role 
        await contract.addPauser(crowdsale.address);

        //Add minter ownership
        await contract.addMinter(crowdsale.address);

        //Adavace time of the blockchain so that the crowdsale is open
        await time.increaseTo(_openingTime+1);


        return { contract, crowdsale, owner, wallet, addr1, addr2};

    }

    it("Should match the token", async function () {
        const { contract, crowdsale} = await loadFixture(deployFixture);
        expect(await crowdsale.token()).to.equal(contract.address);
    });

    it("Should match the rate", async function () {
        const { crowdsale} = await loadFixture(deployFixture);
        expect(await crowdsale.rate()).to.equal(_rate);
    });

    it("Should match the wallet", async function () {
        const { crowdsale, wallet} = await loadFixture(deployFixture);
        expect(await crowdsale.wallet()).to.equal(wallet.address);
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

    describe('crowdsale stages', function() {
        it('should start with default preICO stage', async function() {
            const {crowdsale} = await loadFixture(deployFixture);
            expect(await crowdsale.stage()).to.equal(stagePreICO);
        });

        it('Should start with default preICO rate', async function() {
            const {crowdsale} = await loadFixture(deployFixture);
            expect(await crowdsale.rate()).to.equal(ratePreICO);
        });

        it('Allow the admin to update stage', async function() {
            const {crowdsale, owner} = await loadFixture(deployFixture);
            await expect(
                crowdsale.setCrowdsaleStage(stageICO, {from: owner.address})
            ).to.be.fulfilled;
        });

        it("Rate should change when stage in ICO", async function() {
            const {crowdsale, owner} = await loadFixture(deployFixture);
            await crowdsale.setCrowdsaleStage(stageICO, {from: owner.address});
            expect(await crowdsale.rate()).to.equal(rateICO);
        });

        it('Reject the non-admin to update stage', async function() {
            const {crowdsale, owner, addr2} = await loadFixture(deployFixture);
            await expect(
                crowdsale.setCrowdsaleStage(stageICO, {from: addr2.address})
            ).to.be.rejected;
        });
        
        describe("when the crowdsale is in PreICO stage", function() {
            it('forward funds to the wallet', async function() {
                const {crowdsale, owner, wallet, addr2} = await loadFixture(deployFixture);
                const initialBalance = await ethers.provider.getBalance(wallet.address);
                const value = ethers.utils.parseEther('1', 'ether')
                await crowdsale.buyTokens(addr2.address, {value: value});
                const finalBalance = await ethers.provider.getBalance(wallet.address);
                expect(finalBalance).to.equal(initialBalance.add(value));
            })
        });

        describe("when the crowdsale is in ICO stage", function() {
            it('forward funds to the wallet', async function() {
                const {crowdsale, owner, wallet, addr2} = await loadFixture(deployFixture);
                const initialBalance = await ethers.provider.getBalance(wallet.address);
                
                await crowdsale.setCrowdsaleStage(stageICO, {from: owner.address});
                const value = ethers.utils.parseEther('1', 'ether')
                await crowdsale.buyTokens(addr2.address, {value: value});

                const finalBalance = await ethers.provider.getBalance(wallet.address);
                expect(finalBalance).to.equal(initialBalance);
            })
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

    describe("Refundable crowdsale", function() {
        it("prevents the investor from claiming refund", async function() {
            const { crowdsale, addr2 } = await loadFixture(deployFixture);
            await crowdsale.buyTokens(addr2.address, {value: ethers.utils.parseEther('1', 'ether')});
            await expect(crowdsale.claimRefund(addr2.address)).to.be.rejected;
        });
    });

    describe('Buy tokens', function() {
        describe('when the contribution is less than the min cap', function() {
            it('should reject the transaction', async function() {
                const {crowdsale, owner, addr2} = await loadFixture(deployFixture);
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

        describe('Token Transfers', function() {
            it("should not allow token transfer during paused state", async function() {
                    const {contract, crowdsale, addr1, addr2} = await loadFixture(deployFixture);
                    await crowdsale.connect(addr1).buyTokens(addr1.address, {value: ethers.utils.parseEther("2", "ether")});
                    await expect(contract.connect(addr1).transfer(addr2.address, 1)).to.be.rejected;
            });
        });

        describe('Finalize the crowdsale', function() {
            describe('When the goal is not reached', function() {
                let crowdsale, addr2;

                beforeEach(async function() {
                    const fixture = await loadFixture(deployFixture);
                    crowdsale = fixture.crowdsale;
                    addr2 = fixture.addr2;

                    //addr2 buys some ether
                    const constibutionAmount = ethers.utils.parseEther("2", "ether");
                    await crowdsale.buyTokens(addr2.address, {value: constibutionAmount});

                    //Time is over
                    await time.increaseTo(_closingTime+1);

                    //Finialize the crowdsale
                    await crowdsale.finalize();
                });
                
                it("Should allow the investor to claim refund", async function() {
                    await expect(
                        crowdsale.claimRefund(addr2.address)
                    ).to.be.fulfilled;
                });

            });

            describe('When the goal is reached', function() {
                let crowdsale, contract, addr2;

                beforeEach(async function() {
                    const fixture = await loadFixture(deployFixture);
                    crowdsale = fixture.crowdsale;
                    contract = fixture.contract;
                    addr2 = fixture.addr2;

                    //addr2 buys ether so that the goal is reached
                    await crowdsale.buyTokens(addr2.address, {value: _goal});

                    //Time is over
                    await time.increaseTo(_closingTime+1);

                    //Finialize the crowdsale
                    await crowdsale.finalize();
                });
                
                it("Should not allow the investor to claim refund", async function() {
                    await expect(
                        crowdsale.claimRefund(addr2.address)
                    ).to.be.rejected;
                });

                it("Goal reached should be true", async function() {
                    expect(await crowdsale.goalReached()).to.be.true;
                });

                it("Token minting should be finished", async function() {
                    expect(await contract.isMinter(crowdsale.address)).to.be.false;
                });

                it("Token should be unpaused", async function() {
                    expect(await contract.paused()).to.be.false;
                });

            });
        });
    });


});