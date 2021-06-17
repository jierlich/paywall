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
        const createCallStatic = await this.access.connect(this.signers[0])
            .callStatic.create(bnHundred, this.signers[0].address)
        expect(createCallStatic).to.equal(bnOne)

        // Non-static call changes state and checks emitted event
        const createCall = await this.access.connect(this.signers[0])
            .create(bnHundred, this.signers[0].address)
        await expect(createCall).to.emit(this.access, ASSET_CREATED)
            .withArgs(new ethers.BigNumber.from(1), this.signers[0].address)
    })

    // grant access to an asset that does exist, check access before and expect false, after and expect true
    it("Should provide access only if granted", async () => {
        await this.access.connect(this.signers[0])
            .create(bnHundred, this.signers[0].address)

        expect(await this.access.addressHasAccess(1, this.signers[1].address)).to.equal(false)

        // grant access to self
        await this.access.connect(this.signers[1])
            .grantAccess(1, this.signers[1].address, {value: bnHundred})

        expect(await this.access.addressHasAccess(1, this.signers[1].address)).to.equal(true)
    })

    it("Should only give grantee access not grantor if gifted", async () => {
        await this.access.connect(this.signers[0])
            .create(bnHundred, this.signers[0].address)

        // grant access to other. Grantee has access, grantor does not
        expect(await this.access.addressHasAccess(1, this.signers[2].address)).to.equal(false)
        expect(await this.access.addressHasAccess(1, this.signers[3].address)).to.equal(false)

        // signer 2 gifts access to signer 3
        await this.access.connect(this.signers[2])
            .grantAccess(1, this.signers[3].address, {value: bnHundred})

        expect(await this.access.addressHasAccess(1, this.signers[2].address)).to.equal(false)
        expect(await this.access.addressHasAccess(1, this.signers[3].address)).to.equal(true)
    })
})