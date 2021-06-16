const { expect } = require("chai")
const { ethers } = require("hardhat")

// Event Name Constants
const ASSET_CREATED = "AssetCreated"

describe("Access", () => {
    const bnOne = new ethers.BigNumber.from(1)
    const bnHundred = new ethers.BigNumber.from(100)

    beforeEach(async () => {
        const AccessContract = await ethers.getContractFactory("Access")
        this.access = await AccessContract.deploy()
        this.signers = await ethers.getSigners()
        await this.access.deployed()
    })

    it("Should create an accessable asset", async () => {
        // Static call verifies correct return value without altering state
        const createCallStatic = await this.access.callStatic.create(bnHundred, this.signers[0].address)
        await expect(createCallStatic).to.equal(bnOne)

        // Non-static call changes state and checks emitted event
        const createCall = await this.access.create(bnHundred, this.signers[0].address)
        await expect(createCall).to.emit(this.access, ASSET_CREATED)
            .withArgs(new ethers.BigNumber.from(1), this.signers[0].address)
    })
})