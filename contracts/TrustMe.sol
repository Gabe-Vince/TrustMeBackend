// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./library/Validation.sol";
import "./library/SecurityFunctions.sol";
import "./library/TradeLib.sol";

/**
 * @title TrustMe - A decentralized settlement platform for ETH, ERC20 tokens and ERC721 NFTs
 * @author - @Mr-Biskit, @pokhrelanmol, @mengiefen, @Rushikesh0125 and @NicoTollenaar
 * @notice - Use this contract to create, confirm, cancel and withdraw settlements
 * @dev - All function calls are currently implemented without side effects
 * The contract uses OpenZeppelin's contracts for ERC20 and ERC721 to handle token transfers.
 * The contract also uses its own libraries for trade validation, security functions and the Trade Data Structure.
 */

contract TrustMe is ERC721Holder {
	using SafeERC20 for IERC20;
	using Counters for Counters.Counter;
	using TradeLib for TradeLib.Trade;

	/**********************
	 *  STATE VARIABLES *
	 **********************/

	// Mapping to store the trades of each user.
	mapping(address => uint256[]) public userToTradesIDs;

	// Mapping to store each trade, identified by its trade ID.
	mapping(uint256 => TradeLib.Trade) public tradeIDToTrade;

	// Counter to keep track of the trade ID.
	Counters.Counter private _tradeId;

	// Array to store the trade IDs of all pending trades.
	uint256[] public pendingTradesIDs;

	// Mapping to store the ETH amount sent by the seller for each trade.
	mapping(uint => uint) public tradeIdToETHFromSeller;

	/**********
	 * EVENTS *
	 **********/

	event TradeCreated(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeConfirmed(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeExpired(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeCanceled(uint256 indexed tradeID, address indexed seller, address indexed buyer);
	event TradeWithdrawn(uint256 indexed tradeID, address indexed seller, address indexed buyer);

	/**
	 * @notice - Creates a new trade
	 * @dev - The trade is created by the seller, takes the trade data as input and transfers the tokens, NFTs or ETH to the contract.
	 *  The trade is then added to the state variables and the trade ID is incremented.
	 * @param transactionInput - The trade data
	 */
	function addTrade(TradeLib.Trade memory transactionInput) external payable {
		SecurityFunctions.validateAddTrade(transactionInput, msg.value);

		// Modify the transactionInput to include the tradeId, deadline, status, msg.sender as seller and a date created attribute
		transactionInput.tradeId = _tradeId.current();
		transactionInput.seller = msg.sender;
		transactionInput.status = TradeLib.TradeStatus.Pending;
		transactionInput.deadline = block.timestamp + transactionInput.deadline;
		transactionInput.dateCreated = block.timestamp;

		// Transfer the tokens and NFTs to the contract
		IERC20 token = IERC20(transactionInput.token.tokenToSell);
		IERC721 NFTToSell = IERC721(transactionInput.nft.addressNFTToSell);
		if (transactionInput.token.amountOfTokenToSell > 0)
			token.safeTransferFrom(msg.sender, address(this), transactionInput.token.amountOfTokenToSell);
		if (transactionInput.nft.addressNFTToSell != address(0))
			NFTToSell.safeTransferFrom(msg.sender, address(this), transactionInput.nft.tokenIdNFTToSell);
		tradeIdToETHFromSeller[_tradeId.current()] += msg.value;

		// Add the trade to the state variables
		tradeIDToTrade[_tradeId.current()] = transactionInput;
		userToTradesIDs[msg.sender].push(_tradeId.current());
		userToTradesIDs[transactionInput.buyer].push(_tradeId.current());
		pendingTradesIDs.push(_tradeId.current());

		// emit the TradeCreated event
		emit TradeCreated(_tradeId.current(), msg.sender, transactionInput.buyer);

		// increment the tradeId
		_tradeId.increment();
	}

	/**
	 * @notice - Confirms a trade
	 * @dev - The trade is confirmed by the buyer, takes the trade ID as input and transfers the tokens, NFTs or ETH to the seller.
	 * The tokens, NFT or ETH is transferred to the buyer from the contract.
	 * @param _tradeID - The trade ID
	 */

	function confirmTrade(uint256 _tradeID) external payable {
		TradeLib.Trade memory trade = tradeIDToTrade[_tradeID];
		if (trade.status != TradeLib.TradeStatus.Pending) revert TradeIsNotPending();
		address sender = msg.sender;
		uint value = msg.value;

		// Validate the trade
		SecurityFunctions.validateConfirmTrade(trade, sender, value);

		// Transfer the tokens, NFTs and ETH to the buyer and seller according to the trade
		if (trade.token.amountOfTokenToBuy > 0) {
			IERC20(trade.token.tokenToBuy).safeTransferFrom(msg.sender, trade.seller, trade.token.amountOfTokenToBuy);
		}
		if (trade.nft.addressNFTToBuy != address(0)) {
			IERC721(trade.nft.addressNFTToBuy).safeTransferFrom(msg.sender, trade.seller, trade.nft.tokenIdNFTToBuy);
		}
		if (trade.eth.amountOfETHToBuy > 0) payable(trade.seller).transfer(msg.value);

		if (trade.token.amountOfTokenToSell > 0) {
			IERC20(trade.token.tokenToSell).safeTransfer(trade.buyer, trade.token.amountOfTokenToSell);
		}

		if (trade.nft.addressNFTToSell != address(0))
			IERC721(trade.nft.addressNFTToSell).safeTransferFrom(
				address(this),
				trade.buyer,
				trade.nft.tokenIdNFTToSell
			);

		if (trade.eth.amountOfETHToSell > 0) payable(trade.buyer).transfer(trade.eth.amountOfETHToSell);
		tradeIdToETHFromSeller[_tradeID] -= trade.eth.amountOfETHToSell;

		// Update the trade status and remove it from the pending trades
		trade.status = TradeLib.TradeStatus.Confirmed;
		removePendingTrade(getPendingTradeIndex(trade.tradeId));
		tradeIDToTrade[_tradeID] = trade;

		// emit the TradeConfirmed event
		emit TradeConfirmed(trade.tradeId, trade.seller, trade.buyer);
	}

	/**
	 * @notice - Cancels a trade
	 * @dev - The trade is canceled by the seller, takes the trade ID as input and transfers the tokens, NFTs or ETH back to the seller.
	 * @param _tradeID - The trade ID
	 */
	function cancelTrade(uint256 _tradeID) external {
		TradeLib.Trade storage trade = tradeIDToTrade[_tradeID];
		address sender = msg.sender;

		// Validate the trade
		SecurityFunctions.validateCancelTrade(trade, sender);

		// Transfer the tokens, NFTs and ETH to the seller according to the trade
		if (trade.token.amountOfTokenToSell > 0)
			IERC20(trade.token.tokenToSell).safeTransfer(trade.seller, trade.token.amountOfTokenToSell);

		if (trade.nft.addressNFTToSell != address(0))
			IERC721(trade.nft.addressNFTToSell).safeTransferFrom(
				address(this),
				trade.seller,
				trade.nft.tokenIdNFTToSell
			);

		if (trade.eth.amountOfETHToSell > 0) payable(trade.seller).transfer(trade.eth.amountOfETHToSell);
		tradeIdToETHFromSeller[_tradeID] -= trade.eth.amountOfETHToSell;

		// Update the trade status and remove it from the pending trades
		trade.status = TradeLib.TradeStatus.Canceled;
		removePendingTrade(getPendingTradeIndex(trade.tradeId));

		// emit the TradeCanceled event
		emit TradeCanceled(trade.tradeId, trade.seller, trade.buyer);
	}

	/**
	 * @notice - Checks if a trade is expired
	 * @dev - Checks if a trade is expired and updates the trade status
	 */

	function checkExpiredTrades() external {
		// Iterate over the pending trades and check if they are expired
		for (uint i = pendingTradesIDs.length; i > 0; i--) {
			TradeLib.Trade storage trade = tradeIDToTrade[pendingTradesIDs[i - 1]];
			if (trade.deadline <= block.timestamp) {
				trade.status = TradeLib.TradeStatus.Expired;

				// Remove the trade from the pending trades
				removePendingTrade(i - 1);

				// Emit the TradeExpired event
				emit TradeExpired(trade.tradeId, trade.seller, trade.buyer);
			}
		}
	}

	/**
	 * @notice - Removes the pending trades
	 * @dev - Removes the pending trades from the pending trades array
	 * @param index - The index of the trade to remove
	 */
	function removePendingTrade(uint256 index) internal {
		if (index >= pendingTradesIDs.length) return;
		pendingTradesIDs[index] = pendingTradesIDs[pendingTradesIDs.length - 1];
		pendingTradesIDs.pop();
	}

	/**
	 * @notice - Withdraws the asset from the contract
	 * @dev - Withdraws the asset from the contract, takes the trade ID as input and transfers the tokens, NFTs or ETH to the seller.
	 * @param _tradeID - The trade ID
	 */
	function withdraw(uint256 _tradeID) external {
		TradeLib.Trade storage trade = tradeIDToTrade[_tradeID];
		address sender = msg.sender;
		SecurityFunctions.validateWithdraw(trade, sender);

		// Transfer the tokens, NFTs and ETH to the seller according to the trade
		if (
			address(this).balance < trade.eth.amountOfETHToSell ||
			tradeIdToETHFromSeller[_tradeID] < trade.eth.amountOfETHToSell
		) revert InsufficientBalance();

		if (trade.token.amountOfTokenToSell > 0)
			IERC20(trade.token.tokenToSell).safeTransfer(trade.seller, trade.token.amountOfTokenToSell);

		if (trade.nft.addressNFTToSell != address(0))
			IERC721(trade.nft.addressNFTToSell).safeTransferFrom(
				address(this),
				trade.seller,
				trade.nft.tokenIdNFTToSell
			);

		if (trade.eth.amountOfETHToSell > 0) payable(trade.seller).transfer(trade.eth.amountOfETHToSell);

		// Update the trade status and remove it from the pending trades
		tradeIdToETHFromSeller[_tradeID] -= trade.eth.amountOfETHToSell;
		trade.status = TradeLib.TradeStatus.Withdrawn;

		// emit the TradeWithdrawn event
		emit TradeWithdrawn(trade.tradeId, trade.seller, trade.buyer);
	}

	/***********
	 * GETTERS *
	 ***********/

	function getTrade(uint256 _tradeID) external view returns (TradeLib.Trade memory) {
		return tradeIDToTrade[_tradeID];
	}

	function getTradesIDsByUser(address _user) external view returns (uint256[] memory) {
		return userToTradesIDs[_user];
	}

	function getPendingTradesIDs() external view returns (uint256[] memory) {
		return pendingTradesIDs;
	}

	function getTradeStatus(uint256 _tradeID) external view returns (TradeLib.TradeStatus) {
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
