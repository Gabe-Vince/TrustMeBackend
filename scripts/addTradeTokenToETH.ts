import {Console} from 'console';
import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {TrustMe} from '../typechain';

const signer = process.env.PRIVATE_KEY;
const trustMeaddress = process.env.TRUSTME_ADDRESS;
const sellerTokenAddress = process.env.SELLER_TOKEN_ADDRESS;

const addTrade = async () => {
	const trustMe: TrustMe = await ethers.getContractAt('TrustMe', trustMeaddress as string);
	const sellerToken = await ethers.getContractAt('SellerToken', sellerTokenAddress as string);
	for (let i = 0; i < 5; i++) {
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
				tokenToSell: process.env.SELLER_TOKEN_ADDRESS as string,
				amountOfTokenToSell: parseEther('1'),
				tokenToBuy: ethers.constants.AddressZero,
				amountOfTokenToBuy: 0,
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: parseEther('0.001'),
			},
			deadline: 120,
			dateCreated: 0,
			status: 0,
		};
		console.log('Adding Trade...');
		const approveTx = await sellerToken.approve(trustMeaddress as string, parseEther('10'));
		await approveTx.wait();
		console.log('================================Approved================================');
		const tx = await trustMe.addTrade(trade);
		const receipt = await tx.wait();
		// console.log(receipt.events);
		console.log('================================Trade Added================================');
	}
};
addTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
