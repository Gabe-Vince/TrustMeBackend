import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Signer} from 'ethers';
import {formatEther, getContractAddress, id, parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerToken, TrustMe} from '../../typechain';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import {log} from 'console';
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
		it('Should add trade to state variables', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins deadline
			);
			const sellerId = await trustMe.getTradesIDsByUser(seller.address);
			const buyerId = await trustMe.getTradesIDsByUser(buyer.address);
			expect(sellerId).to.have.lengthOf(1);
			expect(buyerId).to.have.lengthOf(1);
		});

		it('Should emit TradeCreated event if trade is created successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins deadline
			);
			const timestamp = await time.latest();
			const trade = await trustMe.getTrade(0);
			await expect(tx).to.emit(trustMe, 'TradeCreated').withArgs(trade.id, seller.address, buyer.address);
		});

		it('Should create trade successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins deadline
			);
			const timestamp = await time.latest();

			const trade = await trustMe.getTrade(0);
			expect(trade.seller).to.equal(seller.address);
			expect(trade.buyer).to.equal(buyer.address);
			expect(trade.tokenToSell).to.equal(sellerToken.address);
			expect(trade.tokenToBuy).to.equal(buyerToken.address);
			expect(trade.amountOfTokenToSell).to.equal(parseEther('100'));
			expect(trade.amountOfTokenToBuy).to.equal(parseEther('100'));
			expect(trade.deadline).to.equal(timestamp + 600);
		});

		it('Should add seller token into contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins deadline
			);
			const sellerBalance = await sellerToken.balanceOf(trustMe.address);
			expect(sellerBalance).to.equal(parseEther('100'));
		});
	});

	describe('confirmTrade functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const addTrade = await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins deadline
			);
			addTrade.wait();
		});

		it("Should revert if trade doesn't exist", async () => {
			expect(trustMe.connect(buyer).confirmTrade(2)).to.be.revertedWithPanic;
		});

		it('should trade between the seller and buyer', async () => {
			// const sellerBalBefore = await (await buyerToken.balanceOf(seller.address)).toNumber();
			// console.log("Seller's balance", sellerBalBefore);
			// const buyerBalBefore = await (await sellerToken.balanceOf(buyer.address)).toNumber();
			// console.log("Buyer's balance", buyerBalBefore);

			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(buyer).confirmTrade(0);
			// const sellerBalAfter = await (await buyerToken.balanceOf(seller.address)).toString();
			// console.log("Seller's balance", sellerBalAfter);
			// const buyerBalAfter = await (await sellerToken.balanceOf(buyer.address)).toString();
			// console.log("Buyer's balance", buyerBalAfter);

			expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('100'));
			expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('100'));
		});

		it('should emit TradeConfirmed event', async () => {
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			const confirmTrade = await trustMe.connect(buyer).confirmTrade(0);

			await expect(confirmTrade).to.emit(trustMe, 'TradeConfirmed').withArgs(0, seller.address, buyer.address);
		});

		it('should revert if incorrect buyer', async () => {
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			expect(trustMe.connect(contractsDeployer).confirmTrade(0)).to.be.revertedWithCustomError(
				trustMe,
				'OnlyBuyer'
			);
		});

		it('should revert if deadline is expired', async () => {
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			await time.increase(601);
			expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWithCustomError(trustMe, 'TradeIsExpired');
		});

		it('Should update trade status to confirmed after trade is confirmed', async () => {
			await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(buyer).confirmTrade(0);
			const trade = await trustMe.getTrade(0);
			expect(trade.status).to.equal(1); // 1 = confirmed in TradeStatus enum
		});
	});

	describe('cancelTrade functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins tradePeriod
			);
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
			await trustMe.connect(seller).cancelTrade(0);
			const balanceAfter = await sellerToken.balanceOf(seller.address);
			expect(balanceAfter).to.eq(balanceBefore.add(parseEther('100')));
		});
		it('Should emit TradeCancelled event', async () => {
			const cancelTrade = await trustMe.connect(seller).cancelTrade(0);
			await expect(cancelTrade).to.emit(trustMe, 'TradeCanceled').withArgs(0, seller.address, buyer.address);
		});
		it('Should update trade status to Canceled after trade is cancelled', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('900'));
			const equalToken = 900 / 9;

			for (let i = 0; i < 9; i++) {
				await trustMe.connect(seller).addTrade(
					buyer.address,
					sellerToken.address,
					buyerToken.address,
					parseEther(equalToken.toString()),
					parseEther(equalToken.toString()),
					600 // 10 mins deadline
				);
			}

			await trustMe.connect(seller).cancelTrade(0);
			const trade = await trustMe.getTrade(0);
			expect(trade.status).to.equal(2); // 2 = Cancelled
		});

		it('Should remove canceled trade from pendingTrade array', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('500'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				600 // 10 mins tradePeriod
			);
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('200'),
				parseEther('200'),
				600 // 10 mins tradePeriod
			);
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('200'),
				parseEther('200'),
				600 // 10 mins tradePeriod
			);
			const pendingTrades = await trustMe.getPendingTradesIDs();
			await trustMe.connect(seller).cancelTrade(1);
			const pendingTradesAfter = await trustMe.getPendingTradesIDs();
			// console.log(pendingTrades);
			// console.log(pendingTradesAfter);
			expect(pendingTradesAfter.length).to.equal(3);
		});
	});
	/************************
	 * CHAINLINK AUTOMATION *
	 ************************/

	describe('checkExpiredTrades functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('300'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				1800 // 30 mins tradePeriod
			);
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('200'),
				parseEther('200'),
				3600 // 1 hour tradePeriod
			);
		});
		it('Should change trade.status to expired if deadline has expired', async () => {
			await time.increase(1801);
			const trade1 = await trustMe.getTrade(0);
			const statusBefore = trade1.status;
			await trustMe.checkExpiredTrades();
			const statusAfter = trade1.status;
			const trade2 = await trustMe.getTrade(1);

			expect(await (await trustMe.getTrade(0)).status).to.equal(3); // 3 = Expired
			expect(await (await trustMe.getTrade(1)).status).to.equal(0); // 1 = Pending
		});

		it("Should remove trade from pendingTrades array if trade's deadline has expired", async () => {
			await ethers.provider.send('evm_increaseTime', [1801]);
			await ethers.provider.send('evm_mine', []);
			const pendingTradesBefore = await trustMe.getPendingTradesIDs();

			await trustMe.checkExpiredTrades();

			const pendingTradesAfter = await trustMe.getPendingTradesIDs();

			expect(pendingTradesAfter.length).to.equal(1);
		});

		it('Should emit TradeExpired event if trade deadline has expired', async () => {
			await time.increase(1801);
			const tradeExpired = await trustMe.checkExpiredTrades();
			await expect(tradeExpired).to.emit(trustMe, 'TradeExpired').withArgs(0, seller.address, buyer.address);
		});
	});
	describe('withdraw functionailty', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('300'));
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('100'),
				parseEther('100'),
				1800 // 30 mins tradePeriod
			);
			await trustMe.connect(seller).addTrade(
				buyer.address,
				sellerToken.address,
				buyerToken.address,
				parseEther('200'),
				parseEther('200'),
				3600 // 1 hour tradePeriod
			);
			await time.increase(1801);
			await trustMe.checkExpiredTrades();
		});
		it('Should revert if trade is not expired', async () => {
			await expect(trustMe.connect(seller).withdraw(1)).to.be.revertedWithCustomError(
				trustMe,
				'TradeIsNotExpired'
			);
		});
		it("Should withdraw seller's tokens if trade is expired", async () => {
			const sellerBalanceBefore = await sellerToken.balanceOf(seller.address);
			await trustMe.connect(seller).withdraw(0);
			const sellerBalanceAfter = await sellerToken.balanceOf(seller.address);
			expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(parseEther('100'));
		});
	});
});
