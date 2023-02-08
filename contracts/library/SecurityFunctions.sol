// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "../library/Validation.sol";
import "../library/TradeLib.sol";

/**  @title SecurityFunctions
 * @notice This contract contains all the security functions used in the TrustMe contract
 * @dev This contract is used to store the security functions used in the TrustMe contract
 */

library SecurityFunctions {
	/**  @notice This validtaes the inputs of the addTrade function
	 * @param trade The trade struct
	 * @param value The amount of ETH sent with the transaction
	 */
	function validateAddTrade(TradeLib.Trade memory trade, uint value) internal {
		Validation.checkEmptyAddress(msg.sender);
		Validation.checkEmptyAddress(trade.buyer);
		Validation.checkSameAddress(msg.sender, trade.buyer);
		Validation.checkSameToken(trade.token.tokenToSell, trade.token.tokenToBuy);
		Validation.checkTokenInput(trade.token.tokenToSell, trade.token.amountOfTokenToSell);
		Validation.checkTokenInput(trade.token.tokenToBuy, trade.token.amountOfTokenToBuy);
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

	/**  @notice This validtaes the inputs of the confirmTrade function
	 * @param trade The trade struct
	 * @param sender The address of the sender
	 * @param value The amount of ETH sent with the transaction
	 */
	function validateConfirmTrade(TradeLib.Trade memory trade, address sender, uint value) internal {
		Validation.checkBuyer(trade.buyer, sender);
		Validation.checkDeadline(trade.deadline);
		Validation.checkNftOwner(trade.nft.addressNFTToBuy, trade.buyer, trade.nft.tokenIdNFTToBuy);
		Validation.checkNftOwner(trade.nft.addressNFTToSell, address(this), trade.nft.tokenIdNFTToSell);
		Validation.checkEthAmount(value, trade.eth.amountOfETHToBuy);
	}

	/** @notice This validtaes the inputs of the cancelTrade function
	 * @param trade The trade struct
	 * @param sender The address of the sender
	 */
	function validateCancelTrade(TradeLib.Trade memory trade, address sender) internal {
		if (trade.status != TradeLib.TradeStatus.Pending) revert TradeIsNotPending();
		Validation.checkSellerOrBuyer(trade.seller, trade.buyer, sender);

		Validation.checkDeadline(trade.deadline);
	}

	/** @notice This validtaes the inputs of the withdraw function
	 * @param trade The trade struct
	 * @param sender The address of the sender
	 */
	function validateWithdraw(TradeLib.Trade memory trade, address sender) internal {
		if (trade.status != TradeLib.TradeStatus.Expired) revert TradeIsNotExpired();
		Validation.checkTradeNotExpired(trade.deadline);
		Validation.checkSeller(trade.seller, sender);
	}
}
