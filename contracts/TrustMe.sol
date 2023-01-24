// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

error InvalidAddress();
error CannotTradeSameToken();
error CannotTradeWithSelf();
error DeadlineShouldBeAtLeastAMinute();
error InvalidAmount();
error InsufficientBalance();

contract TrustMe {
    // Events
    event TradeCreated(
        address indexed seller,
        address indexed buyer,
        address tokenToSell,
        address tokenToBuy,
        uint256 amountOfTokenToSell,
        uint256 amountOfTokenToBuy
    );

    event TradeAccepted(address indexed seller, address indexed buyer);

    event TradeExpired(address indexed seller, address indexed buyer);

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
        uint256 deadline;
        TradeStatus status;
    }
    mapping(address => Trade[]) public userToTrades;
    mapping(address => mapping(address => uint256)) public userToTokenToAmount; // why this?

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
        if (IERC20(_tokenToSell).balanceOf(msg.sender) < _amountOfTokenToSell)
            revert InsufficientBalance();

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
        token.transferFrom(msg.sender, address(this), _amountOfTokenToSell);

        Trade memory trade = Trade(
            msg.sender,
            _buyer,
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy,
            _deadline,
            TradeStatus.Pending
        );

        userToTrades[msg.sender].push(trade);
        userToTokenToAmount[msg.sender][_tokenToSell] = _amountOfTokenToSell;

        emit TradeCreated(
            msg.sender,
            _buyer,
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy
        );
    }

    function confirmTrade(address seller, uint256 index) external {}
}
