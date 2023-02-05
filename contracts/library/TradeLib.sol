// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

library TradeLib {
	struct NFT {
		address addressNFTToSell;
		uint256 tokenIdNFTToSell;
		address addressNFTToBuy;
		uint256 tokenIdNFTToBuy;
	}

	struct Token {
		address tokenToSell;
		uint256 amountOfTokenToSell;
		address tokenToBuy;
		uint256 amountOfTokenToBuy;
	}

	struct Eth {
		uint256 amountOfETHToSell;
		uint256 amountOfETHToBuy;
	}

	enum TradeStatus {
		Pending,
		Confirmed,
		Canceled,
		Expired,
		Withdrawn
	}

	struct Trade {
		uint256 tradeId;
		address seller;
		address buyer;
		NFT nft;
		Token token;
		Eth eth;
		uint256 deadline;
		uint256 dateCreated;
		TradeStatus status;
	}
}
