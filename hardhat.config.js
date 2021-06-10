require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  // Add test networks here when ready for easy deployment
  // Should main net go here as well? It seems a bit
  // fast and loose in terms of deployment practices.
  // networks: {},
  solidity: "0.7.3",
};
