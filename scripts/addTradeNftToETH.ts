import {Console} from 'console';
import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerNFT, SellerToken, TrustMe} from '../typechain';

const signer = process.env.PRIVATE_KEY;
const trustMeaddress = process.env.TRUSTME_ADDRESS;
const sellerNftAddress = process.env.SELLER_NFT_ADDRESS;

const addTrade = async () => {
	const trustMe: TrustMe = await ethers.getContractAt('TrustMe', trustMeaddress as string);

	const sellerNft: SellerNFT = await ethers.getContractAt('SellerNFT', sellerNftAddress as string);

	const trade = {
		tradeId: 0,
		seller: ethers.constants.AddressZero,
		buyer: '0xdac418351bb0f47f3e30d3bd2f8fa7ce53dcda22',
		nft: {
			addressNFTToSell: process.env.SELLER_NFT_ADDRESS as string,
			tokenIdNFTToSell: 0,
			addressNFTToBuy: ethers.constants.AddressZero,
			tokenIdNFTToBuy: 0,
		},
		token: {
			tokenToSell: ethers.constants.AddressZero,
			amountOfTokenToSell: 0,
			tokenToBuy: ethers.constants.AddressZero,
			amountOfTokenToBuy: 0,
		},
		eth: {
			amountOfETHToSell: 0,
			amountOfETHToBuy: parseEther('0.005'),
		},
		deadline: 3600,
		dateCreated: 0,
		status: 0,
	};
	console.log('Adding Trade...');
	const mintTx = await sellerNft.mint('0x572ab478bc8af52899e9d2003388f48b39fefd43');
	await mintTx.wait();
	console.log('================================Minted NFT================================');
	const approveTx = await sellerNft.approve(trustMeaddress as string, 0);
	await approveTx.wait();
	console.log('================================Approved NFT================================');
	const tx = await trustMe.addTrade(trade);
	const receipt = await tx.wait();
	console.log(receipt.events);
	console.log('================================Trade Added================================');
};
addTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
