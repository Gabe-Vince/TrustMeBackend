import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Signer} from 'ethers';
import {formatEther, getContractAddress, id, parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerToken, BuyerNFT, SellerNFT, TrustMe} from '../../typechain/contracts';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import {log} from 'console';
describe('TrustMe', () => {
	let signers: SignerWithAddress[];
	let trustMe: TrustMe;
	let buyerToken: BuyerToken;
	let sellerToken: SellerToken;
	let sellerNFT: SellerNFT;
	let buyerNFT: BuyerNFT;

	let contractsDeployer: SignerWithAddress;
	let seller: SignerWithAddress;
	let buyer: SignerWithAddress;

	beforeEach(async () => {
		await deployments.fixture('all');

		trustMe = await ethers.getContract('TrustMe');
		buyerToken = await ethers.getContract('BuyerToken');
		sellerToken = await ethers.getContract('SellerToken');
		sellerNFT = await ethers.getContract('SellerNFT');
		buyerNFT = await ethers.getContract('BuyerNFT');
		signers = await ethers.getSigners();
		contractsDeployer = signers[0];

		seller = signers[1];
		buyer = signers[2];

		// transfer sellerToken to seller
		await sellerToken.transfer(seller.address, ethers.utils.parseEther('1000'));
		// transfer buyerToken to buyer
		await buyerToken.transfer(buyer.address, ethers.utils.parseEther('1000'));

		const tx = await buyerNFT.mint(buyer.address);
		await tx.wait();

		const tx2 = await sellerNFT.mint(seller.address);
		await tx2.wait();
	});

	/*************
	 * ADD TRADE *
	 *************/
	describe('addTrade functionality', () => {
		it('Should revert if seller,buyer,tokenToSell,tokenToBuy address is 0x0', async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: ethers.constants.AddressZero,
					tokenToSell: ethers.constants.AddressZero,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: ethers.constants.AddressZero,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: 0,
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: 0,
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'InvalidAddress');
		});

		it('Should revert if tokenToBuy is same as tokenToSell', async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: sellerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: 0,
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: 0,
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeSameToken');
		});
		it('Should revert if seller is trying to both sell and buy ETH at the same time', async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('100'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('200'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'InvalidInputs');
		});

		it('Should revert if seller and buyer is same', async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: seller.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: 0,
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: 0,
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'CannotTradeWithSelf');
		});
		it('Should revert if amount of tokenToSell and amount of ETH to sell is 0 and seller transfers no NFT', async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('0'),
					amountOfTokenToSell: parseEther('0'),
					amountOfETHToBuy: parseEther('100'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'InvalidInputs');
		});
		it('Should revert if amount of tokenToBuy and amount of ETH to buy is 0 and no NFT is bought', async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('100'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('0'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'InvalidInputs');
		});
		it("Should revert if Seller doesn't have enough tokenToSell", async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: 0, //here i made a change
					amountOfTokenToSell: parseEther('100000'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('300'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				})
			).to.be.revertedWith('ERC20: insufficient allowance');
		});

		it("Should revert if Seller doesn't have the NFT to sell", async () => {
			const tx = await sellerNFT
				.connect(seller)
				['safeTransferFrom(address,address,uint256)'](seller.address, contractsDeployer.address, 0);
			await tx.wait();
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('10000'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'NotNftOwner');
		});

		it("Should revert if Seller doesn't have enough ETH", async () => {
			await expect(
				trustMe.connect(seller).addTrade({
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('100000'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				})
			).to.be.revertedWithCustomError(trustMe, 'IncorrectAmoutOfETHTransferred');
		});

		it('Should revert if Seller did not transfer to the contract the required amount of ETH to sell', async () => {
			await expect(
				trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						addressNFTToSell: ethers.constants.AddressZero,
						tokenIdNFTToSell: 0,
						tokenToBuy: buyerToken.address,
						addressNFTToBuy: ethers.constants.AddressZero,
						tokenIdNFTToBuy: 0,
						amountOfETHToSell: parseEther('200'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: (await time.latest()) + 600, // 10 mins deadline
					},
					{value: parseEther('100')}
				)
			).to.be.revertedWithCustomError(trustMe, 'IncorrectAmoutOfETHTransferred');
		});

		it('Should add trade to state variables', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			const sellerId = await trustMe.getTradesIDsByUser(seller.address);
			const buyerId = await trustMe.getTradesIDsByUser(buyer.address);
			expect(sellerId).to.have.lengthOf(1);
			expect(buyerId).to.have.lengthOf(1);
		});

		it('Should emit TradeCreated event if trade is created successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: (await time.latest()) + 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			const timestamp = await time.latest();
			const trade = await trustMe.getTrade(0);
			await expect(tx).to.emit(trustMe, 'TradeCreated').withArgs(trade.id, seller.address, buyer.address);
		});

		it('Should create trade successfully', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			const tx = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);

			// await expect(tx)
			// 	.to.emit(trustMe, 'TradeCreated')
			// 	.withArgs([
			// 		buyer.address,
			// 		sellerToken.address,
			// 		ethers.constants.AddressZero,
			// 		0,
			// 		buyerToken.address,
			// 		ethers.constants.AddressZero,
			// 		0,
			// 		parseEther('200'),
			// 		parseEther('100'),
			// 		parseEther('0'),
			// 		parseEther('100'),
			// 		600, // 10 mins deadline
			// 		0,
			// 	]);
			expect(tx).to.emit(trustMe, 'TradeCreated');
			const txReceipt = await tx.wait();
			// console.log(txReceipt.events?.[2].args);
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

		it('Should transfer seller token to contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			const sellerBalance = await sellerToken.balanceOf(trustMe.address);
			expect(sellerBalance).to.equal(parseEther('100'));
		});
		it('Should transfer seller NFT to contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await sellerNFT.connect(seller).approve(trustMe.address, 0);
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			const NFTOwner = await sellerNFT.ownerOf(0);
			expect(NFTOwner).to.equal(trustMe.address);
		});

		it('Should transfer sellers ETHToSell to contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			console.log(sellerToken.address);
			console.log(ethers.constants.AddressZero);
			const contractETHBalance = await ethers.provider.getBalance(trustMe.address);
			expect(contractETHBalance).to.equal(parseEther('200'));
		});

		it('Should ascribe sellers ETH to sellers ETH balance in contract', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: ethers.constants.AddressZero,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: ethers.constants.AddressZero,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			const sellersETHBalanceInContract = await trustMe.tradeIdToETHFromSeller(0);

			expect(sellersETHBalanceInContract).to.equal(parseEther('200'));
		});
	});
	/*****************
	 * CONFIRM TRADE *
	 *****************/
	describe('confirmTrade functionality', () => {
		describe('sell tokens, NFT and ETH, buy only tokens and NFT', () => {
			beforeEach(async () => {
				await sellerToken.connect(seller).approve(trustMe.address, parseEther('1000'));
				await sellerNFT.connect(seller).approve(trustMe.address, 0);
				const addTrade = await trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						addressNFTToSell: sellerNFT.address,
						tokenIdNFTToSell: 0,
						tokenToBuy: buyerToken.address,
						addressNFTToBuy: buyerNFT.address,
						tokenIdNFTToBuy: 0,
						amountOfETHToSell: parseEther('9000'),
						amountOfTokenToSell: parseEther('1000'),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther('1000'),
						tradePeriod: 600, // 10 mins deadline
					},
					{value: parseEther('9000')}
				);
				await addTrade.wait();
			});

			it("Should revert if trade doesn't exist", async () => {
				expect(trustMe.connect(buyer).confirmTrade(2)).to.be.revertedWithPanic;
			});

			it('Should revert if buyer has insufficient tokens', async () => {
				const balanceBuyersTokens = await buyerToken.balanceOf(buyer.address);
				const tx = await buyerToken.connect(buyer).transfer(contractsDeployer.address, parseEther('1000'));
				await sellerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0); //line added to fix test
				await expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWith(
					'ERC20: insufficient allowance'
				);
			});

			it('Should revert if buyer does not own NFT to buy', async () => {
				const tx0 = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await tx0.wait();
				const tx = await buyerNFT
					.connect(buyer)
					['safeTransferFrom(address,address,uint256)'](buyer.address, contractsDeployer.address, 0);
				await tx.wait();
				await expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWithCustomError(
					trustMe,
					'NotNftOwner'
				);
			});

			it('Should revert if contract does not have allowance to transfer tokens to buy', async () => {
				const tx = await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWith(
					'ERC20: insufficient allowance'
				);
			});

			it('Should revert if contract does not have allowance to transfer NFT to buy', async () => {
				const tx = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await tx.wait();
				await expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWithCustomError(
					trustMe,
					'NftNotApproved'
				);
			});

			it('should transfer tokens to sell from contract to buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('1000'));
				expect(await sellerToken.balanceOf(trustMe.address)).to.equal(parseEther('0'));
			});

			it('should transfer NFT to sell from contract to buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const tx = await trustMe.connect(buyer).confirmTrade(0);
				await tx.wait();
				expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('1000'));
				const newOwner = await sellerNFT.ownerOf(0);
				expect(newOwner).to.equal(buyer.address);
			});

			it('should transfer ETHToSell from contract to buyer', async () => {
				const ETHBalanceBuyerBefore = await ethers.provider.getBalance(buyer.address);
				const tx0 = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				const txApproveTokenReceipt = await tx0.wait();
				const txCostApproveToken = txApproveTokenReceipt.gasUsed.mul(txApproveTokenReceipt.effectiveGasPrice);
				const tx1 = await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const txApproveNFTReceipt = await tx1.wait();
				const txCostApproveNFT = txApproveNFTReceipt.gasUsed.mul(txApproveNFTReceipt.effectiveGasPrice);

				const tx2 = await trustMe.connect(buyer).confirmTrade(0);
				const txReceipt = await tx2.wait();

				const txCostConfirm = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice);
				const txCostApprove = txCostApproveToken.add(txCostApproveNFT);
				const totalGasFees = txCostApprove.add(txCostConfirm);
				const ETHBalanceBuyerAfter = await ethers.provider.getBalance(buyer.address);
				const differenceETHBalanceBuyer = ETHBalanceBuyerAfter.sub(ETHBalanceBuyerBefore);
				expect(differenceETHBalanceBuyer.add(totalGasFees)).to.equal(parseEther('9000'));
				expect(await ethers.provider.getBalance(trustMe.address)).to.equal(parseEther('0'));
			});

			it('should reduce the sellers ETH balance in the contract by the transferred amount', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await trustMe.tradeIdToETHFromSeller(0)).to.equal(parseEther('0'));
			});

			it('should transfer the tokens to buy from buyer to seller', async () => {
				const tokenBalanceBuyerBefore = await buyerToken.balanceOf(buyer.address);
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('1000'));
				expect(await buyerToken.balanceOf(buyer.address)).to.equal(
					tokenBalanceBuyerBefore.sub(parseEther('1000'))
				);
			});
			it('should transfer the NFT to buy from buyer to seller', async () => {
				const tokenBalanceBuyerBefore = await buyerToken.balanceOf(buyer.address);
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0);
				expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('1000'));
				expect(await buyerNFT.ownerOf(0)).to.equal(seller.address);
			});

			it('should emit TradeConfirmed event', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const confirmTrade = await trustMe.connect(buyer).confirmTrade(0);
				await expect(confirmTrade)
					.to.emit(trustMe, 'TradeConfirmed')
					.withArgs(0, seller.address, buyer.address);
			});

			it('should revert if incorrect buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				expect(trustMe.connect(contractsDeployer).confirmTrade(0)).to.be.revertedWithCustomError(
					trustMe,
					'OnlyBuyer'
				);
			});

			it('should revert if deadline is expired', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await time.increase(601);
				expect(trustMe.connect(buyer).confirmTrade(0)).to.be.revertedWithCustomError(trustMe, 'TradeIsExpired');
			});

			it('Should update trade status to confirmed after trade is confirmed', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0);
				const trade = await trustMe.getTrade(0);
				expect(trade.status).to.equal(1); // 1 = confirmed in TradeStatus enum
			});
		});

		describe('sell only tokens and NFT, buy tokens, NFT and ETH', () => {
			beforeEach(async () => {
				await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
				await sellerNFT.connect(seller).approve(trustMe.address, 0);
				const addTrade = await trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						addressNFTToSell: sellerNFT.address,
						tokenIdNFTToSell: 0,
						tokenToBuy: buyerToken.address,
						addressNFTToBuy: buyerNFT.address,
						tokenIdNFTToBuy: 0,
						amountOfETHToSell: parseEther('0'),
						amountOfTokenToSell: parseEther('100'),
						amountOfETHToBuy: parseEther('6000'),
						amountOfTokenToBuy: parseEther('100'),
						tradePeriod: 600, // 10 mins deadline
					},
					{value: parseEther('0')}
				);
				await addTrade.wait();
			});

			it("Should revert if trade doesn't exist", async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				expect(trustMe.connect(buyer).confirmTrade(2, {value: parseEther('6000')})).to.be.revertedWithPanic;
			});

			it('Should revert if buyer has insufficient tokens', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const balanceBuyersTokens = await buyerToken.balanceOf(buyer.address);
				const tx = await buyerToken.connect(buyer).transfer(contractsDeployer.address, balanceBuyersTokens);
				await tx.wait();
				await expect(trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')})).to.be.revertedWith(
					'ERC20: transfer amount exceeds balance'
				);
			});

			it('Should revert if buyer is not owner of NFT to buy', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const tx = await buyerNFT
					.connect(buyer)
					['safeTransferFrom(address,address,uint256)'](buyer.address, contractsDeployer.address, 0);
				await tx.wait();
				await expect(
					trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')})
				).to.be.revertedWithCustomError(trustMe, 'NotNftOwner');
			});

			it('Should revert if contract has insufficient allowance to transfer tokens of buyer', async () => {
				const tx = await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await tx.wait();
				await expect(trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')})).to.be.revertedWith(
					'ERC20: insufficient allowance'
				);
			});

			it('Should revert if contract has no allowance to transfer NFT of buyer', async () => {
				const tx = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await tx.wait();
				await expect(
					trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')})
				).to.be.revertedWithCustomError(trustMe, 'NftNotApproved');
			});

			it('Should revert if buyer does not transfer to the contract the required ETH to buy', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await expect(
					trustMe.connect(buyer).confirmTrade(0, {value: parseEther('0')})
				).to.be.revertedWithCustomError(trustMe, 'IncorrectAmoutOfETHTransferred');
			});

			it('should transfer tokens to sell from contract to buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});
				expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('100'));
				expect(await sellerToken.balanceOf(trustMe.address)).to.equal(parseEther('0'));
			});
			it('should transfer NFT to sell from contract to buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('1000'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});
				expect(await sellerToken.balanceOf(buyer.address)).to.equal(parseEther('100'));
				expect(await sellerToken.balanceOf(trustMe.address)).to.equal(parseEther('0'));
				expect(await sellerNFT.ownerOf(0)).to.equal(buyer.address);
			});

			it('should transfer ETHToBuy from buyer (via the contract) to seller', async () => {
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const ETHBalanceBuyerBefore = await ethers.provider.getBalance(buyer.address);
				const ETHBalanceSellerBefore = await ethers.provider.getBalance(seller.address);
				const tx1 = await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				const txApproveReceipt = await tx1.wait();
				const txCostApprove = txApproveReceipt.gasUsed.mul(txApproveReceipt.effectiveGasPrice);

				const tx2 = await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});
				const txReceipt = await tx2.wait();

				const txCostConfirm = txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice);
				const totalGasFees = txCostApprove.add(txCostConfirm);
				const ETHBalanceBuyerAfter = await ethers.provider.getBalance(buyer.address);
				const ETHBalanceSellerAfter = await ethers.provider.getBalance(seller.address);
				const differenceETHBalanceBuyer = ETHBalanceBuyerBefore.sub(ETHBalanceBuyerAfter);
				const differenceETHBalanceSeller = ETHBalanceSellerAfter.sub(ETHBalanceSellerBefore);
				expect(differenceETHBalanceBuyer.sub(totalGasFees)).to.equal(parseEther('6000'));
				expect(differenceETHBalanceSeller).to.equal(parseEther('6000'));
			});

			it('should transfer the tokens to buy from buyer to seller', async () => {
				const tokenBalanceBuyerBefore = await buyerToken.balanceOf(buyer.address);
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});
				expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('100'));
				expect(await buyerToken.balanceOf(buyer.address)).to.equal(
					tokenBalanceBuyerBefore.sub(parseEther('100'))
				);
			});
			it('should transfer the NFT to buy from buyer to seller', async () => {
				const tokenBalanceBuyerBefore = await buyerToken.balanceOf(buyer.address);
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				const tx = await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await tx.wait();
				await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});
				expect(await buyerToken.balanceOf(seller.address)).to.equal(parseEther('100'));
				expect(await buyerToken.balanceOf(buyer.address)).to.equal(
					tokenBalanceBuyerBefore.sub(parseEther('100'))
				);
				expect(await buyerNFT.ownerOf(0)).to.equal(seller.address);
			});

			it('should emit TradeConfirmed event', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				const confirmTrade = await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});

				await expect(confirmTrade)
					.to.emit(trustMe, 'TradeConfirmed')
					.withArgs(0, seller.address, buyer.address);
			});

			it('should revert if incorrect buyer', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				expect(
					trustMe.connect(contractsDeployer).confirmTrade(0, {value: parseEther('6000')})
				).to.be.revertedWithCustomError(trustMe, 'OnlyBuyer');
			});

			it('should revert if deadline is expired', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await time.increase(601);
				expect(
					trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')})
				).to.be.revertedWithCustomError(trustMe, 'TradeIsExpired');
			});

			it('Should update trade status to confirmed after trade is confirmed', async () => {
				await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));
				await buyerNFT.connect(buyer).approve(trustMe.address, 0);
				await trustMe.connect(buyer).confirmTrade(0, {value: parseEther('6000')});
				const trade = await trustMe.getTrade(0);
				expect(trade.status).to.equal(1); // 1 = confirmed in TradeStatus enum
			});
		});
	});
	/****************
	 * CANCEL TRADE *
	 ****************/
	describe('cancelTrade functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
			await sellerNFT.connect(seller).approve(trustMe.address, 0);
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('9000'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('9000')}
			);
		});
		it('Should revert if not seller or buyer', async () => {
			expect(trustMe.connect(contractsDeployer).cancelTrade(0)).to.be.revertedWithCustomError(
				trustMe,
				'OnlySeller'
			);
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
			expect(diffETHBalanceSeller.add(txCost)).to.eq(parseEther('9000'));
			expect(diffETHBalanceContract).to.eq(parseEther('9000'));
		});

		it("Should reduce seller's ETH balance in contract", async () => {
			const sellerETHBalanceInContractBefore = await trustMe.tradeIdToETHFromSeller(0);
			await trustMe.connect(seller).cancelTrade(0);
			const sellerETHBalanceInContractAfter = await trustMe.tradeIdToETHFromSeller(0);
			expect(sellerETHBalanceInContractBefore.sub(sellerETHBalanceInContractAfter)).to.eq(parseEther('9000'));
		});

		it("Should return seller's tokens", async () => {
			const balanceSellerBefore = await sellerToken.balanceOf(seller.address);
			const balanceContractBefore = await sellerToken.balanceOf(trustMe.address);
			await trustMe.connect(seller).cancelTrade(0);
			const balanceSellerAfter = await sellerToken.balanceOf(seller.address);
			const balanceContractAfter = await sellerToken.balanceOf(trustMe.address);
			expect(balanceSellerAfter).to.eq(balanceSellerBefore.add(parseEther('100')));
			expect(balanceContractBefore).to.eq(balanceContractAfter.add(parseEther('100')));
		});
		it("Should return seller's NFT", async () => {
			const ownerBefore = await sellerNFT.ownerOf(0);
			await trustMe.connect(seller).cancelTrade(0);
			expect(ownerBefore).to.eq(trustMe.address);
			expect(await sellerNFT.ownerOf(0)).to.eq(seller.address);
		});

		it('Should emit TradeCancelled event', async () => {
			const cancelTrade = await trustMe.connect(seller).cancelTrade(0);
			await expect(cancelTrade).to.emit(trustMe, 'TradeCanceled').withArgs(0, seller.address, buyer.address);
		});

		it('Should update trade status to Canceled after trade is cancelled', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('900'));
			const equalToken = 900 / 9;

			for (let i = 0; i < 9; i++) {
				const txMnt = await sellerNFT.mint(seller.address);
				await txMnt.wait();
				await sellerNFT.connect(seller).approve(trustMe.address, i + 1);
				let tx = await trustMe.connect(seller).addTrade(
					{
						buyer: buyer.address,
						tokenToSell: sellerToken.address,
						addressNFTToSell: sellerNFT.address,
						tokenIdNFTToSell: i + 1,
						tokenToBuy: buyerToken.address,
						addressNFTToBuy: buyerNFT.address,
						tokenIdNFTToBuy: i + 1,
						amountOfETHToSell: parseEther('50'),
						amountOfTokenToSell: parseEther(equalToken.toString()),
						amountOfETHToBuy: parseEther('0'),
						amountOfTokenToBuy: parseEther(equalToken.toString()),
						tradePeriod: 600, // 10 mins deadline
					},
					{value: parseEther('50')}
				);
				await tx.wait();
			}
			await trustMe.connect(seller).cancelTrade(0);
			const trade = await trustMe.getTrade(0);
			expect(trade.status).to.equal(2); // 2 = Cancelled
		});

		it('Should remove canceled trade from pendingTrade array', async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('500'));
			for (let i = 0; i < 3; i++) {
				const txMnt = await sellerNFT.mint(seller.address);
				await txMnt.wait();
				await sellerNFT.connect(seller).approve(trustMe.address, i + 1);
			}
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 1,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 1,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 2,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 2,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('200'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('200'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 3,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 3,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('200'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('200'),
					tradePeriod: 600, // 10 mins deadline
				},
				{value: parseEther('200')}
			);
			const pendingTrades = await trustMe.getPendingTradesIDs();
			await trustMe.connect(seller).cancelTrade(1);
			const pendingTradesAfter = await trustMe.getPendingTradesIDs();
			const indexOfCancelledTrade = pendingTrades.indexOf(ethers.BigNumber.from(1));
			expect(indexOfCancelledTrade).to.equal(-1);
			expect(pendingTradesAfter.length).to.equal(3);
		});
	});
	/************
	 * WITHDRAW *
	 ************/
	describe('withdraw functionality', () => {
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('300'));
			for (let i = 0; i < 2; i++) {
				const txMnt = await sellerNFT.mint(seller.address);
				await txMnt.wait();
				await sellerNFT.connect(seller).approve(trustMe.address, i);
			}
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 0,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 0,
					amountOfETHToSell: parseEther('6000'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 1800, // 30 mins deadline
				},
				{value: parseEther('6000')}
			);
			await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 1,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 1,
					amountOfETHToSell: parseEther('3000'),
					amountOfTokenToSell: parseEther('200'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('200'),
					tradePeriod: 3600, // 1 hour deadline
				},
				{value: parseEther('3000')}
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
			expect(diffETHBalanceSeller.add(txCost)).to.eq(parseEther('6000'));
			expect(diffETHBalanceContract).to.eq(parseEther('6000'));
		});

		it("Should reduce seller's ETH balance in contract", async () => {
			const sellerETHBalanceInContractBefore = await trustMe.tradeIdToETHFromSeller(0);
			await trustMe.connect(seller).withdraw(0);
			const sellerETHBalanceInContractAfter = await trustMe.tradeIdToETHFromSeller(0);
			expect(sellerETHBalanceInContractBefore.sub(sellerETHBalanceInContractAfter)).to.eq(parseEther('6000'));
		});

		it("Should withdraw seller's tokens if withdrawn after trade has expired", async () => {
			const sellerBalanceBefore = await sellerToken.balanceOf(seller.address);
			await trustMe.connect(seller).withdraw(0);
			const sellerBalanceAfter = await sellerToken.balanceOf(seller.address);
			expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(parseEther('100'));
		});
		it("Should withdraw seller's NFT if withdrawn after trade has expired", async () => {
			const ownerBefore = await sellerNFT.ownerOf(0);
			const tx = await trustMe.connect(seller).withdraw(0);
			await tx.wait();
			const ownerAfter = await sellerNFT.ownerOf(0);
			expect(ownerBefore).to.equal(trustMe.address);
			expect(ownerAfter).to.equal(seller.address);
		});
	});

	/*************
	 * CHAINLINK *
	 *************/
	describe('checkExpiredTrades functionality', () => {
		let pendingTrades = [];
		beforeEach(async () => {
			await sellerToken.connect(seller).approve(trustMe.address, parseEther('350'));
			for (let i = 0; i < 3; i++) {
				const txMnt = await sellerNFT.mint(seller.address);
				await txMnt.wait();
				await sellerNFT.connect(seller).approve(trustMe.address, i + 1);
			}
			const tx1 = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 1,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 1,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('100'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('100'),
					tradePeriod: 1800, // 30 mins deadline
				},
				{value: parseEther('200')}
			);
			await tx1.wait();
			const tx2 = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 2,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 2,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('200'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('200'),
					tradePeriod: 3600, // 1 hour deadline
				},
				{value: parseEther('200')}
			);
			await tx2.wait();
			const tx3 = await trustMe.connect(seller).addTrade(
				{
					buyer: buyer.address,
					tokenToSell: sellerToken.address,
					addressNFTToSell: sellerNFT.address,
					tokenIdNFTToSell: 3,
					tokenToBuy: buyerToken.address,
					addressNFTToBuy: buyerNFT.address,
					tokenIdNFTToBuy: 3,
					amountOfETHToSell: parseEther('200'),
					amountOfTokenToSell: parseEther('50'),
					amountOfETHToBuy: parseEther('0'),
					amountOfTokenToBuy: parseEther('200'),
					tradePeriod: 600, // 10 min
				},
				{value: parseEther('200')}
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
});
