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

	/*transfer tokens from deployer to seller.
	This is just for locally deployed tokens because we are minting them to deployer when we are deploying the token contracts.Frontend team will not to this transfer thing*/
	await sellerToken.transfer(seller.address, parseEther('100'));

	// Approve seller token to contract
	await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));
	console.log('Adding Trade...');
	await trustMe
		.connect(seller)
		.addTrade(buyer.address, sellerTokenAddress, buyerTokenAddress, parseEther('100'), parseEther('100'), 600);
	console.log('Trade Added Successfully 🎊');
};
addTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
