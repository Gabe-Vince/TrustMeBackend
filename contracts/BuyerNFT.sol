// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract BuyerNFT is ERC721PresetMinterPauserAutoId {
	constructor() ERC721PresetMinterPauserAutoId("BuyerNFT", "BuyerNFT", "") {}
}
