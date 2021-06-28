const { expect } = require("chai")
const { ethers } = require("hardhat")

// Event Name Constants
const ASSET_CREATED = "AssetCreated"

describe("Paywall", () => {
    const bnZero = new ethers.BigNumber.from(0)
    const bnOne = new ethers.BigNumber.from(1)
    const oneEther = new ethers.BigNumber.from("1000000000000000000");
    const contractFee0 = oneEther.div(new ethers.BigNumber.from(10**6))
    const contractFee1 = oneEther.div(new ethers.BigNumber.from(10**5))
    const assetFee0 = ethers.utils.parseUnits("0.001", "ether")
    const assetFee1 = ethers.utils.parseUnits("0.002", "ether")
    const contractFeeReceived0 = assetFee0.mul(contractFee0).div(oneEther)
    const assetFeeReceived0 = assetFee0 - contractFeeReceived0

    beforeEach(async () => {
        this.signers = await ethers.getSigners()
        const PaywallContract = await ethers.getContractFactory("Paywall", this.signers[10])
        this.paywall = await PaywallContract.deploy()
        await this.paywall.deployed()
        await this.paywall.connect(this.signers[10]).changeContractFee(contractFee0)
    })

    // Creation and Access Control
    //

    it("Should create an accessable asset", async () => {
        // Static call verifies correct return value without altering state
        const createCallStatic = await this.paywall.connect(this.signers[0])
            .callStatic.create(assetFee0, this.signers[0].address)
        expect(createCallStatic).to.equal(bnOne)

        // Non-static call changes state and checks emitted event
        const createCall = await this.paywall.connect(this.signers[0])
            .create(assetFee0, this.signers[0].address)
        await expect(createCall).to.emit(this.paywall, ASSET_CREATED)
            .withArgs(new ethers.BigNumber.from(1), this.signers[0].address)
    })

    // grant access to an asset that does exist, check access before and expect false, after and expect true
    it("Should provide access only if granted", async () => {
        await this.paywall.connect(this.signers[0])
            .create(assetFee0, this.signers[0].address)

        expect(await this.paywall.addressHasAccess(1, this.signers[1].address)).to.equal(false)
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(bnZero)
        expect(await this.paywall.contractFeesAccrued()).to.equal(bnZero)

        // grant access to self
        await this.paywall.connect(this.signers[1])
            .grantAccess(1, this.signers[1].address, {value: assetFee0})

        expect(await this.paywall.addressHasAccess(1, this.signers[1].address)).to.equal(true)
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(assetFeeReceived0)
        expect(await this.paywall.contractFeesAccrued()).to.equal(contractFeeReceived0)
    })

    it("Should only give grantee access not grantor if gifted", async () => {
        await this.paywall.connect(this.signers[0])
            .create(assetFee0, this.signers[0].address)

        // grant access to other. Grantee has access, grantor does not
        expect(await this.paywall.addressHasAccess(1, this.signers[2].address)).to.equal(false)
        expect(await this.paywall.addressHasAccess(1, this.signers[3].address)).to.equal(false)
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(bnZero)
        expect(await this.paywall.contractFeesAccrued()).to.equal(bnZero)

        // signer 2 gifts access to signer 3
        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[3].address, {value: assetFee0})

        expect(await this.paywall.addressHasAccess(1, this.signers[2].address)).to.equal(false)
        expect(await this.paywall.addressHasAccess(1, this.signers[3].address)).to.equal(true)
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(assetFeeReceived0)
        expect(await this.paywall.contractFeesAccrued()).to.equal(contractFeeReceived0)
    })

    it("Should not grant access to a non-existent asset", async () => {
        await expect(
            this.paywall.connect(this.signers[1])
                .grantAccess(1, this.signers[1].address, {value: assetFeeReceived0})
        ).to.be.revertedWith("Asset does not exist")
    })

    it("Should not grant access when paid the wrong amount", async () => {
        await this.paywall.connect(this.signers[0])
            .create(assetFee0, this.signers[0].address)

        await expect(
            this.paywall.connect(this.signers[1])
                .grantAccess(1, this.signers[1].address, {value: bnOne})
        ).to.be.revertedWith("Incorrect fee amount")

        await expect(
            this.paywall.connect(this.signers[1])
                .grantAccess(1, this.signers[1].address, {value: oneEther})
        ).to.be.revertedWith("Incorrect fee amount")
    })

    // Asset Owner Administrative
    //

    it("Should only let asset owner withdraw funds", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address, {value: assetFee0})

        // non-owner attempts withdrawal
        await expect (
            this.paywall.connect(this.signers[2])
                .withdraw(1)
        ).to.be.revertedWith("Only the asset owner can call this function")

        const initialBalance = await ethers.provider.getBalance(this.signers[1].address)

        // Owner attempts withdrawal
        const withdraw = await this.paywall.connect(this.signers[1]).withdraw(1)
        const gasCost = await calculateGasCost(withdraw)
        const expectedBalance = initialBalance.add(assetFeeReceived0).sub(gasCost)
        const newBalance = await ethers.provider.getBalance(this.signers[1].address)
        expect(newBalance).to.equal(expectedBalance)
    })

    it("Should only let asset owner change asset owner", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        // fail to change owner
        await expect(
            this.paywall.connect(this.signers[2])
                .changeAssetOwner(1, this.signers[2].address)
        ).to.be.revertedWith("Only the asset owner can call this function")

        // changeAssetFee failed as new owner not applied
        await expect (
            this.paywall.connect(this.signers[2])
                .changeAssetFee(1, assetFee1)
        ).to.be.revertedWith("Only the asset owner can call this function")

        await this.paywall.connect(this.signers[1]).changeAssetOwner(1, this.signers[2].address)

        await expect (
            this.paywall.connect(this.signers[1])
                .changeAssetFee(1, assetFee1)
        ).to.be.revertedWith("Only the asset owner can call this function")
        await this.paywall.connect(this.signers[2])
            .changeAssetFee(1, assetFee1)
    })

    it("Should only let asset owner change asset fee", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        expect(await this.paywall.connect(this.signers[1]).feeAmount(1)).to.equal(assetFee0)

        await expect(
            this.paywall.connect(this.signers[2])
                .changeAssetFee(1, assetFee1)
        ).to.be.revertedWith("Only the asset owner can call this function")

        expect(await this.paywall.connect(this.signers[1]).feeAmount(1)).to.equal(assetFee0)

        this.paywall.connect(this.signers[1]).changeAssetFee(1, assetFee1)
        expect(await this.paywall.connect(this.signers[1]).feeAmount(1)).to.equal(assetFee1)
    })

    // Contract Owner Administrative
    //

    it("Should only let contract owner withdraw funds", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address, {value: assetFee0})

        // non-owner attempts withdrawal
        await expect (
            this.paywall.connect(this.signers[2])
                .contractWithdraw()
        ).to.be.revertedWith("Ownable: caller is not the owner")

        const initialBalance = await ethers.provider.getBalance(this.signers[10].address)

        // Owner attempts withdrawal
        const withdraw = await this.paywall.connect(this.signers[10]).contractWithdraw()
        const gasCost = await calculateGasCost(withdraw)
        const expectedBalance = initialBalance.add(contractFeeReceived0).sub(gasCost)
        const newBalance = await ethers.provider.getBalance(this.signers[10].address)
        expect(newBalance).to.equal(expectedBalance)
    })

    it("Should only let contract owner change contract owner", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        // fail to change owner
        await expect(
            this.paywall.connect(this.signers[1])
                .transferOwnership(this.signers[2].address)
        ).to.be.revertedWith("Ownable: caller is not the owner")


        // changeContractFee failed as new owner not applied
        await expect(
            this.paywall.connect(this.signers[1])
                .changeContractFee(contractFee1)
        ).to.be.revertedWith("Ownable: caller is not the owner")

        this.paywall.connect(this.signers[10])
            .changeContractFee(contractFee1)

        this.paywall.connect(this.signers[10])
            .transferOwnership(this.signers[2].address)

        await expect (
            this.paywall.connect(this.signers[10])
                .changeContractFee(contractFee0)
        ).to.be.revertedWith("Ownable: caller is not the owner")

        this.paywall.connect(this.signers[2])
            .changeContractFee(contractFee0)
    })

    it("Should only let contract owner change contract fee", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        expect(await this.paywall.connect(this.signers[10]).contractFee()).to.equal(contractFee0)

        await expect(
            this.paywall.connect(this.signers[2])
                .changeContractFee(contractFee1)
        ).to.be.revertedWith("Ownable: caller is not the owner")

        expect(await this.paywall.connect(this.signers[1]).contractFee()).to.equal(contractFee0)

        this.paywall.connect(this.signers[10]).changeContractFee(contractFee1)
        expect(await this.paywall.connect(this.signers[1]).contractFee()).to.equal(contractFee1)
    })

    // Payout Edge Cases
    //

    it("Should not charge the user if there is no asset fee", async () => {
        await this.paywall.connect(this.signers[1])
            .create(bnZero, this.signers[1].address)

        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address)

        // expect no fees paid
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(bnZero)
        expect(await this.paywall.contractFeesAccrued()).to.equal(bnZero)

        await expect(
            this.paywall.connect(this.signers[3])
                .grantAccess(1, this.signers[3].address, {value: assetFee0})
        ).to.be.revertedWith("Incorrect fee amount")

        // expect no fees paid
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(bnZero)
        expect(await this.paywall.contractFeesAccrued()).to.equal(bnZero)
    })

    it("Should give asset owner the full amount if there is no contract fee", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        // Set contract fee to zero
        await this.paywall.connect(this.signers[10])
            .changeContractFee(bnZero)

        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address, {value: assetFee0})

        // expect fee amounts
        expect(await this.paywall.pendingWithdrawals(bnOne)).to.equal(assetFee0)
        expect(await this.paywall.contractFeesAccrued()).to.equal(bnZero)

        // withdraw as expected
        const initialBalance = await ethers.provider.getBalance(this.signers[1].address)
        const withdraw = await this.paywall.connect(this.signers[1]).withdraw(bnOne)
        const gasCost = await calculateGasCost(withdraw)
        const expectedBalance = initialBalance.add(assetFee0).sub(gasCost)
        const newBalance = await ethers.provider.getBalance(this.signers[1].address)
        expect(newBalance).to.equal(expectedBalance)
    })

    it("Should not allow asset owners to perform double withdrawals", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address, {value: assetFee0})

        const initialBalance0 = await ethers.provider.getBalance(this.signers[1].address)

        // Owner attempts first withdrawal after payment
        const withdraw0 = await this.paywall.connect(this.signers[1]).withdraw(1)
        const gasCost0 = await calculateGasCost(withdraw0)
        const expectedBalance0 = initialBalance0.add(assetFeeReceived0).sub(gasCost0)
        const newBalance0 = await ethers.provider.getBalance(this.signers[1].address)
        expect(newBalance0).to.equal(expectedBalance0)

        // Owner attempts second withdrawal after no payment
        await expect (
            this.paywall.connect(this.signers[1]).withdraw(1)
        ).to.be.revertedWith("No funds to withdraw for this asset")

        const initialBalance1 = await ethers.provider.getBalance(this.signers[1].address)

        await this.paywall.connect(this.signers[3])
            .grantAccess(1, this.signers[3].address, {value: assetFee0})

        // Owner attemps third withdrawal after additional payment
        const withdraw1 = await this.paywall.connect(this.signers[1]).withdraw(1)
        const gasCost1 = await calculateGasCost(withdraw1)
        const expectedBalance1 = initialBalance1.add(assetFeeReceived0).sub(gasCost1)
        const newBalance1 = await ethers.provider.getBalance(this.signers[1].address)
        expect(newBalance1).to.equal(expectedBalance1)
    })

    it("Should not allow contract owner to perform double withdrawals", async () => {
        await this.paywall.connect(this.signers[1])
            .create(assetFee0, this.signers[1].address)

        await this.paywall.connect(this.signers[2])
            .grantAccess(1, this.signers[2].address, {value: assetFee0})

        const initialBalance0 = await ethers.provider.getBalance(this.signers[10].address)

        // Owner attempts first withdrawal after payment
        const withdraw0 = await this.paywall.connect(this.signers[10]).contractWithdraw()
        const gasCost0 = await calculateGasCost(withdraw0)
        const expectedBalance0 = initialBalance0.add(contractFeeReceived0).sub(gasCost0)
        const newBalance0 = await ethers.provider.getBalance(this.signers[10].address)
        expect(newBalance0).to.equal(expectedBalance0)

        // Owner attempts second withdrawal after no payment
        await expect (
            this.paywall.connect(this.signers[10]).contractWithdraw()
        ).to.be.revertedWith("No funds to withdraw")

        await this.paywall.connect(this.signers[3])
        .grantAccess(1, this.signers[3].address, {value: assetFee0})

        const initialBalance1 = await ethers.provider.getBalance(this.signers[10].address)

        // Owner attempts third withdrawal after payment
        const withdraw1 = await this.paywall.connect(this.signers[10]).contractWithdraw()
        const gasCost1 = await calculateGasCost(withdraw1)
        const expectedBalance1 = initialBalance1.add(contractFeeReceived0).sub(gasCost1)
        const newBalance1 = await ethers.provider.getBalance(this.signers[10].address)
        expect(newBalance1).to.equal(expectedBalance1)
    })
})

// returns the amount spent in gas in a transaction as a BN
async function calculateGasCost(txObject) {
    const receipt = await txObject.wait()
    const gasUsed = receipt.gasUsed
    return gasUsed.mul(txObject.gasPrice)
}