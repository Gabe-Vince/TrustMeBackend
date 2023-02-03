// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

library TradeLib {
	struct NFT {
		address senderAddressNFT;
		uint256 senderTokenIdNFT;
		address receiverAddressNFT;
		uint256 receiverTokenIdNFT;
	}
	struct Token {
		address senderToken;
		uint256 senderAmountToken;
		address receiverToken;
		uint256 receiverAmountToken;
	}

	struct eth {
		uint256 senderAmountETH;
		uint256 receiverAmountETH;
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
		address sender;
		address receiver;
		NFT nft;
		Token token;
		eth eth;
		uint256 deadline;
		TradeStatus status;
	}
}

contract TrustMeLib is ERC721Holder {
	using SafeERC20 for IERC20;
	using Counters for Counters.Counter;
	using TradeLib for TradeLib.Trade;

	/**********************
	 *  STATE VARIABLES *
	 **********************/

	mapping(address => uint256[]) public userToTradesIDs;

	mapping(uint256 => TradeLib.Trade) public tradeIDToTrade;

	Counters.Counter private _tradeId;

	uint256[] public pendingTradesIDs;

	function addTrade(TradeLib.Trade memory transactionInput) external payable {
		require(transactionInput.sender != transactionInput.receiver, "Cannot trade with self");

		uint256 tradeId = _tradeId.current();
		transactionInput.sender = msg.sender;
		transactionInput.status = TradeLib.TradeStatus.Pending;
		transactionInput.tradeId = tradeId;
		transactionInput.deadline = block.timestamp + transactionInput.deadline;
		console.log(transactionInput.sender);

		tradeIDToTrade[tradeId] = transactionInput;
		userToTradesIDs[transactionInput.sender].push(tradeId);
		userToTradesIDs[transactionInput.receiver].push(tradeId);

		if (transactionInput.token.senderToken != address(0)) {
			require(
				transactionInput.token.senderToken != transactionInput.nft.senderAddressNFT,
				"Token and NFT address cannot be equal"
			);

			IERC20(transactionInput.token.senderToken).safeTransferFrom(
				transactionInput.sender,
				address(this),
				transactionInput.token.senderAmountToken
			);
		}

		if (transactionInput.nft.senderAddressNFT != address(0)) {
			require(
				transactionInput.nft.senderAddressNFT != transactionInput.token.senderToken,
				"Token and NFT address cannot be equal"
			);

			IERC721(transactionInput.nft.senderAddressNFT).safeTransferFrom(
				transactionInput.sender,
				address(this),
				transactionInput.nft.senderTokenIdNFT
			);
		}

		if (msg.value > 0) {
			require(msg.value == transactionInput.eth.senderAmountETH, "Incorrect amount of ETH transferred");
		}

		pendingTradesIDs.push(tradeId);
		_tradeId.increment();
	}

	/***********
	 * GETTERS *
	 ***********/

	function getTrade(uint256 tradeId) external view returns (TradeLib.Trade memory) {
		return tradeIDToTrade[tradeId];
	}

	function getTradesForUser(address user) external view returns (uint256[] memory) {
		return userToTradesIDs[user];
	}

	function getPendingTrades() external view returns (uint256[] memory) {
		return pendingTradesIDs;
	}

	function getContractEtherBalance() external view returns (uint256) {
		return address(this).balance;
	}
}
