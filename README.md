# Paywall Contract

Lightweight payments contract for access to non-tokenized digital assets

Ex. Pay $0.50 to read an article

Demo Link: https://jierlich.github.io/paywall/

## Usage
`create(uint256 _fee, address _owner)` - creates an asset with an access `_fee` and `_owner`, and emits an event with
the asset's `_id`

`grantAccess(uint256 _id, address _addr)` - purchases access to asset `_id` for a specified user's `_addr`

`withdraw(uint256 _id)` - allows asset `_id`'s owner to withdraw received fees

`addressHasAccess[_id][_user]` - nested mapping to check if `_user` has been granted access to `_id` asset

## Deployments

### Version 0.1.0

SHA: [ec64da2088b91ba4311ef1da7775a5a1b0e9862c](https://github.com/jierlich/paywall/releases/tag/0.1.0)

Polygon Mainnet: [0x0E90bC9E123B0ce43b854623A3cdF464A401A795](https://polygonscan.com/address/0x0e90bc9e123b0ce43b854623a3cdf464a401a795)

Polygon Mumbai Testnet: [0x46E5Dd37c7ff88fb24259BB8ba42CC051ADC31c4](https://mumbai.polygonscan.com/address/0x46E5Dd37c7ff88fb24259BB8ba42CC051ADC31c4)

### Why Polygon?
Polygon has been selected because its network fees are low enough for micropayments. We are open to deploying on additional networks. Reach out on the discord to learn more.

## Development Methodology
This project will be developed iteratively. A release will be cut for each deployed version and old versions will
always be available for use.

**The contract has been tested, but not audited at this point.** If you use Paywall for significant volume, please
consider withdrawing funds frequently.

## Community
Looking for help using Paywall? Want to show off your project? Join us on discord https://discord.gg/8v9cVbFGk7
