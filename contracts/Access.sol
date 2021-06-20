// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Access
 * @dev Check if a user has access to a non-crypto digital asset
 *      Ex. Article paywall
 */
contract Access {

    uint256 counter;
    // 100% = 10000
    uint constant contractFeeBase = 10000;
    uint contractFee;
    uint feeMultiplier;
    uint public contractFeesAccrued;

    // asset -> wallet -> hasAccess
    mapping(uint256 => mapping(address => bool)) public addressHasAccess;
    mapping(uint256 => uint256) public feeAmount;
    mapping(uint256 => uint) public pendingWithdrawals;
    mapping(uint256 => address payable) public owners;

    modifier onlyAssetOwner (uint256 _id) {
        require(owners[_id] == msg.sender, "Only the asset owner can call this function");
        _;
    }
    
    event AssetCreated(uint256 indexed _id, address _owner);

    constructor() {
        contractFee = 100;
    }

    function create(uint256 _fee, address _owner) public returns (uint256) {
        counter += 1;
        feeAmount[counter] = _fee;
        owners[counter] = payable(_owner);
        emit AssetCreated(counter, _owner);
        return counter;
    }
    
    function grantAccess(uint256 _id, address _addr) public payable {
        require(msg.value == feeAmount[_id], 'Incorrect fee amount');
        require(_id <= counter, 'Asset does not exist');
        uint contractFeeAmount = SafeMath.div(SafeMath.mul(msg.value, contractFee), contractFeeBase);
        uint ownerFeeAmount = SafeMath.sub(msg.value, contractFeeAmount);
        pendingWithdrawals[_id] += ownerFeeAmount;
        contractFeesAccrued += contractFeeAmount;
        addressHasAccess[_id][_addr] = true;
    }
    
    function withdraw(uint256 _id) onlyAssetOwner(_id) public {
        address payable assetOwner = owners[_id];
        uint amountToWithdraw = pendingWithdrawals[_id];
        pendingWithdrawals[_id] = 0;
        assetOwner.transfer(amountToWithdraw);
    }

    // admin
    function changeFee(uint256 _id, uint256 _fee) onlyAssetOwner(_id) public {
        feeAmount[_id] = _fee;
    }

    function changeOwner(uint256 _id, address _newOwner) onlyAssetOwner(_id) public {
        owners[_id] = payable(_newOwner);
    }
}