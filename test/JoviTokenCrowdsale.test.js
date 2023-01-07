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

    const founderPercentage = 10;
    const foundationPercentage = 10;
    const partnersPercentage = 10;

    let _openingTime, _closingTime, releaseTime;

    async function deployFixture() {
        const [owner, wallet, addr1, addr2, founderAddr, foundationAddr, partnersAddr] = await ethers.getSigners();
        
        const ContractFactory = await ethers.getContractFactory("JoviToken");
        const contract = await ContractFactory.deploy(_name, _symbol, _decimals);
        await contract.deployed();


        _openingTime = await time.latest()  + duration.weeks(1);
        _closingTime = _openingTime + duration.weeks(1);
        releaseTime = _closingTime + duration.years(1);

        const CrowdaleFactory = await ethers.getContractFactory("JoviTokenCrowdsale");
        const crowdsale = await CrowdaleFactory.deploy(_rate, 
                                                        wallet.address, 
                                                        contract.address, 
                                                        _cap, 
                                                        _goal, 
                                                        _openingTime, 
                                                        _closingTime,
                                                        founderAddr.address,
                                                        foundationAddr.address,
                                                        partnersAddr.address,
                                                        releaseTime
                                                        );
        await crowdsale.deployed();
        
        // Pause the token
        await contract.pause();

        //Add Pauser role 
        await contract.addPauser(crowdsale.address);

        //Add minter ownership
        await contract.addMinter(crowdsale.address);

        //Adavace time of the blockchain so that the crowdsale is open
        await time.increaseTo(_openingTime+1);


        return { contract, crowdsale, owner, wallet, addr1, addr2, founderAddr, foundationAddr, partnersAddr};

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
                let crowdsale, contract, addr1, addr2, founderAddr, foundationAddr, partnersAddr;

                beforeEach(async function() {
                    const fixture = await loadFixture(deployFixture);
                    crowdsale = fixture.crowdsale;
                    contract = fixture.contract;
                    addr1 = fixture.addr1;
                    addr2 = fixture.addr2;
                    founderAddr = fixture.founderAddr;
                    foundationAddr = fixture.foundationAddr;
                    partnersAddr = fixture.partnersAddr;

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

                it("Token trnsfer should be enabled", async function() {
                    await expect(
                        contract.connect(addr2).transfer(addr1.address, 1)
                    ).to.be.fulfilled;
                });

                it("TimeLock balance should match the distribution", async function() {
                    let totalSupply = await contract.totalSupply();
                    totalSupply = totalSupply.toString();

                    const founderTimelock = await crowdsale.founderTimelock();
                    const foundationTimelock = await crowdsale.foundationTimelock();
                    const partnersTimelock = await crowdsale.partnersTimelock();
                    
                    // Founder
                    let founderBalance = await contract.balanceOf(founderTimelock);
                    founderBalance = founderBalance / 1.0;
                    let founderAmount = totalSupply / founderPercentage;
                    assert.equal(founderBalance.toString(), founderAmount.toString());

                    // Foundation
                    let foundationBalance = await contract.balanceOf(foundationTimelock);
                    foundationBalance = foundationBalance / 1.0;
                    let foundationAmount = totalSupply / foundationPercentage;
                    assert.equal(foundationBalance.toString(), foundationAmount.toString());

                    // Partner
                    let partnersBalance = await contract.balanceOf(partnersTimelock);
                    partnersBalance = partnersBalance / 1.0;
                    let partnersAmount = totalSupply / partnersPercentage;
                    assert.equal(partnersBalance.toString(), partnersAmount.toString());
                    
                    //Check if we can release the timeLock
                    const founderTimelockContract = await ethers.getContractAt("TokenTimelock", founderTimelock);
                    await expect(founderTimelockContract.release()).to.be.rejected;
                    const foundationTimelockContract = await ethers.getContractAt("TokenTimelock", foundationTimelock);
                    await expect(foundationTimelockContract.release()).to.be.rejected;
                    const partnersTimelockContract = await ethers.getContractAt("TokenTimelock", partnersTimelock);
                    await expect(partnersTimelockContract.release()).to.be.rejected;

                    
                    //Release should be possible after release time
                    await time.increaseTo(releaseTime+1);
                    //Founder
                    await expect(founderTimelockContract.release()).to.be.fulfilled;
                    let founderFundBalance = await contract.balanceOf(founderAddr.address);
                    founderFundBalance = founderFundBalance / 1.0;
                    assert.equal(founderFundBalance.toString(), founderAmount.toString());
                    //Foundation
                    await expect(foundationTimelockContract.release()).to.be.fulfilled;
                    let foundationFundBalance = await contract.balanceOf(foundationAddr.address);
                    foundationFundBalance = foundationFundBalance / 1.0;
                    assert.equal(foundationFundBalance.toString(), foundationAmount.toString());
                    //Partner
                    await expect(partnersTimelockContract.release()).to.be.fulfilled;
                    let partnersFundBalance = await contract.balanceOf(partnersAddr.address);
                    partnersFundBalance = partnersFundBalance / 1.0;
                    assert.equal(partnersFundBalance.toString(), partnersAmount.toString());
                    
                    

                });

            });
        });

        describe('Test Token distribution', function() {
            it('Should have valid token distribution', async function(){
                const {crowdsale} = await loadFixture(deployFixture);
                const tokenSalePercentage = await crowdsale.tokenSalePercentage();
                const founderPercentage = await crowdsale.founderPercentage();
                const foundationPercentage = await crowdsale.foundationPercentage();
                const partnersPercentage = await crowdsale.partnersPercentage();

                const totalPercentage = tokenSalePercentage.toNumber() 
                                        + founderPercentage.toNumber() 
                                        + foundationPercentage.toNumber()
                                        + partnersPercentage.toNumber();

                assert.isTrue(totalPercentage == 100);

            });
        });
    });


});