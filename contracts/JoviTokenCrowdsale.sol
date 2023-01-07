// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol"; 
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol"; 
import "@openzeppelin/contracts/crowdsale/Crowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./JoviToken.sol";

contract JoviTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, RefundableCrowdsale, Ownable {

    //Investor contribution capping
    uint256 public investorMinCap = 2e15; //0.002 ether
    uint256 public investtorMaxCap = 5e19; //50 ether
    mapping(address => uint256) public contribution;

    //Crowdsale stages
    enum CrowdsaleStage { PreICO, ICO }
    CrowdsaleStage public stage = CrowdsaleStage.PreICO;

    uint256 private _changeableRate;
    JoviToken private _joviToken;

    constructor(
        uint256 _rate, 
        address payable _wallet, 
        JoviToken _token,
        uint256 _cap,
        uint256 _goal,
        uint256 _openingTime, 
        uint256 _closingTime
    )
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
    public {
        require(_rate > 0, "Crowdsale: rate is 0");
        require(_goal <= _cap, "Cant create crowdsale Goal is greater than Cap");
        _changeableRate = _rate;
        _joviToken = _token;
    }

    function getUserContribution(address _beneficiary) public view returns (uint256) {
        return contribution[_beneficiary];
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        return _changeableRate;
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount.mul(_changeableRate);
    }

    /**
     * @dev Allows admin to update the crowdsale stage
     * @param _stage Crowdsale stage
     */
    function setCrowdsaleStage(uint _stage) public onlyOwner {
        if(uint(CrowdsaleStage.PreICO) == _stage) {
            stage = CrowdsaleStage.PreICO;
        } else if(uint(CrowdsaleStage.ICO) == _stage){
            stage = CrowdsaleStage.ICO;
            _changeableRate = 250;
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
        require(_newContribution >= investorMinCap && _newContribution <= investtorMaxCap);
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
            ERC20Mintable _mintableToken = ERC20Mintable(_joviToken);
            _mintableToken.renounceMinter();

            // Unpause the token
            ERC20Pausable(_joviToken).unpause();
            
        } 

        super._finalization();
    }

}