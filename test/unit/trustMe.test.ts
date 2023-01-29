import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Signer } from 'ethers';
import { formatEther, getContractAddress, id, parseEther } from 'ethers/lib/utils';
import { deployments, ethers } from 'hardhat';
import { BuyerToken, SellerToken, TrustMe } from '../../typechain';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { log } from 'console';
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
				trustMe.connect(seller).addTrade({
					buyer: ethers.constants.AddressZero,
					tokenToSell: ethers.constants.AddressZero,
					tokenToBuy: ethers.constants.AddressZero,
					amountOfETHToSell: 0,
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: 0,
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600 // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'InvalidAddress');
		});

		it('Should revert if tokenToBuy is same as tokenToSell', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: sellerToken.address,
						amountOfETHToSell: 0,
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: 0,
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: 600 // 10 mins deadline
					})
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeSameToken');
		});
		it('Should revert if seller is trying to both sell and buy ETH at the same time', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('100'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('200'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: 600 // 10 mins deadline
					})
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeSameToken');
		});

		it('Should revert if seller and buyer is same', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: seller.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: 0,
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: 0,
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: (await time.latest()) + 600 // 10 mins deadline
					}
				)
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeWithSelf');
		});
		it('Should revert if amount of tokenToSell and amount of ETH to sell is 0', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('0'),
						amountOfTokenToSell: parseEther('0'),
						amountOfETHToBuy: parseEther('100'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: (await time.latest()) + 600 // 10 mins deadline
					}
				)
			).to.be.revertedWithCustomError(trustMe, 'InvalidAmount');
		});
		it('Should revert if amount of tokenToBuy and amount of ETH to buy is 0', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('100'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('0'),
						tradePeriod: (await time.latest()) + 600 // 10 mins deadline
					}
				)
			).to.be.revertedWithCustomError(trustMe, 'InvalidAmount');
		});
		it("Should revert if Seller doesn't have enough tokenToSell", async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('200'),
						amountOfTokenToSell: parseEther('100000'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('300'),
						tradePeriod: (await time.latest()) + 600 // 10 mins deadline
					}
				)
			).to.be.revertedWithCustomError(trustMe, 'InsufficientBalance');
		});
		it("Should revert if Seller doesn't have enough ETH", async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('10000'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: (await time.latest()) + 600 // 10 mins deadline
					}
				)
			).to.be.revertedWithCustomError(trustMe, 'IncorrectAmoutOfETHTransferred');
		});

		it("Should revert if Seller did not transfer to the contract the required amount of ETH to sell", async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('200'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: (await time.latest()) + 600 // 10 mins deadline
					}, { value: parseEther('100') }
				)
			).to.be.revertedWithCustomError(trustMe, 'IncorrectAmoutOfETHTransferred');
		});

		it('Should add trade to state variables', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					tokenToBuy: buyerToken.address,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600 // 10 mins deadline
				}, { value: parseEther('200') }
			);
			const sellerId = await trustMe.getTradesIDsByUser(seller.address);
			const buyerId = await trustMe.getTradesIDsByUser(buyer.address);
			expect(sellerId).to.have.lengthOf(1);
			expect(buyerId).to.have.lengthOf(1);
		});

		it('Should emit TradeCreated event if trade is created successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('100'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('100'),
				tradePeriod: (await time.latest()) + 600 // 10 mins deadline
			}, { value: parseEther('200') });
			const timestamp = await time.latest();
			const trade = await trustMe.getTrade(0);
			await expect(tx).to.emit(trustMe, 'TradeCreated').withArgs(trade.id, seller.address, buyer.address);
		});

		it('Should create trade successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					tokenToBuy: buyerToken.address,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600 // 10 mins deadline
				}, { value: parseEther('200') }
			);
			const timestamp = await time.latest();

			const trade = await trustMe.getTrade(0);
			expect(trade.seller).to.equal(seller.address);
			expect(trade.buyer).to.equal(buyer.address);
			expect(trade.tokenToSell).to.equal(sellerToken.address);
			expect(trade.tokenToBuy).to.equal(buyerToken.address);
			expect(trade.amountOfETHToSell).to.equal(parseEther('200'));
			expect(trade.amountOfTokenToSell).to.equal(parseEther('100'));
			expect(trade.amountOfETHToBuy).to.equal(parseEther('0'));
			expect(trade.amountOfTokenToBuy).to.equal(parseEther('100'));
			expect(trade.deadline).to.equal(timestamp + 600);
		});

		it('Should add seller token into contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					tokenToBuy: buyerToken.address,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600 // 10 mins deadline
				}, { value: parseEther('200') }
			);
			const sellerBalance = await sellerToken.balanceOf(trustMe.address);
			expect(sellerBalance).to.equal(parseEther('100'));
		});

		it('Should transfer sellers ETHToSell to contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					tokenToBuy: buyerToken.address,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600 // 10 mins deadline
				}, { value: parseEther('200') }
			);
			const contractETHBalance = await ethers.provider.getBalance(trustMe.address);
			expect(contractETHBalance).to.equal(parseEther('200'));
		});

		it('Should ascribe sellers ETH to sellers ETH balance in contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					tokenToBuy: buyerToken.address,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600 // 10 mins deadline
				}, { value: parseEther('200') }
			);
			const sellersETHBalanceInContract = await trustMe.sellersToContractETHBalance(seller.address);

			expect(sellersETHBalanceInContract).to.equal(parseEther('200'));
		});
	});

	describe('confirmTrade functionality', () => {

		describe('sell both tokens and ETH, buy only tokens', () => {
			beforeEach(async () => {
				await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
				const addTrade = await trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('200'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: 600 // 10 mins deadline
					}, { value: parseEther('200') }
				);
				await addTrade.wait();
			});

			it("Should revert if trade doesn't exist", async () => {
				expect(trustMe.connect(buyer).confirmTrade(2)).to.be.revertedWithPanic;
			});

			it('Should revert if buyer has insufficient tokens', async () => {
				const balanceBuyersTokens = await buyerToken.balanceOf(buyer.address);
				const tx = await buyerToken.connect(buyer).transfer(contractsDeployer.address, balanceBuyersTokens);
				await tx.wait();
				await expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWithCustomError(trustMe, 'InsufficientAllowance');
			});

			it('Should revert if allowance is not approved', async () => {
				await expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWithCustomError(
					trustMe,
					'InsufficientAllowance'
				);
			});

			it('should transfer tokens to sell in contract to buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('100'));
				expect(await sellerToken.balanceOf(trustMe.address)).to.equal(parseEther('0'));
			});

			it('should transfer ETHToSell from contract to buyer', async () => {
				const ETHBalanceBuyerBefore = await ethers.provider.getBalance(buyer.address);
				const tx1 = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				const txApproveReceipt = await tx1.wait();
				const txCostApprove = txApproveReceipt.gasUsed.mul(txApproveReceipt.effectiveGasPrice);

				const tx2 = await trustMe.connect(buyer).confirmTrade(0);
				const txReceipt = await tx2.wait();

				const txCostConfirm = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice);
				const totalGasFees = txCostApprove.add(txCostConfirm);
				const ETHBalanceBuyerAfter = await ethers.provider.getBalance(buyer.address);
				const differenceETHBalanceBuyer = ETHBalanceBuyerAfter.sub(ETHBalanceBuyerBefore);
				expect(differenceETHBalanceBuyer.add(totalGasFees)).to.equal(parseEther('200'));
				expect(await ethers.provider.getBalance(trustMe.address)).to.equal(parseEther('0'));
			});

			it('should reduce the sellers ETH balance in the contract by the transferred amount', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await trustMe.sellersToContractETHBalance(seller.address)).to.equal(parseEther('0'));
			});

			it('should transfer the tokens to buy from buyer to seller', async () => {
				const tokenBalanceBuyerBefore = await buyerToken.balanceOf(buyer.address);
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('100'));
				expect(await buyerToken.balanceOf(buyer.address)).to.equal(tokenBalanceBuyerBefore.sub(parseEther('100')));
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

		describe('sell only tokens, buy both tokens and ETH', () => {
			beforeEach(async () => {
				await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
				const addTrade = await trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('0'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('200'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: 600 // 10 mins deadline
					}, { value: parseEther('0') }
				);
				await addTrade.wait();
			});

			it("Should revert if trade doesn't exist", async () => {
				expect(trustMe.connect(buyer).confirmTrade(2, { value: parseEther('200') })).to.be.revertedWithPanic;
			});

			it('Should revert if buyer has insufficient tokens', async () => {
				const balanceBuyersTokens = await buyerToken.balanceOf(buyer.address);
				const tx = await buyerToken.connect(buyer).transfer(contractsDeployer.address, balanceBuyersTokens);
				await tx.wait();
				await expect(trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') })).to.be.revertedWithCustomError(trustMe, 'InsufficientAllowance');
			});

			it('Should revert if allowance is not approved', async () => {
				await expect(trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') })).to.be.revertedWithCustomError(
					trustMe,
					'InsufficientAllowance'
				);
			});

			it('Should revert if buyer does not transfer to the contract the required ETH to buy', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await expect(trustMe.connect(buyer).confirmTrade(0, { value: parseEther('0') })).to.be.revertedWithCustomError(
					trustMe,
					'IncorrectAmoutOfETHTransferred'
				);
			});

			it('should transfer tokens to sell in contract to buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') });
				expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('100'));
				expect(await sellerToken.balanceOf(trustMe.address)).to.equal(parseEther('0'));
			});

			it('should transfer ETHToBuy from buyer (via the contract) to seller', async () => {
				const ETHBalanceBuyerBefore = await ethers.provider.getBalance(buyer.address);
				const ETHBalanceSellerBefore = await ethers.provider.getBalance(seller.address);
				const tx1 = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				const txApproveReceipt = await tx1.wait();
				const txCostApprove = txApproveReceipt.gasUsed.mul(txApproveReceipt.effectiveGasPrice);

				const tx2 = await trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') });
				const txReceipt = await tx2.wait();

				const txCostConfirm = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice);
				const totalGasFees = txCostApprove.add(txCostConfirm);
				const ETHBalanceBuyerAfter = await ethers.provider.getBalance(buyer.address);
				const ETHBalanceSellerAfter = await ethers.provider.getBalance(seller.address);
				const differenceETHBalanceBuyer = ETHBalanceBuyerBefore.sub(ETHBalanceBuyerAfter);
				const differenceETHBalanceSeller = ETHBalanceSellerAfter.sub(ETHBalanceSellerBefore);
				expect(differenceETHBalanceBuyer.sub(totalGasFees)).to.equal(parseEther('200'));
				expect(differenceETHBalanceSeller).to.equal(parseEther('200'));
			});

			it('should transfer the tokens to buy from buyer to seller', async () => {
				const tokenBalanceBuyerBefore = await buyerToken.balanceOf(buyer.address);
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') });
				expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('100'));
				expect(await buyerToken.balanceOf(buyer.address)).to.equal(tokenBalanceBuyerBefore.sub(parseEther('100')));
			});

			it('should emit TradeConfirmed event', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				const confirmTrade = await trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') });

				await expect(confirmTrade).to.emit(trustMe, 'TradeConfirmed').withArgs(0, seller.address, buyer.address);
			});

			it('should revert if incorrect buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				expect(trustMe.connect(contractsDeployer).confirmTrade(0, { value: parseEther('200') })).to.be.revertedWithCustomError(
					trustMe,
					'OnlyBuyer'
				);
			});

			it('should revert if deadline is expired', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await time.increase(601);
				expect(trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') })).to.be.revertedWithCustomError(trustMe, 'TradeIsExpired');
			});

			it('Should update trade status to confirmed after trade is confirmed', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await trustMe.connect(buyer).confirmTrade(0, { value: parseEther('200') });
				const trade = await trustMe.getTrade(0);
				expect(trade.status).to.equal(1); // 1 = confirmed in TradeStatus enum
			});
		});
	});

	describe('cancelTrade functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('100'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('100'),
				tradePeriod: 600 // 10 mins deadline
			}, { value: parseEther('200') }
			);
		});
		it('Should revert if not seller or buyer', async () => {
			expect(trustMe.connect(contractsDeployer).cancelTrade(0)).to.be.revertedWithCustomError(trustMe, 'OnlySellerOrBuyer');
		});
		it("Should revert if trade doesn't exist", async () => {
			expect(trustMe.connect(seller).cancelTrade(1)).to.be.revertedWithPanic;
		});

		it('Should revert if deadline is expired', async () => {
			await time.increase(601);
			expect(trustMe.connect(seller).cancelTrade(0)).to.be.revertedWithCustomError(trustMe, 'TradeIsExpired');
		});

		it("Should return seller's ETH", async () => {
			const sellerETHBalanceBefore = await ethers.provider.getBalance(seller.address);
			const contractETHBalanceBefore = await ethers.provider.getBalance(trustMe.address);
			const txResponse = await trustMe.connect(seller).cancelTrade(0);
			const txReceipt = await txResponse.wait();
			const txCost = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice);
			const sellerETHBalanceAfter = await ethers.provider.getBalance(seller.address);
			const contractETHBalanceAfter = await ethers.provider.getBalance(trustMe.address);
			const diffETHBalanceSeller = sellerETHBalanceAfter.sub(sellerETHBalanceBefore);
			const diffETHBalanceContract = contractETHBalanceBefore.sub(contractETHBalanceAfter);
			expect(diffETHBalanceSeller.add(txCost)).to.eq(parseEther('200'));
			expect(diffETHBalanceContract).to.eq(parseEther('200'));
		});

		it("Should reduce seller's ETH balance in contract", async () => {
			const sellerETHBalanceInContractBefore = await trustMe.sellersToContractETHBalance(seller.address);
			await trustMe.connect(seller).cancelTrade(0);
			const sellerETHBalanceInContractAfter = await trustMe.sellersToContractETHBalance(seller.address);
			expect(sellerETHBalanceInContractBefore.sub(sellerETHBalanceInContractAfter)).to.eq(parseEther('200'));
		});

		it("Should return seller's tokensToSell", async () => {
			const balanceSellerBefore = await sellerToken.balanceOf(seller.address);
			const balanceContractBefore = await sellerToken.balanceOf(trustMe.address);
			await trustMe.connect(seller).cancelTrade(0);
			const balanceSellerAfter = await sellerToken.balanceOf(seller.address);
			const balanceContractAfter = await sellerToken.balanceOf(trustMe.address);
			expect(balanceSellerAfter).to.eq(balanceSellerBefore.add(parseEther('100')));
			expect(balanceContractBefore).to.eq(balanceContractAfter.add(parseEther('100')));
		});

		it('Should emit TradeCancelled event', async () => {
			const cancelTrade = await trustMe.connect(seller).cancelTrade(0);
			await expect(cancelTrade).to.emit(trustMe, 'TradeCanceled').withArgs(0, seller.address, buyer.address);
		});

		it('Should update trade status to Canceled after trade is cancelled', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('900'));
			const equalToken = 900 / 9;

			for (let i = 0; i < 9; i++) {
				let tx = await trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						tokenToBuy: buyerToken.address,
						amountOfETHToSell: parseEther('200'),
						amountOfTokenToSell: parseEther(equalToken.toString()),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther(equalToken.toString()),
						tradePeriod: 600 // 10 mins deadline
					}, { value: parseEther('200') }
				);
				await tx.wait();
			}

			await trustMe.connect(seller).cancelTrade(0);
			const trade = await trustMe.getTrade(0);
			expect(trade.status).to.equal(2); // 2 = Cancelled
		});

		it('Should remove canceled trade from pendingTrade array', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('500'));
			await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('100'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('100'),
				tradePeriod: 600 // 10 mins deadline
			}, { value: parseEther('200') }
			);
			await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('200'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('200'),
				tradePeriod: 600 // 10 mins deadline
			}, { value: parseEther('200') }
			);
			await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('200'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('200'),
				tradePeriod: 600 // 10 mins deadline
			}, { value: parseEther('200') }
			);
			const pendingTrades = await trustMe.getPendingTradesIDs();
			await trustMe.connect(seller).cancelTrade(1);
			const pendingTradesAfter = await trustMe.getPendingTradesIDs();
			const indexOfCancelledTrade = pendingTrades.indexOf(ethers.BigNumber.from(1))
			expect(indexOfCancelledTrade).to.equal(-1);
			expect(pendingTradesAfter.length).to.equal(3);
		});
	});
	/************************
	 * CHAINLINK AUTOMATION *
	 ************************/

	describe('checkExpiredTrades functionality', () => {
		let pendingTrades = [];
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('350'));
			const tx1 = await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('100'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('100'),
				tradePeriod: 1800 // 30 mins deadline
			}, { value: parseEther('200') }
			);
			await tx1.wait();
			const tx2 = await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('200'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('200'),
				tradePeriod: 3600 // 1 hour deadline
			}, { value: parseEther('200') }
			);
			await tx2.wait();
			const tx3 = await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('50'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('200'),
				tradePeriod: 600 // 10 min
			}, { value: parseEther('200') }
			);
			await tx3.wait();
			pendingTrades = await trustMe.getPendingTradesIDs();
		});
		it('Should change trade.status to expired if deadline has expired', async () => {
			await time.increase(2400);
			let trade1Before = await trustMe.getTrade(0);
			const statusTrade1Before = trade1Before.status;
			await trustMe.checkExpiredTrades();
			let trade1After = await trustMe.getTrade(0);
			const statusTrade1After = trade1After.status;
			const trade2 = await trustMe.getTrade(1);
			const statusTrade2After = trade2.status;
			const trade3 = await trustMe.getTrade(2);
			const statusTrade3After = trade3.status;

			expect(statusTrade1After).to.equal(3);
			expect(statusTrade2After).to.equal(0);
			expect(statusTrade3After).to.equal(3);
			// expect(await (await trustMe.getTrade(0)).status).to.equal(3); // 3 = Expired
			// expect(await (await trustMe.getTrade(1)).status).to.equal(0); // 1 = Pending
		});

		it("Should remove trade from pendingTrades array if trade's deadline has expired", async () => {
			await ethers.provider.send('evm_increaseTime', [2400]);
			await ethers.provider.send('evm_mine', []);
			const pendingTradesBefore = await trustMe.getPendingTradesIDs();

			const tx = await trustMe.checkExpiredTrades();
			await tx.wait();

			const pendingTradesAfter = await trustMe.getPendingTradesIDs();

			expect(pendingTradesAfter.length).to.equal(1);
			expect(pendingTradesAfter[0]).to.equal(1);
		});

		it('Should emit TradeExpired event if trade deadline has expired', async () => {
			await time.increase(1801);
			const tradeExpired = await trustMe.checkExpiredTrades();
			await expect(tradeExpired).to.emit(trustMe, 'TradeExpired').withArgs(0, seller.address, buyer.address);
		});
	});
	describe('withdraw functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('300'));
			await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('100'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('100'),
				tradePeriod: 1800 // 30 mins deadline
			}, { value: parseEther('200') }
			);
			await trustMe.connect(seller).addTrade({
				buyer: buyer.address,
				tokenToSell: sellerToken.address,
				tokenToBuy: buyerToken.address,
				amountOfETHToSell: parseEther('200'),
				amountOfTokenToSell: parseEther('200'),
				amountOfETHToBuy: parseEther('0'),
				amountOfTokenToBuy: parseEther('200'),
				tradePeriod: 3600 // 1 hour deadline
			}, { value: parseEther('200') }
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

		it("Should return seller's ETH", async () => {
			const sellerETHBalanceBefore = await ethers.provider.getBalance(seller.address);
			const contractETHBalanceBefore = await ethers.provider.getBalance(trustMe.address);
			const txResponse = await trustMe.connect(seller).withdraw(0);
			const txReceipt = await txResponse.wait();
			const txCost = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice);
			const sellerETHBalanceAfter = await ethers.provider.getBalance(seller.address);
			const contractETHBalanceAfter = await ethers.provider.getBalance(trustMe.address);
			const diffETHBalanceSeller = sellerETHBalanceAfter.sub(sellerETHBalanceBefore);
			const diffETHBalanceContract = contractETHBalanceBefore.sub(contractETHBalanceAfter);
			expect(diffETHBalanceSeller.add(txCost)).to.eq(parseEther('200'));
			expect(diffETHBalanceContract).to.eq(parseEther('200'));
		});

		it("Should reduce seller's ETH balance in contract", async () => {
			const sellerETHBalanceInContractBefore = await trustMe.sellersToContractETHBalance(seller.address);
			await trustMe.connect(seller).withdraw(0);
			const sellerETHBalanceInContractAfter = await trustMe.sellersToContractETHBalance(seller.address);
			expect(sellerETHBalanceInContractBefore.sub(sellerETHBalanceInContractAfter)).to.eq(parseEther('200'));
		});

		it("Should withdraw seller's tokens if trade is expired", async () => {
			const sellerBalanceBefore = await sellerToken.balanceOf(seller.address);
			await trustMe.connect(seller).withdraw(0);
			const sellerBalanceAfter = await sellerToken.balanceOf(seller.address);
			expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(parseEther('100'));
		});
	});
});