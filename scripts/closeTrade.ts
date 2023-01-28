import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerToken, TrustMe} from '../typechain';

const closeTrade = async () => {
	await deployments.fixture('all');
	const [deployer, seller, buyer] = await ethers.getSigners();
	const trustMe: TrustMe = await ethers.getContract('TrustMe');
	const sellerToken: SellerToken = await ethers.getContract('SellerToken');
	const buyerToken: BuyerToken = await ethers.getContract('BuyerToken');

	await sellerToken.transfer(seller.address, parseEther('100'));
	await buyerToken.transfer(buyer.address, parseEther('100'));

	// approve tokens from seller to contract
	await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));

	// approve tokens from buyer to contract
	await buyerToken.connect(buyer).approve(trustMe.address, parseEther('100'));

	console.log('Adding Trade...');
	await trustMe
		.connect(seller)
		.addTrade(buyer.address, sellerToken.address, buyerToken.address, parseEther('100'), parseEther('100'), 600);
	console.log('Trade Added Successfully 🎊');

	console.log('--------------------------------------------------------------------------');

	console.log('Closing Trade...');
	const index = 0;
	await trustMe.connect(buyer).confirmTrade(seller.address, index);
	console.log('Trade Closed Successfully 🎊');
};
closeTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
