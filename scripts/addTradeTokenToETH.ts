import {Console} from 'console';
import {parseEther} from 'ethers/lib/utils';
import {deployments, ethers} from 'hardhat';
import {TrustMe} from '../typechain';

const erc20abi = [
	{inputs: [], stateMutability: 'nonpayable', type: 'constructor'},
	{
		anonymous: false,
		inputs: [
			{indexed: true, internalType: 'address', name: 'owner', type: 'address'},
			{indexed: true, internalType: 'address', name: 'spender', type: 'address'},
			{indexed: false, internalType: 'uint256', name: 'value', type: 'uint256'},
		],
		name: 'Approval',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{indexed: true, internalType: 'address', name: 'from', type: 'address'},
			{indexed: true, internalType: 'address', name: 'to', type: 'address'},
			{indexed: false, internalType: 'uint256', name: 'value', type: 'uint256'},
		],
		name: 'Transfer',
		type: 'event',
	},
	{
		inputs: [
			{internalType: 'address', name: 'owner', type: 'address'},
			{internalType: 'address', name: 'spender', type: 'address'},
		],
		name: 'allowance',
		outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{internalType: 'address', name: 'spender', type: 'address'},
			{internalType: 'uint256', name: 'amount', type: 'uint256'},
		],
		name: 'approve',
		outputs: [{internalType: 'bool', name: '', type: 'bool'}],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{internalType: 'address', name: 'account', type: 'address'}],
		name: 'balanceOf',
		outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'decimals',
		outputs: [{internalType: 'uint8', name: '', type: 'uint8'}],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{internalType: 'address', name: 'spender', type: 'address'},
			{internalType: 'uint256', name: 'subtractedValue', type: 'uint256'},
		],
		name: 'decreaseAllowance',
		outputs: [{internalType: 'bool', name: '', type: 'bool'}],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{internalType: 'address', name: 'spender', type: 'address'},
			{internalType: 'uint256', name: 'addedValue', type: 'uint256'},
		],
		name: 'increaseAllowance',
		outputs: [{internalType: 'bool', name: '', type: 'bool'}],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'name',
		outputs: [{internalType: 'string', name: '', type: 'string'}],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'symbol',
		outputs: [{internalType: 'string', name: '', type: 'string'}],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'totalSupply',
		outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{internalType: 'address', name: 'to', type: 'address'},
			{internalType: 'uint256', name: 'amount', type: 'uint256'},
		],
		name: 'transfer',
		outputs: [{internalType: 'bool', name: '', type: 'bool'}],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{internalType: 'address', name: 'from', type: 'address'},
			{internalType: 'address', name: 'to', type: 'address'},
			{internalType: 'uint256', name: 'amount', type: 'uint256'},
		],
		name: 'transferFrom',
		outputs: [{internalType: 'bool', name: '', type: 'bool'}],
		stateMutability: 'nonpayable',
		type: 'function',
	},
];

const signer = process.env.PRIVATE_KEY;
const trustMeaddress = process.env.TRUSTME_ADDRESS;
const sellerTokenAddress = process.env.SELLER_TOKEN_ADDRESS;

const addTrade = async () => {
	const trustMe: TrustMe = await ethers.getContractAt('TrustMe', trustMeaddress as string);
	const sellerToken = await ethers.getContractAt(erc20abi, sellerTokenAddress as string);

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
			amountOfTokenToSell: parseEther('10'),
			tokenToBuy: ethers.constants.AddressZero,
			amountOfTokenToBuy: 0,
		},
		eth: {
			amountOfETHToSell: 0,
			amountOfETHToBuy: parseEther('0.01'),
		},
		deadline: 600,
		dateCreated: 0,
		status: 0,
	};
	console.log('Adding Trade...');
	const approveTx = await sellerToken.approve(trustMeaddress as string, parseEther('10'));
	await approveTx.wait();
	console.log('================================Approved================================');
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
