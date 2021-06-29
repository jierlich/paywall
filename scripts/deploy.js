const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Paywall is being deployed by ${deployer.address}`)

    const paywallFactory = await ethers.getContractFactory("Paywall")
    const paywall = await paywallFactory.deploy()

    console.log("Paywall address:", paywall.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })
