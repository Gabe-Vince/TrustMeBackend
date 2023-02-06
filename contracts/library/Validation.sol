// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
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
error IncorrectAmoutOfETHTransferred();
error InvalidTokenInput();
error InvalidNFTInput();
error InvalidInputs();
error NotNftOwner();
error NftNotApproved();

library Validation {
	function checkEmptyAddress(address _address) internal pure returns (bool) {
		if (_address == address(0)) revert InvalidAddress();
		return true;
	}

	function checkEmptyAmount(uint256 _uint) internal pure returns (bool) {
		if (_uint == 0) revert InvalidAmount();
		return true;
	}

	function checkSameToken(address _address1, address _address2) internal pure returns (bool) {
		if (
			_address1 == 0x0000000000000000000000000000000000000000 &&
			_address2 == 0x0000000000000000000000000000000000000000
		) {
			return true;
		} else if (_address1 == _address2) revert CannotTradeSameToken();
		return true;
	}

	function checkSameAddress(address _address1, address _address2) internal pure returns (bool) {
		if (
			_address1 == 0x0000000000000000000000000000000000000000 &&
			_address2 == 0x0000000000000000000000000000000000000000
		) {
			return true;
		} else if (_address1 == _address2) revert CannotTradeWithSelf();
		return true;
	}

	function checkTokenInput(address _tokenAddress, uint256 _amount) internal pure returns (bool) {
		if (_tokenAddress == address(0) && _amount > 0) revert InvalidTokenInput();
		return true;
	}

	//     if nft addresses is not empty and same, revert
	function checkNftInputs(address _nftToSell, address _nftToBuy)
		internal
		pure
		returns (
			// uint _tokenIdToSell,
			// uint _tokenIdToBuy
			bool
		)
	{
		if (_nftToSell != address(0) && _nftToBuy != address(0) && _nftToSell == _nftToBuy) revert InvalidNFTInput();

		return true;
	}

	function checkEmptyInputs(
		uint amtAsset1,
		uint amtAsset2,
		address asset
	) internal pure returns (bool) {
		if (amtAsset1 == 0 && amtAsset2 == 0 && asset == address(0)) revert InvalidInputs();
		return true;
	}

	function checkETHToETHTrade(uint amtBuyerAsset, uint amtSellerAsset) internal pure returns (bool) {
		if (amtBuyerAsset > 0 && amtSellerAsset > 0) revert InvalidInputs();
		return true;
	}

	function checkNftOwner(
		address _nftAddress,
		address owner,
		uint _tokenId
	) internal view returns (bool) {
		if (_nftAddress != address(0) && IERC721(_nftAddress).ownerOf(_tokenId) != owner) revert NotNftOwner();
		return true;
	}

	function checkEthAmount(uint _amount1, uint amount2) internal pure returns (bool) {
		if (_amount1 < amount2) revert IncorrectAmoutOfETHTransferred();
		return true;
	}

	function checkBuyer(address addr1, address addr2) internal pure returns (bool) {
		if (addr1 != addr2) revert OnlyBuyer();
		return true;
	}

	function checkSeller(address addr1, address addr2) internal pure returns (bool) {
		if (addr1 != addr2) revert OnlySeller();
		return true;
	}

	function checkSellerOrBuyer(
		address addr1,
		address addr2,
		address sender
	) internal pure returns (bool) {
		if (addr1 != sender && addr1 != sender) revert OnlySellerOrBuyer();
		return true;
	}

	function checkDeadline(uint _deadline) internal view returns (bool) {
		if (_deadline < block.timestamp) revert TradeIsExpired();
		return true;
	}

	function checkTradeNotExpired(uint _deadline) internal returns (bool) {
		if (_deadline > block.timestamp) revert TradeIsNotExpired();
		return true;
	}
}
