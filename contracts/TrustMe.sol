// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

error InvalidAddress();
error CannotTradeSameToken();
error TokenAndNFTAddressCannotBeEqual();
error CannotTradeWithSelf();
error DeadlineShouldBeAtLeast5Minutes();
error InvalidAmount();
error InsufficientBalance();
error OnlyBuyer();
error OnlySeller();
error OnlySellerOrBuyer();
error TradeIsNotPending();
error TradeIsExpired();
error InsufficientAllowance();
error UpkeepNotNeeded();
error CannotWithdrawTimeNotPassed();
error TradeIsNotExpired();

// NT error added for ETH implementation
error IncorrectAmoutOfETHTransferred();

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
		uint256 amountOfETHToSell; //added for ETH
		uint256 amountOfTokenToSell;
		uint256 amountOfETHToBuy; //added for ETH
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

	//  NT: do we need to require that either tokens or ETH
	// are are traded but not both at the same time on one side?
	// I have not done so here.
	// In the current UI it is either one or the other,
	// but future versions should facilitate
	// batching multiple assets on either side of the trade
	// (including both ETH and tokens on one side of the trade).

	modifier validateAddTrade(
		address _buyer,
		address _tokenToSell,
		address _addressNFTToSell,
		uint256 _tokenIdNFTToSell,
		address _tokenToBuy,
		address _addressNFTToBuy,
		uint256 _tokenIdNFTToBuy,
		uint256 _amountOfTokenToSell,
		uint256 _amountOfETHToSell, // added for ETH
		uint256 _amountOfTokenToBuy,
		uint256 _amountOfETHToBuy // added for ETH
	) {
		if (msg.sender == address(0)) revert InvalidAddress();
		if (_buyer == address(0)) revert InvalidAddress();
		if (_amountOfTokenToSell > 0 && _tokenToSell == address(0)) revert InvalidAddress();
		if (_amountOfTokenToBuy > 0 && _tokenToBuy == address(0)) revert InvalidAddress();
		if (_tokenToSell == _tokenToBuy) revert CannotTradeSameToken();
		if (_tokenToSell == _addressNFTToBuy) revert CannotTradeSameToken();
		if (_tokenToSell == _addressNFTToSell) revert TokenAndNFTAddressCannotBeEqual();
		if (_tokenToBuy == _addressNFTToBuy) revert TokenAndNFTAddressCannotBeEqual();
		if (msg.sender == _buyer) revert CannotTradeWithSelf();
		if (_amountOfTokenToSell == 0 && _amountOfETHToSell == 0 && _addressNFTToSell == address(0))
			revert InvalidAmount();
		if (_amountOfTokenToBuy == 0 && _amountOfETHToBuy == 0 && _addressNFTToBuy == address(0))
			revert InvalidAmount();
		if (IERC20(_tokenToSell).balanceOf(msg.sender) < _amountOfTokenToSell) revert InsufficientBalance();
		if (_addressNFTToSell != address(0) && IERC721(_addressNFTToSell).ownerOf(_tokenIdNFTToSell) != msg.sender)
			revert InsufficientBalance();

		// added for ETH
		if (_amountOfETHToSell > 0 && _amountOfETHToBuy > 0) revert CannotTradeSameToken();
		if (msg.value != _amountOfETHToSell) revert IncorrectAmoutOfETHTransferred();
		_;
	}

	function addTrade(
		TransactionInput calldata transactionInput
	)
		external
		payable
		validateAddTrade(
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
			transactionInput.amountOfETHToBuy
		)
	{
		uint deadline = block.timestamp + transactionInput.tradePeriod;
		IERC20 token = IERC20(transactionInput.tokenToSell);
		IERC721 NFTToSell = IERC721(transactionInput.addressNFTToSell);
		if (transactionInput.amountOfTokenToSell > 0)
			token.safeTransferFrom(msg.sender, address(this), transactionInput.amountOfTokenToSell);
		if (transactionInput.addressNFTToSell != address(0))
			NFTToSell.safeTransferFrom(msg.sender, address(this), transactionInput.tokenIdNFTToSell);

		// added for ETH
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
		if (trade.buyer != msg.sender) revert OnlyBuyer();
		if (trade.deadline < block.timestamp) revert TradeIsExpired();

		// Do we need the check inserted and commented out below? Is it enough to rely on ERC20 contract checking this? What if it is a custom token without this check? This check used to be in the validateCloseTrade modifier. Why did you remove it? I assume that a reason might be that the balance is taken after the transfer, which would effectively mean that the buyer needs to have twice the number of tokens it agreed to transfer.

		// if (IERC20(trade.tokenToBuy).balanceOf(msg.sender) < trade.amountOfTokenToBuy) revert InsufficientBalance();

		if (IERC20(trade.tokenToBuy).allowance(msg.sender, address(this)) < trade.amountOfTokenToBuy)
			revert InsufficientAllowance();

		if (
			trade.addressNFTToBuy != address(0) &&
			IERC721(trade.addressNFTToBuy).getApproved(trade.tokenIdNFTToBuy) != address(this)
		) revert InsufficientAllowance();

		if (IERC20(trade.tokenToSell).balanceOf(address(this)) < trade.amountOfTokenToSell)
			revert InsufficientBalance(); // NT added extra condition - what if our contract is drained? We don't want the contagion to spread.

		if (
			trade.addressNFTToSell != address(0) &&
			IERC721(trade.addressNFTToSell).ownerOf(trade.tokenIdNFTToSell) != address(this)
		) revert InsufficientBalance();

		// made additions and changes in connection with ETH implementation

		if (msg.value != trade.amountOfETHToBuy) revert IncorrectAmoutOfETHTransferred();
		if (
			address(this).balance < trade.amountOfETHToSell ||
			tradeIdToETHFromSeller[_tradeID] < trade.amountOfETHToSell
		) revert InsufficientBalance();

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
		if (trade.status != TradeStatus.Pending) revert TradeIsNotPending();
		if (msg.sender != trade.seller && msg.sender != trade.buyer) revert OnlySellerOrBuyer(); // NT: enabled the buyer to cancel too (I think this is important, see my comment in discord, but let me know if you disagreee)

		if (
			address(this).balance < trade.amountOfETHToSell ||
			tradeIdToETHFromSeller[_tradeID] < trade.amountOfETHToSell
		) revert InsufficientBalance(); //added for ETH

		if (trade.deadline < block.timestamp) revert TradeIsExpired(); // NT: should a user be able to cancel a trade even if it is expired, even if only for peace of mind?

		// added for ETH
		if (trade.amountOfTokenToSell > 0)
			IERC20(trade.tokenToSell).safeTransfer(trade.seller, trade.amountOfTokenToSell);

		if (trade.addressNFTToSell != address(0))
			IERC721(trade.addressNFTToSell).safeTransferFrom(address(this), trade.seller, trade.tokenIdNFTToSell);

		if (trade.amountOfETHToSell > 0) payable(trade.seller).transfer(trade.amountOfETHToSell);
		tradeIdToETHFromSeller[_tradeID] -= trade.amountOfETHToSell;

		trade.status = TradeStatus.Canceled;
		removePendingTrade(getPendingTradeIndex(trade.id));
		// tradeIDToTrade[_tradeID] = trade; NT: this is not needed if you change trade variable in this function from memory to storage - saves a tiny bit of code.

		emit TradeCanceled(trade.id, trade.seller, trade.buyer);
	}

	function checkExpiredTrades() external {
		for (uint i = pendingTradesIDs.length - 1; i >= 0; i--) {
			Trade storage trade = tradeIDToTrade[pendingTradesIDs[uint(i)]];
			if (trade.deadline <= block.timestamp) {
				trade.status = TradeStatus.Expired;
				// removePendingTrade(getPendingTradeIndex(trade.id)); //NT: is this necessary? Is getPendingTradeIndex(trade.id) not just equal to i? The line below should work as well shouldnt it? Tests pass.
				removePendingTrade(i);
				emit TradeExpired(trade.id, trade.seller, trade.buyer);
				if (i == 0) break;
			}
		}
	}

	function removePendingTrade(uint256 index) internal {
		if (index >= pendingTradesIDs.length) return;

		for (uint i = index; i < pendingTradesIDs.length - 1; i++) {
			pendingTradesIDs[i] = pendingTradesIDs[i + 1]; // isnt this a very expensive method of removing an element? There is no need to maintain the same order and move all elements back one space is there?
		}
		pendingTradesIDs.pop();
	}

	function withdraw(uint256 _tradeID) external {
		Trade storage trade = tradeIDToTrade[_tradeID];
		if (trade.status != TradeStatus.Expired) revert TradeIsNotExpired();
		if (trade.seller != msg.sender) revert OnlySeller();

		// added for ETH
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
		// tradeIDToTrade[_tradeID] = trade; // NT not nessary if you change trade memory to storage
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
