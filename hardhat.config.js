require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
const environment = require("./environment")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    matic_mainnet: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [environment.deployerPK]
    },
    matic_mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [environment.deployerPK]
    }
  },
  solidity: {
    version: "0.8.4",
    optimizer: {
      enabled: true,
      runs: 1_000_000
    }
  },
  etherscan: {
    apiKey: environment.etherscanAPIKey
  }
};
