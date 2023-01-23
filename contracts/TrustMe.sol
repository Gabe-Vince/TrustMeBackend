// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";



contract Escrow {

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
        address indexed buyer,
    );

    event TradeCancelled(
        bytes32 indexed tradeId,
        address indexed seller,
        address indexed buyer,
    );

    event TradeExpired(
        bytes32 indexed tradeId,
        address indexed seller,
        address indexed buyer,
    );

    // State Variables

    enum TradeStatus {Created, Accepted, Cancelled, Expired}

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
    bytes32 public tradeId;


    // Modifiers

    modifier onlyValidUser() {
        require(msg.sender != address(0), "Invalid user");
        _;
    }

  function createTrade(
        address _seller,
        address _buyer,
        address _tokenToSell,
        address _tokenToBuy,
        uint256 _amountOfTokenToSell,
        uint256 _amountOfTokenToBuy,
        uint256 _deadline
    ) public onlyValidUser {
        require(_tokenToSell != address(0), "Invalid token address");
        require(_tokenToBuy != address(0), "Invalid token address");
        IERC20 token = IERC20(_tokenToSell);
        token.approve(address(this), _amountOfTokenToSell);
        token.transferFrom(_seller, address(this), _amountOfTokenToSell);

        tradeId = keccak256(abi.encodePacked(block.timestamp, _seller, _buyer));
        Trade memory trade = Trade(
            _seller,
            _buyer,
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy,
            tradeId,
            _deadline,
            TradeStatus.Created
        );
        trades[tradeId] = trade;
        emit TradeCreated(
            _seller,
            _buyer,
            tradeId
            _tokenToSell,
            _tokenToBuy,
            _amountOfTokenToSell,
            _amountOfTokenToBuy
        );
    }

    function acceptTrade(uint256 _tradeId) public {
        Trade memory trade = trades[_tradeId];
        require(trade.buyer == msg.sender, "You are not the buyer");
        require(trade.deadline > block.timestamp, "Trade is expired");

        // Approve the escrow contract to transfer the tokens
        IERC20 _token = IERC20(trade.tokenToBuy);
        _token.approve(address(this), trade.amountOfTokenToBuy);

        // transfer tokens from escrow to seller
        IERC20 token = IERC20(trade.tokenToSell);
        token.transfer(trade.seller, trade.amountOfTokenToBuy);

        // transfer tokens from escrow to buyer
        token = IERC20(trade.tokenToBuy);
        token.transfer(trade.buyer, trade.amountOfTokenToSell);
    }



    //TODO Oracle that will refund sellers Token
    


}