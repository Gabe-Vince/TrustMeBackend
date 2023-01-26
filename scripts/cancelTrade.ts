import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerToken, TrustMe} from '../typechain';
const addTrade = async () => {
	await deployments.fixture('all');
	const [deployer, seller, buyer] = await ethers.getSigners();
	const trustMe: TrustMe = await ethers.getContract('TrustMe');
	const sellerToken: SellerToken = await ethers.getContract('SellerToken');
	const buyerToken: BuyerToken = await ethers.getContract('BuyerToken');
	const sellerTokenAddress = sellerToken.address;
	const buyerTokenAddress = buyerToken.address;
	// Approve seller token
	await sellerToken.transfer(seller.address, parseEther('100'));

	await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
	console.log('Adding Trade...');
	await trustMe
		.connect(seller)
		.addTrade(buyer.address, sellerTokenAddress, buyerTokenAddress, parseEther('100'), parseEther('100'), 600);
	console.log('Trade Added Successfully 🎊');

	console.log('----------------------------------------------------');
	console.log('Canceling Trade');
	const index = 0;
	await trustMe.connect(seller).cancelTrade(index);
	console.log('Trade Canceled');
};
addTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
