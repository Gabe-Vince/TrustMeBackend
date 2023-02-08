import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerToken, TrustMe} from '../typechain';

const signer = process.env.PRIVATE_KEY;
const trustMeaddress = process.env.TRUSTME_ADDRESS;
const sellerTokenAddress = process.env.SELLER_TOKEN_ADDRESS;

const addTrade = async () => {
	const trustMe: TrustMe = await ethers.getContractAt('TrustMe', trustMeaddress as string);
	console.log('trustMeaddress: ', trustMeaddress);
	const sellerToken: SellerToken = await ethers.getContractAt('SellerToken', sellerTokenAddress as string);
	console.log('sellerTokenAddress: ', sellerTokenAddress);
	const trade = {
		tradeId: 0,
		seller: ethers.constants.AddressZero,
		buyer: '0x2306dA564868c47bb2C0123A25943cD54e6e8e2F',
		nft: {
			addressNFTToSell: ethers.constants.AddressZero,
			tokenIdNFTToSell: 0,
			addressNFTToBuy: ethers.constants.AddressZero,
			tokenIdNFTToBuy: 0,
		},
		token: {
			tokenToSell: process.env.SELLER_TOKEN_ADDRESS as string,
			amountOfTokenToSell: parseEther('10'),
			tokenToBuy: process.env.BUYER_TOKEN_ADDRESS as string,
			amountOfTokenToBuy: parseEther('10'),
		},
		eth: {
			amountOfETHToSell: 0,
			amountOfETHToBuy: 0,
		},
		deadline: 3600,
		dateCreated: 0,
		status: 0,
	};
	console.log('Adding Trade...');
	const approveTx = await sellerToken.approve(trustMeaddress as string, parseEther('10'));
	await approveTx.wait();
	console.log('================================Approved================================');
	const tx = await trustMe.addTrade(trade);
	console.log('================================Trade Added waiting for block================================');
	const receipt = await tx.wait();
	console.log('================================Trade Added================================');
	// console.log(receipt.events);
};
addTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
