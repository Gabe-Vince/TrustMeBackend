import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {mainModule} from 'process';
import {BuyerToken, SellerToken, TrustMe} from '../typechain';

const withdrawToken = async () => {
	await deployments.fixture('all');
	const [deployer, seller, buyer] = await ethers.getSigners();
	const trustMe: TrustMe = await ethers.getContract('TrustMe');
	const sellerToken: SellerToken = await ethers.getContract('SellerToken');
	const buyerToken: BuyerToken = await ethers.getContract('BuyerToken');
	await sellerToken.transfer(seller.address, parseEther('100'));

	// approve tokens from seller to contract
	await sellerToken.connect(seller).approve(trustMe.address, parseEther('100'));

	console.log('Adding Trade...');
	await trustMe
		.connect(seller)
		.addTrade(buyer.address, sellerToken.address, buyerToken.address, parseEther('100'), parseEther('100'), 600);
	console.log('Trade Added Successfully 🎊');

	console.log('--------------------------------------------------------------------------');

	console.log('Seller Balance Before Withdrawal: ', (await sellerToken.balanceOf(seller.address)).toString());

	await ethers.provider.send('evm_increaseTime', [601]);
	await ethers.provider.send('evm_mine', []);

	console.log('Simulating chainlink node and calling performUpkeep function...');
	await trustMe.performUpkeep('0x');
	console.log('performUpkeep function called successfully and isAvailableToWidraw set to true🎊');
	console.log('--------------------------------------------------------------------------');
	await trustMe.connect(seller).withdrawToken(seller.address, 0);
	console.log('Seller Token Withdrawn Successfully 🎊');
	console.log('Seller Balance After Withdrawal: ', (await sellerToken.balanceOf(seller.address)).toString());
};
withdrawToken()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
