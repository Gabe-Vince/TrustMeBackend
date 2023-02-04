// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../library/Validation.sol";
import "../TrustMe.sol";

library SecurityFunctions {
	// check if the trade is valid

	function validateAddTrade(
		address _buyer,
		address _tokenToSell,
		address _addressNFTToSell,
		uint256 _tokenIdNFTToSell,
		address _tokenToBuy,
		address _addressNFTToBuy,
		uint256 _tokenIdNFTToBuy,
		uint256 _amountOfTokenToSell,
		uint256 _amountOfETHToSell,
		uint256 _amountOfTokenToBuy,
		uint256 _amountOfETHToBuy,
		uint value
	) internal {
		Validation.checkEmptyAddress(msg.sender);
		Validation.checkEmptyAddress(_buyer);
		Validation.checkSameAddress(msg.sender, _buyer);
		Validation.checkSameToken(_tokenToSell, _tokenToBuy);
		Validation.checkTokenInput(_tokenToSell, _amountOfTokenToSell); // if no token to sell, amount should be 0
		Validation.checkTokenInput(_tokenToBuy, _amountOfTokenToBuy); // if no token to buy, amount should be 0
		Validation.checkNftOwner(_addressNFTToSell, msg.sender, _tokenIdNFTToSell);
		Validation.checkETHToETHTrade(_amountOfETHToSell, _amountOfETHToBuy);
		Validation.checkNftInputs(_addressNFTToSell, _addressNFTToBuy);
		Validation.checkSameAddress(_tokenToSell, _addressNFTToSell);
		Validation.checkSameAddress(_tokenToSell, _addressNFTToBuy);
		Validation.checkSameAddress(_tokenToBuy, _addressNFTToSell);
		Validation.checkSameAddress(_tokenToBuy, _addressNFTToBuy);
		Validation.checkEmptyInputs(_amountOfTokenToSell, _amountOfETHToSell, _addressNFTToSell);
		Validation.checkEmptyInputs(_amountOfTokenToBuy, _amountOfETHToBuy, _addressNFTToBuy);

		if (value != _amountOfETHToSell) revert IncorrectAmoutOfETHTransferred();
	}

	function validateConfirmTrade(
		TrustMe.Trade memory trade,
		address sender,
		uint value
	) internal {
		Validation.checkBuyer(trade.buyer, sender);
		Validation.checkDeadline(trade.deadline);
		Validation.checkNftOwner(trade.addressNFTToBuy, trade.buyer, trade.tokenIdNFTToBuy);
		Validation.checkNftApproval(trade.addressNFTToBuy, address(this), trade.tokenIdNFTToBuy);
		Validation.checkNftOwner(trade.addressNFTToSell, address(this), trade.tokenIdNFTToSell);
		Validation.checkEthAmount(value, trade.amountOfETHToBuy);
	}
}
