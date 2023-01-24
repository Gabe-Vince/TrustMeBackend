import {HardhatUserConfig} from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';
import {NetworkUserConfig} from 'hardhat/types';

import {config as dotenvConfig} from 'dotenv';
import {resolve} from 'path';
dotenvConfig({path: resolve(__dirname, './.env')});

const chainIds = {
	mainnet: 1,
	goerli: 5,
	hardhat: 31337,
};

const MNEMONIC = process.env.MNEMONIC || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const ALCHEMY_GOERLI = process.env.ALCHEMY_API_KEY_GOERLI || '';
const ALCHEMY_MAINNET = process.env.ALCHEMY_API_KEY_MAINET || '';

function createTestnetConfig(network: keyof typeof chainIds, api: string): NetworkUserConfig {
	const url: string = 'https://eth-' + network + 'g.alchemy.com/v2/' + api;
	return {
		accounts: {
			count: 10,
			initialIndex: 0,
			mnemonic: MNEMONIC,
			path: "m/44'/60'/0'/0",
		},
		chainId: chainIds[network],
		url,
	};
}

const config: HardhatUserConfig = {
	solidity: '0.8.17',
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			chainId: chainIds.hardhat,
		},
		localhost: {
			chainId: chainIds.hardhat,
		},
		mainnet: createTestnetConfig('mainnet', ALCHEMY_MAINNET),
		goerli: createTestnetConfig('goerli', ALCHEMY_GOERLI),
	},
	typechain: {
		outDir: 'typechain',
		target: 'ethers-v5',
	},
	contractSizer: {
		alphaSort: false,
		runOnCompile: false,
		disambiguatePaths: false,
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
		apiKey: ETHERSCAN_API_KEY,
	},
};

export default config;
