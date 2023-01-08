const { duration } = require('./helpers/time');
const latestTime = Math.round((new Date).getTime() / 1000); //Get lastest time in s

const _name = "JoviToken";
const _symbol = "JOVI";
const _decimals = 18;
const _rate = 500; //Number of tokens per 1 Eth
const _cap = ethers.utils.parseEther("100", "ether");
const _goal = ethers.utils.parseEther("50", "ether");
const _ratePreICO = _rate;
const _rateICO = 250;
const _openingTime = latestTime + duration.minutes(5);
const _closingTime = _openingTime + duration.years(1);
const _releaseTime = _closingTime + duration.years(2);

async function main() {
  let [owner, wallet, founderAddr, foundationAddr, partnersAddr] = await ethers.getSigners();
  console.log("Owner account:", owner.address);
  console.log("Account balance:", (await owner.getBalance()).toString());

  if(wallet == undefined){
    console.log("Wallet address is undefined, setting it to owner");
    wallet = owner;
  }

  if(founderAddr == undefined){
    console.log("Founder address is undefined, setting it to owner");
    founderAddr = owner;
  }

  if(foundationAddr == undefined){
    console.log("Foundation address is undefined, setting it to owner");
    foundationAddr = owner;
  }

  if(partnersAddr == undefined){
    console.log("Partner address is undefined, setting it to owner");
    partnersAddr = owner;
  }
  

  const TokenFactory = await ethers.getContractFactory("JoviToken");
  const token = await TokenFactory.deploy(_name, _symbol, _decimals);
  await token.deployed();
  console.log("Token Address:", token.address);

  const CrowdaleFactory = await ethers.getContractFactory("JoviTokenCrowdsale");
  const crowdsale = await CrowdaleFactory.deploy(_ratePreICO,
                                                  _rateICO, 
                                                  wallet.address, 
                                                  token.address, 
                                                  _cap, 
                                                  _goal, 
                                                  _openingTime, 
                                                  _closingTime,
                                                  founderAddr.address,
                                                  foundationAddr.address,
                                                  partnersAddr.address,
                                                  _releaseTime
                                                  );
  await crowdsale.deployed();
  console.log("Crowdsale Address:", crowdsale.address);

  // Pause the token
  await token.pause();

  //Add Pauser role 
  await token.addPauser(crowdsale.address);

  //Add minter ownership
  await token.addMinter(crowdsale.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });