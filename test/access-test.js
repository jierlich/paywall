const { expect } = require("chai")
const { ethers } = require("hardhat")

// Event Name Constants
const ASSET_CREATED = "AssetCreated"

describe("Access", () => {
    beforeEach(async () => {
        const AccessContract = await ethers.getContractFactory("Access")
        this.access = await AccessContract.deploy()
        await this.access.deployed()
    })

    it("Should create an accessable asset", async () => {
        const [assetOwner, buyer, nonBuyer] = await ethers.getSigners()
        const createCall = await this.access.create(new ethers.BigNumber.from(100), assetOwner.address)
        await expect(createCall).to.emit(this.access, ASSET_CREATED).withArgs(new ethers.BigNumber.from(1), assetOwner.address)
    })
})