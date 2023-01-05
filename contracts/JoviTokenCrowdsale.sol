// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.5.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol"; 
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";

contract JoviTokenCrowdsale is Crowdsale, MintedCrowdsale, CappedCrowdsale, TimedCrowdsale, RefundableCrowdsale {

    //Investor contribution capping
    uint256 public investorMinCap = 2e15; //0.002 ether
    uint256 public investtorMaxCap = 5e19; //50 ether
    mapping(address => uint256) public contribution;

    constructor(
        uint256 _rate, 
        address payable _wallet, 
        IERC20 _token,
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
        require(_goal <= _cap, "Cant create crowdsale Goal is greater than Cap");
    }

    function getUserContribution(address _beneficiary) public view returns (uint256) {
        return contribution[_beneficiary];
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

}