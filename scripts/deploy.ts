const ethers = require('ethers');
require('dotenv').config();
const artifacts = require('../artifacts/contracts/TrustMe.sol/TrustMe.json');
async function deploy() {
	const provider = new ethers.providers.AlchemyProvider('goerli', process.env.ALCHEMY_API_KEY_GOERLI);
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
	const factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);
	const contract = await factory.deploy();
	await contract.deployTransaction.wait();
	console.log('contract deployed at:', contract.address);
}

deploy();
