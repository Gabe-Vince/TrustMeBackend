// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

error InvalidAddress();
error CannotTradeSameToken();
error CannotTradeWithSelf();
error DeadlineShouldBeAtLeastAMinute();
error InvalidAmount();

contract TrustMe {
    // Events
    event TradeCreated(
        address indexed seller,
        address indexed buyer,
        bytes32 indexed tradeId,
        address tokenToSell,
        address tokenToBuy,
        uint256 amountOfTokenToSell,
        uint256 amountOfTokenToBuy
    );

    event TradeAccepted(
        bytes32 indexed tradeId,
        address indexed seller,
        address indexed buyer
    );

    event TradeExpired(
        bytes32 indexed tradeId,
        address indexed seller,
        address indexed buyer
    );

    // State Variables

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
        bytes32 tradeId;
        uint256 deadline;
        TradeStatus status;
    }

    mapping(bytes32 => Trade) public trades;
    mapping(address => bytes32[]) public userToTradeIds;
    // mapping(address => bytes32[]) public userTradesAsSeller;
    // mapping(address => bytes32[]) public userTradesAsBuyer;
    mapping(address => mapping(address => uint256)) public tokenAllowance; // why this?

    bytes32 public tradeId;

    // Modifiers

    modifier onlyValidTrade(
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
        _;
    }

    function createTrade(
        address _buyer,
        address _tokenToSell,
        address _tokenToBuy,
        uint256 _amountOfTokenToSell,
        uint256 _amountOfTokenToBuy,
        uint256 _deadline
    )
        public
        onlyValidTrade(
            _buyer,
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy
        )
    {
        IERC20 token = IERC20(_tokenToSell);
        // token.approve(address(this), _amountOfTokenToSell);
        token.transferFrom(msg.sender, address(this), _amountOfTokenToSell);
        tradeId = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, _buyer) // timestamp may be vulnerable time manipulation attack. instead of this can we use block.number or block.blockhash? or not use block data at all?
        );
        Trade memory trade = Trade(
            msg.sender,
            _buyer,
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy,
            tradeId,
            _deadline,
            TradeStatus.Pending
        );

        trades[tradeId] = trade;
        userToTradeIds[msg.sender].push(tradeId);
        // userTradesAsBuyer[_buyer].push(tradeId);
        tokenAllowance[msg.sender][_tokenToSell] = _amountOfTokenToSell;

        emit TradeCreated(
            msg.sender,
            _buyer,
            tradeId,
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy
        );
    }
}
