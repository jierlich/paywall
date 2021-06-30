require("@nomiclabs/hardhat-waffle");
const environment = require("./environment")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    matic_mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [environment.deployerPK]
    }
  },
  solidity: {
    version: "0.8.3",
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
