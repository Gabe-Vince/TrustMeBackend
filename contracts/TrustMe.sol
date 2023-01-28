// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

error InvalidAddress();
error CannotTradeSameToken();
error CannotTradeWithSelf();
error DeadlineShouldBeAtLeast5Minutes();
error InvalidAmount();
error InsufficientBalance();
error OnlyBuyer();
error OnlySeller();
error TradeIsNotPending();
error TradeIsExpired();
error InsufficientAllowance();
error UpkeepNotNeeded();
error CannotWithdrawTimeNotPassed();
error TradeIsNotExpired();

contract TrustMe {
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
		address tokenToBuy;
		uint256 amountOfTokenToSell;
		uint256 amountOfTokenToBuy;
		uint256 deadline;
		TradeStatus status;
	}

	/**********************
	 *  STATE VARIABLES *
	 **********************/

	mapping(address => uint256[]) public userToTradesIDs;

	mapping(uint256 => Trade) public tradeIDToTrade;

	Counters.Counter private _tradeId;

	uint256[] public pendingTradesIDs;

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
	modifier validateAddTrade(
		address _buyer,
		address _tokenToSell,
		address _tokenToBuy,
		uint256 _amountOfTokenToSell,
		uint256 _amountOfTokenToBuy
	) {
		if (msg.sender == address(0)) revert InvalidAddress();
		if (_buyer == address(0)) revert InvalidAddress();
		if (_tokenToSell == address(0)) revert InvalidAddress();
		if (_tokenToBuy == address(0)) revert InvalidAddress();
		if (_tokenToSell == _tokenToBuy) revert CannotTradeSameToken();
		if (msg.sender == _buyer) revert CannotTradeWithSelf();
		if (_amountOfTokenToSell == 0) revert InvalidAmount();
		if (_amountOfTokenToBuy == 0) revert InvalidAmount();
		if (IERC20(_tokenToSell).balanceOf(msg.sender) < _amountOfTokenToSell) revert InsufficientBalance();
		_;
	}

	function addTrade(
		address _buyer,
		address _tokenToSell,
		address _tokenToBuy,
		uint256 _amountOfTokenToSell,
		uint256 _amountOfTokenToBuy,
		uint256 _tradePeriod
	) external validateAddTrade(_buyer, _tokenToSell, _tokenToBuy, _amountOfTokenToSell, _amountOfTokenToBuy) {
		uint deadline = block.timestamp + _tradePeriod;
		IERC20 token = IERC20(_tokenToSell);
		token.safeTransferFrom(msg.sender, address(this), _amountOfTokenToSell);

		Trade memory trade = Trade(
			_tradeId.current(),
			msg.sender,
			_buyer,
			_tokenToSell,
			_tokenToBuy,
			_amountOfTokenToSell,
			_amountOfTokenToBuy,
			deadline,
			TradeStatus.Pending
		);

		tradeIDToTrade[_tradeId.current()] = trade;
		userToTradesIDs[msg.sender].push(_tradeId.current());
		userToTradesIDs[_buyer].push(_tradeId.current());
		pendingTradesIDs.push(_tradeId.current());

		emit TradeCreated(_tradeId.current(), msg.sender, _buyer);
		_tradeId.increment();
	}

	function confirmTrade(uint256 _tradeID) external {
		Trade memory trade = tradeIDToTrade[_tradeID];
		if (trade.status != TradeStatus.Pending) revert TradeIsNotPending();
		if (trade.buyer != msg.sender) revert OnlyBuyer();
		if (trade.deadline < block.timestamp) revert TradeIsExpired();
		if (IERC20(trade.tokenToBuy).allowance(msg.sender, address(this)) < trade.amountOfTokenToBuy)
			revert InsufficientAllowance();
		IERC20(trade.tokenToBuy).safeTransferFrom(msg.sender, trade.seller, trade.amountOfTokenToBuy);
		IERC20(trade.tokenToSell).safeTransfer(trade.buyer, trade.amountOfTokenToSell);
		trade.status = TradeStatus.Confirmed;
		removePendingTrade(getPendingTradeIndex(trade.id));
		tradeIDToTrade[_tradeID] = trade;
		emit TradeConfirmed(trade.id, trade.seller, trade.buyer);
	}

	function cancelTrade(uint256 _tradeID) external {
		Trade memory trade = tradeIDToTrade[_tradeID];
		if (trade.status != TradeStatus.Pending) revert TradeIsNotPending();
		if (trade.seller != msg.sender) revert OnlySeller();
		if (trade.deadline < block.timestamp) revert TradeIsExpired();
		IERC20(trade.tokenToSell).safeTransfer(trade.seller, trade.amountOfTokenToSell);
		trade.status = TradeStatus.Canceled;
		removePendingTrade(getPendingTradeIndex(trade.id));
		tradeIDToTrade[_tradeID] = trade;

		emit TradeCanceled(trade.id, trade.seller, trade.buyer);
	}

	function checkExpiredTrades() external {
		for (uint i = 0; i < pendingTradesIDs.length; i++) {
			Trade storage trade = tradeIDToTrade[pendingTradesIDs[i]];
			if (trade.deadline <= block.timestamp) {
				trade.status = TradeStatus.Expired;
				removePendingTrade(getPendingTradeIndex(trade.id));
				emit TradeExpired(trade.id, trade.seller, trade.buyer);
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
		Trade memory trade = tradeIDToTrade[_tradeID];
		if (trade.status != TradeStatus.Expired) revert TradeIsNotExpired();
		if (trade.seller != msg.sender) revert OnlySeller();
		IERC20(trade.tokenToSell).safeTransfer(trade.seller, trade.amountOfTokenToSell);
		trade.status = TradeStatus.Withdrawn;
		tradeIDToTrade[_tradeID] = trade;
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

	function getBlockTimestamp() external view returns (uint256) {
		return block.timestamp;
	}
}
