# Paywall Contract

Lightweight payments tooling for access to non-tokenized digital assets

Ex. Pay $0.50 to read an article

## Usage
`create(uint256 _fee, address _owner)` - creates an asset with an access `_fee` and `_owner`, and emits an event with
the asset's `_id`

`grantAccess(uint256 _id, address _addr)` - purchases access to asset `_id` for a specified user's `_addr`

`withdraw(uint256 _id)` - allows asset `_id`'s owner to withdraw received fees

`addressHasAccess[_id][_user]` - nested mapping to check if `_user` has been granted access to `_id` asset

## Deployments
Polygon address coming soon!

Polygon has been selected because its network fees are low enough for micropayments.

## Development Methodology
This project will be developed iteratively. A release will be cut for each deployed version and old versions will
always be available for use.

**The contract has been tested, but not audited at this point.** If you use Paywall for significant volume, please
consider withdrawing funds frequently.

