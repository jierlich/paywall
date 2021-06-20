const { expect } = require("chai")
const { ethers } = require("hardhat")

// Event Name Constants
const ASSET_CREATED = "AssetCreated"

describe("Access", () => {
    const bnZero = new ethers.BigNumber.from(0)
    const bnOne = new ethers.BigNumber.from(1)
    const bnNinetyNine = new ethers.BigNumber.from(99)
    const bnHundred = new ethers.BigNumber.from(100)
    const bnTwoHundred = new ethers.BigNumber.from(200)

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
        expect(await this.access.pendingWithdrawals(bnOne)).to.equal(bnZero)
        expect(await this.access.contractFeesAccrued()).to.equal(bnZero)

        // grant access to self
        await this.access.connect(this.signers[1])
            .grantAccess(1, this.signers[1].address, {value: bnHundred})

        expect(await this.access.addressHasAccess(1, this.signers[1].address)).to.equal(true)
        expect(await this.access.pendingWithdrawals(bnOne)).to.equal(bnNinetyNine)
        expect(await this.access.contractFeesAccrued()).to.equal(bnOne)
    })

    it("Should only give grantee access not grantor if gifted", async () => {
        await this.access.connect(this.signers[0])
            .create(bnHundred, this.signers[0].address)

        // grant access to other. Grantee has access, grantor does not
        expect(await this.access.addressHasAccess(1, this.signers[2].address)).to.equal(false)
        expect(await this.access.addressHasAccess(1, this.signers[3].address)).to.equal(false)
        expect(await this.access.pendingWithdrawals(bnOne)).to.equal(bnZero)
        expect(await this.access.contractFeesAccrued()).to.equal(bnZero)

        // signer 2 gifts access to signer 3
        await this.access.connect(this.signers[2])
            .grantAccess(1, this.signers[3].address, {value: bnHundred})

        expect(await this.access.addressHasAccess(1, this.signers[2].address)).to.equal(false)
        expect(await this.access.addressHasAccess(1, this.signers[3].address)).to.equal(true)
        expect(await this.access.pendingWithdrawals(bnOne)).to.equal(bnNinetyNine)
        expect(await this.access.contractFeesAccrued()).to.equal(bnOne)
    })

    it("Should not grant access to a non-existent asset", async () => {
        await expect(
            this.access.connect(this.signers[1])
            .grantAccess(1, this.signers[1].address, {value: bnHundred})
        ).to.be.revertedWith("Asset does not exist")
    })

    it("Should not grant access when paid the wrong amount", async () => {
        await this.access.connect(this.signers[0])
            .create(bnHundred, this.signers[0].address)

        await expect(
            this.access.connect(this.signers[1])
            .grantAccess(1, this.signers[1].address, {value: bnOne})
        ).to.be.revertedWith("Incorrect fee amount")

        await expect(
            this.access.connect(this.signers[1])
            .grantAccess(1, this.signers[1].address, {value: bnTwoHundred})
        ).to.be.revertedWith("Incorrect fee amount")
    })

    it("Should only let asset owner withdraw funds", async () => {
        await this.access.connect(this.signers[1])
            .create(bnHundred, this.signers[1].address)

        await this.access.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address, {value: bnHundred})

        // non-owner attempts withdrawal
        await expect (
            this.access.connect(this.signers[2])
                .withdraw(1)
        ).to.be.revertedWith("Only the asset owner can call this function")

        const initialBalance = await ethers.provider.getBalance(this.signers[1].address)

        // Owner attempts withdrawal
        const withdraw = await this.access.connect(this.signers[1]).withdraw(1)
        const gasCost = await calculateGasCost(withdraw)
        const expectedBalance = initialBalance.add(bnNinetyNine).sub(gasCost)
        const newBalance = await ethers.provider.getBalance(this.signers[1].address)
        expect(newBalance).to.equal(expectedBalance)
    })
})

// returns the amount spent in gas in a transaction as a BN
async function calculateGasCost(txObject) {
    const receipt = await txObject.wait()
    const gasUsed = receipt.gasUsed
    return gasUsed.mul(txObject.gasPrice)
}