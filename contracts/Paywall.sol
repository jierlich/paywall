// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
    @title Paywall
    @author jierlich (Jonah Erlich)
    @notice Payments tooling for access to non-tokenized digital assets
            Ex. Article paywall
*/
contract Paywall is Ownable {

    using SafeMath for uint;

    /// @dev counter keeps track of the latest `id` and is used to generate the next one
    uint256 counter;

    /// @dev contractFeeBase is used to calculate the contract's portion of the fee
    uint constant contractFeeBase = 1 ether;
    /// @dev per-ether fee set by contract owner
    uint public contractFee;
    /// @dev Fees paid to the contract that have not yet been withdrawn
    uint public contractFeesAccrued;

    /// @dev The keys of all the following mapping are list `id`s
    /// @dev addressHasAccess can be queried to see if an address has been granted access to an asset
    mapping(uint256 => mapping(address => bool)) public addressHasAccess;
    /// @dev The required amount to pay in msg.value to grant access to the asset
    mapping(uint256 => uint256) public feeAmount;
    /// @dev Fees paid to the asset owner that have not yet been withdrawn
    mapping(uint256 => uint) public pendingWithdrawals;
    /// @dev Checks which address owns `id` asset
    mapping(uint256 => address payable) public owners;

    /// @notice Verifies that this function is being called by the asset's owner
    /// @param _id The asset's identifier
    modifier onlyAssetOwner (uint256 _id) {
        require(owners[_id] == msg.sender, "Only the asset owner can call this function");
        _;
    }

    /// @dev Retrieve this event after creating an asset to retrieve the asset's `id`
    event AssetCreated(uint256 indexed _id, address _owner);

    /// @notice Creates an asset
    /// @param _fee The fee a user must pay to grant access to this asset
    /// @param _owner The owner of an asset, who can withdraw accruedfees and perform administrative actions
    /// @return id of the created asset
    function create(uint256 _fee, address _owner) public returns (uint256) {
        counter += 1;
        feeAmount[counter] = _fee;
        owners[counter] = payable(_owner);
        emit AssetCreated(counter, _owner);
        return counter;
    }

    /// @notice Grants access to a specific asset
    /// @dev `msg.value` must equal `feeAmount[_id]`
    /// @param _id Asset to which an address is granted access
    /// @param _addr Address to which access to an asset is granted
    function grantAccess(uint256 _id, address _addr) public payable {
        require(_id <= counter, 'Asset does not exist');
        require(msg.value == feeAmount[_id], 'Incorrect fee amount');
        require(addressHasAccess[_id][_addr] == false, 'Address already has access');
        uint contractFeeAmount = msg.value.mul(contractFee).div(contractFeeBase);
        uint ownerFeeAmount = msg.value.sub(contractFeeAmount);
        pendingWithdrawals[_id] += ownerFeeAmount;
        contractFeesAccrued += contractFeeAmount;
        addressHasAccess[_id][_addr] = true;
    }

    /// @notice Withdraws funds paid for access to an asset
    /// @param _id Fees from the asset with this `_id` are withdrawn
    function withdraw(uint256 _id) onlyAssetOwner(_id) public {
        require(pendingWithdrawals[_id] > 0, 'No funds to withdraw for this asset');
        address payable assetOwner = owners[_id];
        uint amountToWithdraw = pendingWithdrawals[_id];
        pendingWithdrawals[_id] = 0;
        assetOwner.transfer(amountToWithdraw);
    }

    // Administrative Functions

    /// @notice Change the fee for an asset
    /// @param _id Asset to change
    /// @param _fee New fee for asset
    function changeAssetFee(uint256 _id, uint256 _fee) onlyAssetOwner(_id) public {
        feeAmount[_id] = _fee;
    }

    /// @notice Change the owner for an asset
    /// @param _id Asset to change
    /// @param _owner New owner for asset
    function changeAssetOwner(uint256 _id, address _owner) onlyAssetOwner(_id) public {
        owners[_id] = payable(_owner);
    }

    /// @notice Changes the per-ether fee the contract takes from grantAccess calls
    /// @param _contractFee New value for the contract fee
    function changeContractFee(uint _contractFee) onlyOwner() public {
        contractFee = _contractFee;
    }

    /// @notice Allows the contract owner to withdraw accrued fees
    function contractWithdraw() onlyOwner() public {
        require(contractFeesAccrued > 0, 'No funds to withdraw');
        address payable contractOwner = payable(owner());
        uint withdrawValue = contractFeesAccrued;
        contractFeesAccrued = 0;
        contractOwner.transfer(withdrawValue);
    }

    /// @notice Catches any funds accidentally sent to contract directly
    receive() external payable {
        require(0 == 1, 'Invalid: do not send funds directly to contract');
    }
}
