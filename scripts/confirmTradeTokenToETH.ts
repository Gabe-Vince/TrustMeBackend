import {Console} from 'console';
import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {BuyerToken, SellerNFT, SellerToken, TrustMe} from '../typechain';

const signer = process.env.BUYER_PRIVATE_KEY;
const trustMeaddress = process.env.TRUSTME_ADDRESS;
const provider = new ethers.providers.InfuraProvider('goerli', process.env.INFURA_API_KEY_GOERLI);

const confirmTrade = async () => {
	const wallet = new ethers.Wallet(signer as string, provider);
	const trustMe: TrustMe = await ethers.getContractAt('TrustMe', trustMeaddress as string);

	console.log('Confirming Trade...');
	const tx = await trustMe.connect(wallet).confirmTrade(3, {value: parseEther('0.01')});
	console.log('Confirmed waiting for block confirmation...');
	const receipt = await tx.wait();
	console.log('Trade Confirmed');
};
confirmTrade()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
