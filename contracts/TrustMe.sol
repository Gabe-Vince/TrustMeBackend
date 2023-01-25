// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error InvalidAddress();
error CannotTradeSameToken();
error CannotTradeWithSelf();
error DeadlineShouldBeAtLeastAMinute();
error InvalidAmount();
error InsufficientBalance();
error OnlyBuyer();
error OnlySeller();
error TradeIsNotPending();
error TradeIsExpired();
error InsufficientAllowance();

contract TrustMe {

	/**********
	 * EVENTS *
	 **********/

	event TradeCreated(
		address indexed seller,
		address indexed buyer,
		address tokenToSell,
		address tokenToBuy,
		uint256 amountOfTokenToSell,
		uint256 amountOfTokenToBuy,
		uint deadline
	);

	event TradeConfirmed(address indexed seller, address indexed buyer);
	event TradeExpired(address indexed seller, address indexed buyer);

	event TradeCanceled(address indexed seller, address indexed buyer, address tokenToSell, address tokenToBuy);


	using SafeERC20 for IERC20;

	/**********************
	 *  STATE VARIABLES *
	 **********************/

	enum TradeStatus {
		Pending,
		Accepted,
		Expired
	}

	struct Trade {
		address seller;
		address buyer;
		address tokenToSell;
		address tokenToBuy;
		uint256 amountOfTokenToSell;
		uint256 amountOfTokenToBuy;
		uint256 deadline;
		TradeStatus status;
	}
	mapping(address => Trade[]) public userToTrades;
	// mapping(address => mapping(address => uint256)) public userToTokenToAmount;

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

	modifier validateCloseTrade(address seller, uint256 index) {
		Trade memory trade = userToTrades[seller][index];
		if (trade.buyer != msg.sender) revert OnlyBuyer();
		if (trade.status != TradeStatus.Pending) revert TradeIsNotPending(); //Do we need to check this?
		if (trade.deadline < block.timestamp) revert TradeIsExpired();
		IERC20 token = IERC20(trade.tokenToBuy);
		if (token.allowance(msg.sender, address(this)) < trade.amountOfTokenToBuy) revert InsufficientAllowance();
		if (token.balanceOf(msg.sender) < trade.amountOfTokenToBuy) revert InsufficientBalance();
		_;
	}

	modifier validateCancelTrade(uint index) {
		Trade memory trade = userToTrades[msg.sender][index];
		if (trade.seller != msg.sender) revert OnlySeller();
		if (trade.status != TradeStatus.Pending) revert TradeIsNotPending();
		if (trade.deadline < block.timestamp) revert TradeIsExpired();
		_;
	}

	/**
	 *@dev  Create Trade to initialize a trade as a seller
	 *@param _buyer address of the buyer
	 *@param _tokenToSell address of the token to sell
	 *@param _tokenToBuy address of the token to buy
	 *@param _amountOfTokenToSell amount of token to sell
	 *@param _amountOfTokenToBuy amount of token to buy
	 *@param _deadline deadline of the trade in unix timestamp
	 */

	function addTrade(
		address _buyer,
		address _tokenToSell,
		address _tokenToBuy,
		uint256 _amountOfTokenToSell,
		uint256 _amountOfTokenToBuy,
		uint256 _deadline
	) external validateAddTrade(_buyer, _tokenToSell, _tokenToBuy, _amountOfTokenToSell, _amountOfTokenToBuy) {
		// console.log("deadline user entered", _deadline);
		// console.log("deadline in blockchain",block.timestamp + 600);
		IERC20 token = IERC20(_tokenToSell);
		token.safeTransferFrom(msg.sender, address(this), _amountOfTokenToSell);
		Trade memory trade = Trade(
			msg.sender,
			_buyer,
			_tokenToSell,
			_tokenToBuy,
			_amountOfTokenToSell,
			_amountOfTokenToBuy,
			_deadline,
			TradeStatus.Pending
		);

		userToTrades[msg.sender].push(trade);
		// userToTokenToAmount[msg.sender][_tokenToSell] = _amountOfTokenToSell;

		emit TradeCreated(
			msg.sender,
			_buyer,
			_tokenToSell,
			_tokenToBuy,
			_amountOfTokenToSell,
			_amountOfTokenToBuy,
			_deadline
		);
	}

	function closeTrade(address seller, uint256 index) external validateCloseTrade(seller, index) {
		Trade memory trade = userToTrades[seller][index];

		IERC20(trade.tokenToBuy).safeTransferFrom(msg.sender, trade.seller, trade.amountOfTokenToBuy);
		// Transfer token to buyer from contract
		IERC20(trade.tokenToSell).safeTransfer(trade.buyer, trade.amountOfTokenToSell);
		trade.status = TradeStatus.Accepted;

		// userToTokenToAmount[seller][trade.tokenToSell] = 0;
		emit TradeConfirmed(seller, msg.sender);
		delete userToTrades[trade.seller];
	}

	function cancelTrade(uint256 index) external validateCancelTrade(index) {
		// Should we punish those who cancel trade by seizing the % or their token? or may be not now.
		Trade memory trade = userToTrades[msg.sender][index];
		IERC20(trade.tokenToSell).safeTransfer(trade.seller, trade.amountOfTokenToSell);
		// userToTokenToAmount[seller][trade.tokenToSell] = 0;
		emit TradeCanceled(msg.sender, trade.buyer, trade.tokenToSell, trade.tokenToBuy);
		delete userToTrades[trade.seller];
	}

	/***********
	 * GETTERS *
	 ***********/

	function getTrades(address userAddress) external view returns (Trade[] memory) {
		return userToTrades[userAddress];
	}

	function getTrade(address userAddress, uint256 index) external view returns (Trade memory) {
		return userToTrades[userAddress][index];
	}


	function getLatestTradeIndex(address userAddress) external view returns (uint256) {

		return userToTrades[userAddress].length - 1;
	}
}

// TODO: check test converage
// TODO: Is there is any way to clear out those if condition in a modifier? Because it is really smelling bad
// TODO: ADD scrips for frontend
// TODO: when user call addTrade functiona and pass deadline it is slightly different from the timestamp in blockchain. This is obviously because of the mining time but do we need to worry about this? uncomment the line 124-125  and run test to see what i'm saying. To fix this we need to add a minimum requirement for the deadline like 5 or 10 mins.So that the block can be mined before the trade expiration.
