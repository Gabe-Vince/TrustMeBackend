require('dotenv').config();

import {HardhatUserConfig} from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';

const chainIds = {
	mainnet: 1,
	goerli: 5,
	hardhat: 31337,
};

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const ALCHEMY_GOERLI = process.env.ALCHEMY_API_KEY_GOERLI || '';
const ALCHEMY_MAINNET = process.env.ALCHEMY_API_KEY_MAINET || '';

const config: HardhatUserConfig = {
	solidity: {
		version: '0.8.17',
	},
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			chainId: chainIds.hardhat,
		},
		localhost: {
			chainId: chainIds.hardhat,
		},
		// mainnet: {
		// 	url: ALCHEMY_MAINNET,
		// 	accounts: [process.env.PRIVATE_KEY || ''],
		// 	chainId: chainIds.mainnet,
		// },
		goerli: {
			url: ALCHEMY_GOERLI,
			accounts: [process.env.PRIVATE_KEY || ''],
			chainId: chainIds.goerli,
		},
	},
	typechain: {
		outDir: 'typechain',
		target: 'ethers-v5',
	},
	contractSizer: {
		alphaSort: false,
		runOnCompile: false,
		disambiguatePaths: false,
		strict: true,
		only: [':TrustMe$', ':SecurityFunctions$', ':Validation$'],
	},
	gasReporter: {
		enabled: process.env.REPORT_GAS == 'true' ?? false,
		currency: 'USD',
		outputFile: 'gas-report.txt',
		noColors: false,
		coinmarketcap: process.env.COINMARKETCAP_API_KEY,
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
		seller: {
			default: 1,
		},
		buyer: {
			default: 2,
		},
	},
	mocha: {
		timeout: 200000,
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY,
	},
};

export default config;
