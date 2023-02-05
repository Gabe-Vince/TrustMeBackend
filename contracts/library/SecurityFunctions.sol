// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../library/Validation.sol";
import "../library/TradeLib.sol";

import "hardhat/console.sol";

library SecurityFunctions {
	// check if the trade is valid

	function validateAddTrade(TradeLib.Trade memory trade, uint value) internal {
		Validation.checkEmptyAddress(msg.sender);
		Validation.checkEmptyAddress(trade.buyer);
		Validation.checkSameAddress(msg.sender, trade.buyer);
		Validation.checkSameToken(trade.token.tokenToSell, trade.token.tokenToBuy);
		Validation.checkTokenInput(trade.token.tokenToSell, trade.token.amountOfTokenToSell); // if no token to sell, amount should be 0
		Validation.checkTokenInput(trade.token.tokenToBuy, trade.token.amountOfTokenToBuy); // if no token to buy, amount should be 0
		Validation.checkNftOwner(trade.nft.addressNFTToSell, msg.sender, trade.nft.tokenIdNFTToSell);
		Validation.checkETHToETHTrade(trade.eth.amountOfETHToSell, trade.eth.amountOfETHToBuy);
		Validation.checkNftInputs(trade.nft.addressNFTToSell, trade.nft.addressNFTToBuy);
		Validation.checkSameAddress(trade.token.tokenToSell, trade.nft.addressNFTToSell);
		Validation.checkSameAddress(trade.token.tokenToSell, trade.nft.addressNFTToBuy);
		Validation.checkSameAddress(trade.token.tokenToBuy, trade.nft.addressNFTToSell);
		Validation.checkSameAddress(trade.token.tokenToBuy, trade.nft.addressNFTToBuy);
		Validation.checkEmptyInputs(
			trade.token.amountOfTokenToSell,
			trade.eth.amountOfETHToSell,
			trade.nft.addressNFTToSell
		);
		Validation.checkEmptyInputs(
			trade.token.amountOfTokenToBuy,
			trade.eth.amountOfETHToBuy,
			trade.nft.addressNFTToBuy
		);

		if (value != trade.eth.amountOfETHToSell) revert IncorrectAmoutOfETHTransferred();
	}

	function validateConfirmTrade(TradeLib.Trade memory trade, address sender, uint value) internal {
		Validation.checkBuyer(trade.buyer, sender);
		Validation.checkDeadline(trade.deadline);
		Validation.checkNftOwner(trade.nft.addressNFTToBuy, trade.buyer, trade.nft.tokenIdNFTToBuy);
		Validation.checkNftApproval(trade.nft.addressNFTToBuy, address(this), trade.nft.tokenIdNFTToBuy);
		Validation.checkNftOwner(trade.nft.addressNFTToSell, address(this), trade.nft.tokenIdNFTToSell);
		Validation.checkEthAmount(value, trade.eth.amountOfETHToBuy);
	}

	function validateCancelTrade(TradeLib.Trade memory trade, address sender) internal {
		if (trade.status != TradeLib.TradeStatus.Pending) revert TradeIsNotPending();
		Validation.checkSellerOrBuyer(trade.seller, trade.buyer, sender);
		// Validation.checkNftOwner(trade.addressNFTToSell, sender, trade.tokenIdNFTToSell); //why this check? he will never gonna have the NFT bcoz we already transfered it to the contract in the addTrade function
		Validation.checkDeadline(trade.deadline);
	}

	function validateWithdraw(TradeLib.Trade memory trade, address sender) internal {
		if (trade.status != TradeLib.TradeStatus.Expired) revert TradeIsNotExpired();
		Validation.checkTradeNotExpired(trade.deadline);
		Validation.checkSeller(trade.seller, sender);
		// Validation.checkNftOwner(trade.addressNFTToSell, sender, trade.tokenIdNFTToSell);
	}
}
