// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol"; 
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol"; 
import "@openzeppelin/contracts/token/ERC20/TokenTimelock.sol";
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./JoviToken.sol";

contract JoviTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, RefundableCrowdsale, Ownable {

    //Token distribution
    uint256 public tokenSalePercentage = 70;
    uint256 public founderPercentage = 10;
    uint256 public foundationPercentage = 10;
    uint256 public partnersPercentage = 10;

    address public founderFund;
    address public foundationFund;
    address public partnersFund;

    uint256 public releaseTime;
    address public founderTimelock;
    address public foundationTimelock;
    address public partnersTimelock;

    //Investor contribution capping
    uint256 public investorMinCap = 2e15; //0.002 ether
    uint256 public investorMaxCap = 5e19; //50 ether
    mapping(address => uint256) public contribution;

    //Crowdsale stages
    enum CrowdsaleStage { PreICO, ICO }
    CrowdsaleStage public stage = CrowdsaleStage.PreICO;
    uint256 public preIcoRate;
    uint256 public IcoRate;

    uint256 private changeableRate;
    JoviToken private joviToken;

    constructor(
        uint256 _preIcoRate, 
        uint256 _IcoRate,
        address payable _wallet, 
        JoviToken _token,
        uint256 _cap,
        uint256 _goal,
        uint256 _openingTime, 
        uint256 _closingTime,
        address _founderFund,
        address _foundationFund,
        address _partnersFund,
        uint256 _releaseTime
    )
    Crowdsale(_preIcoRate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
    public {
        require(_preIcoRate > 0, "JoviTokenCrowdsale: preIcoRate is needs to be greater than 0");
        require(_IcoRate > 0, "JoviTokenCrowdsale: IcoRate is needs to be greater than 0");
        require(investorMinCap > 0, "JoviTokenCrowdsale: InvestorMinCap needs to be greater than 0");
        require(investorMaxCap > 0, "JoviTokenCrowdsale: InvestorMinCap needs to be greater than 0");
        require(investorMinCap < investorMaxCap, "JoviTokenCrowdsale: InvestorMinCap should be smaller than InvestorMaxCap");
        require(investorMaxCap <= _cap, "JoviTokenCrowdsale: InvestorMaxCap should be smaller than Cap");
        require(_goal <= _cap, "JoviTokenCrowdsale: Cant create crowdsale Goal is greater than Cap");
        require(_founderFund != address(0), "JoviTokenCrowdsale: founderFund is the zero address");
        require(_foundationFund != address(0), "JoviTokenCrowdsale: foundationFund is the zero address");
        require(_partnersFund != address(0), "JoviTokenCrowdsale: partnersFund is the zero address");

        changeableRate = _preIcoRate;
        joviToken = _token;
        founderFund = _founderFund;
        foundationFund = _foundationFund;
        partnersFund = _partnersFund;
        releaseTime = _releaseTime;
        preIcoRate = _preIcoRate;
        IcoRate = _IcoRate;
    }

    function getUserContribution(address _beneficiary) public view returns (uint256) {
        return contribution[_beneficiary];
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        return changeableRate;
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount.mul(changeableRate);
    }

    /**
     * @dev Allows admin to update the crowdsale stage
     * @param _stage Crowdsale stage
     */
    function setCrowdsaleStage(uint _stage) public onlyOwner {
        if(_stage == uint(CrowdsaleStage.ICO)){
            stage = CrowdsaleStage.ICO;
            changeableRate = IcoRate;
        } else if(_stage == uint(CrowdsaleStage.PreICO)){
            require(stage != CrowdsaleStage.ICO, "JoviTokenCrowdsale: Cant change stage back to PreICO from ICO");
            changeableRate = preIcoRate;
        }
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        if(stage == CrowdsaleStage.PreICO){
            wallet().transfer(msg.value);
        } else if(stage == CrowdsaleStage.ICO){
            super._forwardFunds();
        }
    }

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * Use `super` in contracts that inherit from Crowdsale to extend their validations.
     * Example from CappedCrowdsale.sol's _preValidatePurchase method:
     *     super._preValidatePurchase(beneficiary, weiAmount);
     *     require(weiRaised().add(weiAmount) <= cap);
     * @param _beneficiary Address performing the token purchase
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(
        address _beneficiary, 
        uint256 _weiAmount
    ) internal view {
        super._preValidatePurchase(_beneficiary, _weiAmount);

        uint256 _existingContribution = contribution[_beneficiary];
        uint256 _newContribution = _existingContribution.add(_weiAmount);
        require(_newContribution >= investorMinCap && _newContribution <= investorMaxCap);
    }

    /**
     * @dev Override for extensions that require an internal state to check for validity (current user contributions,
     * etc.)
     * @param _beneficiary Address receiving the tokens
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
        super._updatePurchasingState(_beneficiary, _weiAmount);

        contribution[_beneficiary] = contribution[_beneficiary].add(_weiAmount);
    }

    /**
     * @dev Stop minting and unpause the token when the crowdsale is over
     */
    function _finalization() internal {
        if (goalReached()) {
            // Finish minting the token
            ERC20Mintable _mintableToken = ERC20Mintable(joviToken);

            //Distribute the tokens
            uint256 _tokenSaleSupply = _mintableToken.totalSupply();
            uint256 _totalSupply = _tokenSaleSupply.mul(100).div(tokenSalePercentage);
            uint256 _founderSupply = _totalSupply.mul(founderPercentage).div(100);
            uint256 _foundationSupply = _totalSupply.mul(foundationPercentage).div(100);
            uint256 _partnersSupply = _totalSupply.mul(partnersPercentage).div(100);

            founderTimelock = address(new TokenTimelock(token(), founderFund, releaseTime));
            foundationTimelock = address(new TokenTimelock(token(), foundationFund, releaseTime));
            partnersTimelock = address(new TokenTimelock(token(), partnersFund, releaseTime));

            _mintableToken.mint(founderTimelock, _founderSupply);
            _mintableToken.mint(foundationTimelock, _foundationSupply);
            _mintableToken.mint(partnersTimelock, _partnersSupply);

            _mintableToken.renounceMinter();

            // Unpause the token
            ERC20Pausable(joviToken).unpause();
            
        } 

        super._finalization();
    }

}