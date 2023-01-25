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

	describe('addTrade functionality', () => {
		it('Should revert if seller,buyer,tokenToSell,tokenToBuy address is 0x0', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
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
				trustMe.connect(seller).addTrade(
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
				trustMe.connect(seller).addTrade(
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
				trustMe.connect(seller).addTrade(
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
				trustMe.connect(seller).addTrade(
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
				trustMe.connect(seller).addTrade(
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
				trustMe.connect(seller).addTrade(
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

		it('Should create trade successfully', async () => {
			const currentTime = await time.latest();
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				currentTime + 600 // 10 mins deadline
			);

			const trade = await trustMe.getTrade(seller.address, 0);
			expect(trade.seller).to.equal(seller.address);
			expect(trade.buyer).to.equal(buyer.address);
			expect(trade.tokenToSell).to.equal(sellerToken.address);
			expect(trade.tokenToBuy).to.equal(buyerToken.address);
			expect(trade.amountOfTokenToSell).to.equal(parseEther('100'));
			expect(trade.amountOfTokenToBuy).to.equal(parseEther('100'));
			expect(trade.deadline).to.equal(currentTime + 600);
		});
	});

	describe('closeTrade functionality', () => {
		beforeEach(async () => {
			const currentTime = await time.latest();
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const addTrade = await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				currentTime + 600 // 10 mins deadline
			);
			addTrade.wait();
		});
		it('Should add trade to userToTrade mapping array', async () => {
			expect(await trustMe.getTrades(seller.address)).to.have.lengthOf(1);
		});
		it("Should revert if trade doesn't exist", async () => {
			expect(trustMe.connect(buyer).closeTrade(seller.address, 1)).to.be.revertedWithPanic;
		});
		it('should trade between the seller and buyer', async () => {
			// const index = await trustMe.getLatestTradeIndex(seller.address);
			console.log('Seller Balance Before: ', (await buyerToken.balanceOf(seller.address)).toString());
			console.log('Buyer Balance Before: ', (await sellerToken.balanceOf(buyer.address)).toString());
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			const confirmTrade = await trustMe.connect(buyer).closeTrade(seller.address, 0);
			confirmTrade.wait();
			console.log('Seller Balance After: ', (await buyerToken.balanceOf(seller.address)).toString());
			console.log('Buyer Balance After: ', (await sellerToken.balanceOf(buyer.address)).toString());
			expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('100'));
			expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('100'));
		});

		it('should emit TradeConfirmed event', async () => {
			// const index = await trustMe.getTrade(seller.address, 0);// we only have one trade
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			const confirmTrade = await trustMe.connect(buyer).closeTrade(seller.address, 0);
			confirmTrade.wait();
			await expect(confirmTrade).to.emit(trustMe, 'TradeConfirmed').withArgs(seller.address, buyer.address);
		});

		it('should revert if incorrect buyer', async () => {
			// const index = await trustMe.getLatestTradeIndex(seller.address);
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			expect(trustMe.connect(contractsDeployer).closeTrade(seller.address, 0)).to.be.revertedWithCustomError(
				trustMe,
				'OnlyBuyer'
			);
		});

		it('should revert if deadline is expired', async () => {
			// const index = await trustMe.getLatestTradeIndex(seller.address);
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			await time.increase(601);
			expect(trustMe.connect(buyer).closeTrade(seller.address, 0)).to.be.revertedWithCustomError(
				trustMe,
				'TradeIsExpired'
			);
		});

		it("Should delete trade from user's trade array after trade is confirmed", async () => {
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			const confirmTrade = await trustMe.connect(buyer).closeTrade(seller.address, 0);
			confirmTrade.wait();
			expect(await trustMe.getTrades(seller.address)).to.be.revertedWithPanic;
		});
	});

	describe('cancelTrade functionality', () => {
		beforeEach(async () => {
			const currentTime = await time.latest();
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const addTrade = await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				currentTime + 600 // 10 mins deadline
			);
			addTrade.wait();
		});
		it('Should revert if not seller', async () => {
			expect(trustMe.connect(buyer).cancelTrade(0)).to.be.revertedWithCustomError(trustMe, 'OnlySeller');
		});
		it("Should revert if trade doesn't exist", async () => {
			expect(trustMe.connect(seller).cancelTrade(1)).to.be.revertedWithPanic;
		});

		it('Should revert if deadline is expired', async () => {
			await time.increase(601);
			expect(trustMe.connect(seller).cancelTrade(0)).to.be.revertedWithCustomError(trustMe, 'TradeIsExpired');
		});
		it('Should refund seller', async () => {
			const balanceBefore = await sellerToken.balanceOf(seller.address);
			const cancelTrade = await trustMe.connect(seller).cancelTrade(0);
			cancelTrade.wait();
			const balanceAfter = await sellerToken.balanceOf(seller.address);
			expect(balanceAfter).to.eq(balanceBefore.add(parseEther('100')));
		});
		it('Should emit TradeCancelled event', async () => {
			const cancelTrade = await trustMe.connect(seller).cancelTrade(0);
			cancelTrade.wait();
			await expect(cancelTrade)
				.to.emit(trustMe, 'TradeCanceled')
				.withArgs(seller.address, buyer.address, sellerToken.address, buyerToken.address);
		});
		it("Should delete trade from user's trade array after trade is cancelled", async () => {
			const cancelTrade = await trustMe.connect(seller).cancelTrade(0);
			cancelTrade.wait();
			expect(await trustMe.getTrades(seller.address)).to.be.revertedWithPanic;
		});
	});
});
