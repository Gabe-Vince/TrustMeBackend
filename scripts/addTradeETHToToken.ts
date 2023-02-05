import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerToken, TrustMe} from '../typechain';

const signer = process.env.PRIVATE_KEY;
const trustMeaddress = process.env.TRUSTME_ADDRESS;
const sellerTokenAddress = process.env.SELLER_TOKEN_ADDRESS;

const addTrade = async () => {
	const trustMe: TrustMe = await ethers.getContractAt('TrustMe', trustMeaddress as string);
	const sellerToken: SellerToken = await ethers.getContractAt('SellerToken', sellerTokenAddress as string);

	const trade = {
		tradeId: 0,
		seller: ethers.constants.AddressZero,
		buyer: '0xdac418351bb0f47f3e30d3bd2f8fa7ce53dcda22',
		nft: {
			addressNFTToSell: ethers.constants.AddressZero,
			tokenIdNFTToSell: 0,
			addressNFTToBuy: ethers.constants.AddressZero,
			tokenIdNFTToBuy: 0,
		},
		token: {
			tokenToSell: ethers.constants.AddressZero,
			amountOfTokenToSell: 0,
			tokenToBuy: process.env.BUYER_TOKEN_ADDRESS as string,
			amountOfTokenToBuy: parseEther('10'),
		},
		eth: {
			amountOfETHToSell: parseEther('0.005'),
			amountOfETHToBuy: 0,
		},
		deadline: 600,
		dateCreated: 0,
		status: 0,
	};
	console.log('Adding Trade...');
	const tx = await trustMe.addTrade(trade, {value: parseEther('0.005')});
	const receipt = await tx.wait();
	console.log(receipt.events);
};
addTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
