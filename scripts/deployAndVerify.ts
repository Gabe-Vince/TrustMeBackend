const ethers = require('ethers');
require('dotenv').config();
const artifacts = require('../artifacts/contracts/TrustMe.sol/TrustMe.json');

async function deployAndVerify() {
	const args: any[] = [];
	const provider = new ethers.providers.AlchemyProvider('goerli', process.env.ALCHEMY_API_KEY_GOERLI);
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
	const factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);
	const contract = await factory.deploy();
	await contract.deployTransaction.wait();
	console.log('contract deployed at:', contract.address);

	const network = await ethers.providers.getNetwork();
	const chainId = provider._network.chainId;
	if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
		await verify(contract.address, args);
	}
}

async function verify(contractAddress: string, args: any[]) {
	console.log('Verifying contract...');
	try {
		const hre = require('hardhat');
		await hre.run('verify:verify', {
			address: contractAddress,
			constructorArguments: args,
		});
		console.log('Verified - heck out your contract on Etherscan!');
	} catch (e: any) {
		if (e.message.toLowerCase().includes('already verified')) {
			console.log('Already verified!');
		} else {
			console.log(e);
		}
	}
}

deployAndVerify();
