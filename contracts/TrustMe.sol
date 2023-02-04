// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./library/Validation.sol";
import "./library/SecurityFunctions.sol";

library TradeLib {
	struct NFT {
		address senderAddressNFT;
		uint256 senderTokenIdNFT;
		address receiverAddressNFT;
	}
}

contract TrustMe is ERC721Holder {
	using SafeERC20 for IERC20;
	using Counters for Counters.Counter;

	/*********
	 * TYPES *
	 *********/
	enum TradeStatus {
		Pending,
		Confirmed,
		Canceled,
		Expired,
		Withdrawn
	}

	struct Trade {
		uint256 id;
		address seller;
		address buyer;
		address tokenToSell;
		address addressNFTToSell;
		uint256 tokenIdNFTToSell;
		address tokenToBuy;
		address addressNFTToBuy;
		uint256 tokenIdNFTToBuy;
		uint256 amountOfETHToSell;
		uint256 amountOfTokenToSell;
		uint256 amountOfETHToBuy;
		uint256 amountOfTokenToBuy;
		uint256 deadline;
		TradeStatus status;
	}

	// NT: added TransactionInput struct to avoid stack do deep error
	// which occurs due to added function arguments in addTrade

	struct TransactionInput {
		address buyer;
		address tokenToSell;
		address addressNFTToSell;
		uint256 tokenIdNFTToSell;
		address tokenToBuy;
		address addressNFTToBuy;
		uint256 tokenIdNFTToBuy;
		uint256 amountOfETHToSell;
		uint256 amountOfTokenToSell;
		uint256 amountOfETHToBuy;
		uint256 amountOfTokenToBuy;
		uint256 tradePeriod;
	}

	/**********************
	 *  STATE VARIABLES *
	 **********************/

	mapping(address => uint256[]) public userToTradesIDs;

	mapping(uint256 => Trade) public tradeIDToTrade;

	Counters.Counter private _tradeId;

	uint256[] public pendingTradesIDs;

	// NT - is it necessary to keep track of seller token and ETH balances in contract? I have done so now for ETH;
	mapping(uint => uint) public tradeIdToETHFromSeller;

	/**********
	 * EVENTS *
	 **********/
	event TradeCreated(uint256 indexed tradeID, address indexed seller, address indexed buyer);

	event TradeConfirmed(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeExpired(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeCanceled(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeWithdrawn(uint256 indexed tradeID, address indexed seller, address indexed buyer);

	/***************
	 * MODIFIERS *
	 ***************/

	function addTrade(TransactionInput calldata transactionInput) external payable {
		SecurityFunctions.validateAddTrade(
			transactionInput.buyer,
			transactionInput.tokenToSell,
			transactionInput.addressNFTToSell,
			transactionInput.tokenIdNFTToSell,
			transactionInput.tokenToBuy,
			transactionInput.addressNFTToBuy,
			transactionInput.tokenIdNFTToBuy,
			transactionInput.amountOfTokenToSell,
			transactionInput.amountOfETHToSell,
			transactionInput.amountOfTokenToBuy,
			transactionInput.amountOfETHToBuy,
			msg.value
		);

		uint deadline = block.timestamp + transactionInput.tradePeriod;
		IERC20 token = IERC20(transactionInput.tokenToSell);
		IERC721 NFTToSell = IERC721(transactionInput.addressNFTToSell);
		if (transactionInput.amountOfTokenToSell > 0)
			token.safeTransferFrom(msg.sender, address(this), transactionInput.amountOfTokenToSell);
		if (transactionInput.addressNFTToSell != address(0))
			NFTToSell.safeTransferFrom(msg.sender, address(this), transactionInput.tokenIdNFTToSell);

		tradeIdToETHFromSeller[_tradeId.current()] += msg.value;

		Trade memory trade = Trade(
			_tradeId.current(),
			msg.sender,
			transactionInput.buyer,
			transactionInput.tokenToSell,
			transactionInput.addressNFTToSell,
			transactionInput.tokenIdNFTToSell,
			transactionInput.tokenToBuy,
			transactionInput.addressNFTToBuy,
			transactionInput.tokenIdNFTToBuy,
			transactionInput.amountOfETHToSell,
			transactionInput.amountOfTokenToSell,
			transactionInput.amountOfETHToBuy,
			transactionInput.amountOfTokenToBuy,
			deadline,
			TradeStatus.Pending
		);

		tradeIDToTrade[_tradeId.current()] = trade;
		userToTradesIDs[msg.sender].push(_tradeId.current());
		userToTradesIDs[transactionInput.buyer].push(_tradeId.current());
		pendingTradesIDs.push(_tradeId.current());

		emit TradeCreated(_tradeId.current(), msg.sender, transactionInput.buyer);
		_tradeId.increment();
	}

	function confirmTrade(uint256 _tradeID) external payable {
		Trade memory trade = tradeIDToTrade[_tradeID];
		if (trade.status != TradeStatus.Pending) revert TradeIsNotPending();
		address sender = msg.sender;
		uint value = msg.value;
		SecurityFunctions.validateConfirmTrade(trade, sender, value);

		if (trade.amountOfTokenToBuy > 0)
			IERC20(trade.tokenToBuy).safeTransferFrom(msg.sender, trade.seller, trade.amountOfTokenToBuy);

		if (trade.addressNFTToBuy != address(0))
			IERC721(trade.addressNFTToBuy).safeTransferFrom(msg.sender, trade.seller, trade.tokenIdNFTToBuy);

		if (trade.amountOfETHToBuy > 0) payable(trade.seller).transfer(msg.value);

		if (trade.amountOfTokenToSell > 0)
			IERC20(trade.tokenToSell).safeTransfer(trade.buyer, trade.amountOfTokenToSell);

		if (trade.addressNFTToSell != address(0))
			IERC721(trade.addressNFTToSell).safeTransferFrom(address(this), trade.buyer, trade.tokenIdNFTToSell);

		if (trade.amountOfETHToSell > 0) payable(trade.buyer).transfer(trade.amountOfETHToSell);
		tradeIdToETHFromSeller[_tradeID] -= trade.amountOfETHToSell;

		trade.status = TradeStatus.Confirmed;
		removePendingTrade(getPendingTradeIndex(trade.id));
		tradeIDToTrade[_tradeID] = trade;
		emit TradeConfirmed(trade.id, trade.seller, trade.buyer);
	}

	function cancelTrade(uint256 _tradeID) external {
		Trade storage trade = tradeIDToTrade[_tradeID];
		address sender = msg.sender;

		// if (
		// 	address(this).balance < trade.amountOfETHToSell ||
		// 	tradeIdToETHFromSeller[_tradeID] < trade.amountOfETHToSell
		// ) revert InsufficientBalance(); // TODO: i don't think this is needed

		SecurityFunctions.validateCancelTrade(trade, sender);

		if (trade.amountOfTokenToSell > 0)
			IERC20(trade.tokenToSell).safeTransfer(trade.seller, trade.amountOfTokenToSell);

		if (trade.addressNFTToSell != address(0))
			IERC721(trade.addressNFTToSell).safeTransferFrom(address(this), trade.seller, trade.tokenIdNFTToSell);

		if (trade.amountOfETHToSell > 0) payable(trade.seller).transfer(trade.amountOfETHToSell);
		tradeIdToETHFromSeller[_tradeID] -= trade.amountOfETHToSell;

		trade.status = TradeStatus.Canceled;
		removePendingTrade(getPendingTradeIndex(trade.id));

		emit TradeCanceled(trade.id, trade.seller, trade.buyer);
	}

	function checkExpiredTrades() external {
		for (uint i = pendingTradesIDs.length - 1; i >= 0; i--) {
			Trade storage trade = tradeIDToTrade[pendingTradesIDs[uint(i)]];
			if (trade.deadline <= block.timestamp) {
				trade.status = TradeStatus.Expired;
				removePendingTrade(i);
				emit TradeExpired(trade.id, trade.seller, trade.buyer);
				if (i == 0) break;
			}
		}
	}

	function removePendingTrade(uint256 index) internal {
		if (index >= pendingTradesIDs.length) return;

		for (uint i = index; i < pendingTradesIDs.length - 1; i++) {
			pendingTradesIDs[i] = pendingTradesIDs[i + 1];
		}
		pendingTradesIDs.pop();
	}

	function withdraw(uint256 _tradeID) external {
		Trade storage trade = tradeIDToTrade[_tradeID];
		address sender = msg.sender;
		SecurityFunctions.validateWithdraw(trade, sender);
		if (
			address(this).balance < trade.amountOfETHToSell ||
			tradeIdToETHFromSeller[_tradeID] < trade.amountOfETHToSell
		) revert InsufficientBalance();

		if (trade.amountOfTokenToSell > 0)
			IERC20(trade.tokenToSell).safeTransfer(trade.seller, trade.amountOfTokenToSell);

		if (trade.addressNFTToSell != address(0))
			IERC721(trade.addressNFTToSell).safeTransferFrom(address(this), trade.seller, trade.tokenIdNFTToSell);

		if (trade.amountOfETHToSell > 0) payable(trade.seller).transfer(trade.amountOfETHToSell);
		tradeIdToETHFromSeller[_tradeID] -= trade.amountOfETHToSell;
		trade.status = TradeStatus.Withdrawn;
		emit TradeWithdrawn(trade.id, trade.seller, trade.buyer);
	}

	/***********
	 * GETTERS *
	 ***********/

	function getTrade(uint256 _tradeID) external view returns (Trade memory) {
		return tradeIDToTrade[_tradeID];
	}

	function getTradesIDsByUser(address _user) external view returns (uint256[] memory) {
		return userToTradesIDs[_user];
	}

	function getPendingTradesIDs() external view returns (uint256[] memory) {
		return pendingTradesIDs;
	}

	function getTradeStatus(uint256 _tradeID) external view returns (TradeStatus) {
		return tradeIDToTrade[_tradeID].status;
	}

	function getPendingTradeIndex(uint256 _tradeID) internal view returns (uint256) {
		for (uint i = 0; i < pendingTradesIDs.length; i++) {
			if (pendingTradesIDs[i] == _tradeID) {
				return i;
			}
		}
		return pendingTradesIDs.length;
	}
}
