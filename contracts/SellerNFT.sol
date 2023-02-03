// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract SellerNFT is ERC721PresetMinterPauserAutoId {
	constructor() ERC721PresetMinterPauserAutoId("SellerNFT", "SellerNFT", "") {}
}
