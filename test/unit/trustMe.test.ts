import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Signer} from 'ethers';
import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BuyerToken, SellerToken, TrustMe} from '../../typechain';
import {time} from '@nomicfoundation/hardhat-network-helpers';
describe('TrustMe', () => {
	let signers: SignerWithAddress[];
	let trustMe: TrustMe;
	let buyerToken: BuyerToken;
	let sellerToken: SellerToken;

	let contractsDeployer: SignerWithAddress;
	let seller: SignerWithAddress;
	let buyer: SignerWithAddress;

	beforeEach(async () => {
		await deployments.fixture('all');

		trustMe = await ethers.getContract('TrustMe');
		buyerToken = await ethers.getContract('BuyerToken');
		sellerToken = await ethers.getContract('SellerToken');
		signers = await ethers.getSigners();
		contractsDeployer = signers[0];

		seller = signers[1];
		buyer = signers[2];

		// transfer sellerToken to seller
		await sellerToken.transfer(seller.address, ethers.utils.parseEther('1000'));
		// transfer buyerToken to buyer
		await buyerToken.transfer(buyer.address, ethers.utils.parseEther('1000'));
	});

	describe('CreateTrade', () => {
		it('Should revert if seller,buyer,tokenToSell,tokenToBuy address is 0x0', async () => {
			await expect(
				trustMe.connect(seller).createTrade(
					ethers.constants.AddressZero,
					ethers.constants.AddressZero,
					ethers.constants.AddressZero,
					parseEther('100'),
					parseEther('100'),
					600 // 10 mins deadline
				)
			).to.be.revertedWithCustomError(trustMe, 'InvalidAddress');
		});

		it('Should revert if tokenToBuy is same as tokenToSell', async () => {
			await expect(
				trustMe.connect(seller).createTrade(
					buyer.address,
					sellerToken.address,
					sellerToken.address,
					parseEther('100'),
					parseEther('100'),
					600 // 10 mins deadline
				)
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeSameToken');
		});

		it('Should revert if seller and buyer is same', async () => {
			await expect(
				trustMe.connect(seller).createTrade(
					seller.address,
					sellerToken.address,
					buyerToken.address,
					parseEther('100'),
					parseEther('100'),
					(await time.latest()) + 600 // 10 mins deadline
				)
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeWithSelf');
		});
		it('Should revert if amount of tokenToSell is 0', async () => {
			await expect(
				trustMe.connect(seller).createTrade(
					buyer.address,
					sellerToken.address,
					buyerToken.address,
					0,
					parseEther('100'),
					(await time.latest()) + 600 // 10 mins deadline
				)
			).to.be.revertedWithCustomError(trustMe, 'InvalidAmount');
		});
		it('Should revert if amount of tokenToBuy is 0', async () => {
			await expect(
				trustMe.connect(seller).createTrade(
					buyer.address,
					sellerToken.address,
					buyerToken.address,
					parseEther('100'),
					0,
					(await time.latest()) + 600 // 10 mins deadline
				)
			).to.be.revertedWithCustomError(trustMe, 'InvalidAmount');
		});
		it("Should revert if Seller doesn't have enough tokenToSell", async () => {
			await expect(
				trustMe.connect(seller).createTrade(
					buyer.address,
					sellerToken.address,
					buyerToken.address,
					parseEther('100000'),
					parseEther('100'),
					(await time.latest()) + 600 // 10 mins deadline
				)
			).to.be.revertedWithCustomError(trustMe, 'InsufficientBalance');
		});
		it('Should emit TradeCreated event if trade is created successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await expect(
				trustMe.connect(seller).createTrade(
					buyer.address,
					sellerToken.address,
					buyerToken.address,
					parseEther('100'),
					parseEther('100'),
					(await time.latest()) + 600 // 10 mins deadline
				)
			)
				.to.emit(trustMe, 'TradeCreated')
				.withArgs(
					seller.address,
					buyer.address,
					sellerToken.address,
					buyerToken.address,
					parseEther('100'),
					parseEther('100'),
					(await time.latest()) + 600
				);
		});
	});
});
