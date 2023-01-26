// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

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

contract TrustMe is AutomationCompatible {
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
		Closed,
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
	event TokensWithdrawn(address indexed seller, uint tradeIndex);
	uint public testCounter;
	uint lastTimeStamp;
	address[] private sellerAddresses;

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

	constructor() {
		lastTimeStamp = block.timestamp;
	}

	/**
	 *@dev  Create Trade to initialize a trade as a seller
	 *@param _buyer address of the buyer
	 *@param _tokenToSell address of the token to sell
	 *@param _tokenToBuy address of the token to buy
	 *@param _amountOfTokenToSell amount of token to sell
	 *@param _amountOfTokenToBuy amount of token to buy
	 *@param  _tradePeriod duration of trade
	 */

	function addTrade(
		address _buyer,
		address _tokenToSell,
		address _tokenToBuy,
		uint256 _amountOfTokenToSell,
		uint256 _amountOfTokenToBuy,
		uint256 _tradePeriod
	) external validateAddTrade(_buyer, _tokenToSell, _tokenToBuy, _amountOfTokenToSell, _amountOfTokenToBuy) {
		uint tradePeriod = block.timestamp + _tradePeriod;
		IERC20 token = IERC20(_tokenToSell);
		token.safeTransferFrom(msg.sender, address(this), _amountOfTokenToSell);
		Trade memory trade = Trade(
			msg.sender,
			_buyer,
			_tokenToSell,
			_tokenToBuy,
			_amountOfTokenToSell,
			_amountOfTokenToBuy,
			tradePeriod,
			TradeStatus.Pending
		);

		userToTrades[msg.sender].push(trade);
		sellerAddresses.push(msg.sender);

		emit TradeCreated(
			msg.sender,
			_buyer,
			_tokenToSell,
			_tokenToBuy,
			_amountOfTokenToSell,
			_amountOfTokenToBuy,
			tradePeriod
		);
	}

	function closeTrade(address seller, uint256 index) external validateCloseTrade(seller, index) {
		Trade memory trade = userToTrades[seller][index];

		IERC20(trade.tokenToBuy).safeTransferFrom(msg.sender, trade.seller, trade.amountOfTokenToBuy);
		// Transfer token to buyer from contract
		IERC20(trade.tokenToSell).safeTransfer(trade.buyer, trade.amountOfTokenToSell);
		trade.status = TradeStatus.Closed;
		for (uint i = index; i < sellerAddresses.length - 1; i++) {
			sellerAddresses[i] = sellerAddresses[i + 1];
		}
		sellerAddresses.pop();
		// Are we deleting a trade?
		// delete userToTrades[trade.seller];
		emit TradeConfirmed(seller, msg.sender);
	}

	function cancelTrade(uint256 index) external validateCancelTrade(index) {
		Trade memory trade = userToTrades[msg.sender][index];
		for (uint i = index; i < userToTrades[msg.sender].length - 1; i++) {
			userToTrades[msg.sender][i] = userToTrades[msg.sender][i + 1];
			sellerAddresses[i] = sellerAddresses[i + 1];
		}
		userToTrades[msg.sender].pop();
		sellerAddresses.pop();

		IERC20(trade.tokenToSell).transfer(trade.seller, trade.amountOfTokenToSell);
		emit TradeCanceled(msg.sender, trade.buyer, trade.tokenToSell, trade.tokenToBuy);
	}

	function withdrawTokens(address seller, uint index) public {
		Trade memory trade = userToTrades[seller][index];
		IERC20(trade.tokenToSell).safeTransfer(seller, trade.amountOfTokenToSell);
		// for (uint i = index; i < userToTrades[msg.sender].length - 1; i++) {
		// 	userToTrades[msg.sender][i] = userToTrades[msg.sender][i + 1];
		// 	sellerAddresses[i] = sellerAddresses[i + 1];
		// }

		// userToTrades[msg.sender].pop();
		// sellerAddresses.pop();

		emit TokensWithdrawn(msg.sender, trade.amountOfTokenToSell);
	}

	/************************
	 * CHAINLINK AUTOMATION *
	 ************************/

	function checkUpkeep(
		bytes memory /*checkData*/
	) public view override returns (bool upkeepNeeded, bytes memory performData) {
		bool _upkeepNeeded;
		bytes memory withdrawTokensFunction;
		for (uint i = 0; i < sellerAddresses.length; i++) {
			address sellerAddress = sellerAddresses[i];
			Trade memory trade = userToTrades[sellerAddress][i];
			if (trade.deadline <= block.timestamp) {
				_upkeepNeeded = true;
				withdrawTokensFunction = abi.encodeWithSignature("withdrawTokens(address,uint256)", sellerAddress, i);
				break;
			}
		}
		upkeepNeeded = _upkeepNeeded;
		performData = withdrawTokensFunction;
		if (_upkeepNeeded) {
			return (upkeepNeeded, performData);
		}
	}

	function performUpkeep(
		bytes calldata /*performData*/
	) external override {
		(bool upkeepNeeded, bytes memory performData) = checkUpkeep("");
		if (!upkeepNeeded) revert UpkeepNotNeeded();
		(bool success, ) = address(this).call(performData);
		require(success, "performUpkeep: failed");
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

	function getSellersAddress() external view returns (address[] memory) {
		return sellerAddresses;
	}
}
