# TrustMe Contract

A Direct versus payment (DVP) contract on the Ethereum blockchain that facilitates trustless over the counter(OTC) trades between a buyer and a seller. The contract is written in Solidity, a smart contract programming language.

## Table of Contents

-   Overview
-   Features
-   Security Considerations
-   Requirements
-   Getting Started
-   Functions
-   Types
-   Events
-   Mapping Variables
-   State Variables
-   Support

## Overview

The TrustMe contract is a simple, yet powerful solution for conducting secure, trustless OTC trades between a buyer and a seller on the Ethereum blockchain. The contract makes use of the Ethereum Virtual Machine (EVM) to enforce trade rules and settle trades automatically. With TrustMe, both parties can be sure that the terms of their trade will be upheld without the need for intermediaries or third-party services.

## Features

-   Facilitates secure, trustless trades between a buyer and a seller.
-   Enables trades with ERC-20 tokens and ETH.
-   Provides a unique trade ID for every trade.
-   Allows trades to be added, confirmed, canceled, and expired.
-   Includes security functions to validate trades and prevent malicious behavior.

## Security Considerations

The TrustMe contract has been thoroughly tested and is considered secure for normal use cases. However, like any smart contract, it is important to understand the potential security risks before using it in a production environment. To ensure the security of your trades, it is recommended to only use TrustMe with trusted and reputable counter-parties. Additionally, it is recommended to thoroughly test the contract in a test environment before deploying it to a mainnet environment.

## Requirements

-   A test environment with a deployed Ethereum blockchain, such as Rinkeby, Kovan, or Ropsten.
-   A wallet or client with the ability to interact with the Ethereum blockchain, such as MetaMask, MyEtherWallet, or Remix.
-   An understanding of smart contract development and the Ethereum blockchain.

## Getting Started

To get started with the TrustMe contract, you will need to deploy it to an Ethereum blockchain. This can be done using a tool like Remix or Truffle, which will allow you to interact with the contract and execute its functions.

Once the contract is deployed, you can add trades using the `addTrade` function. This function requires the buyer's address, the address of the token being sold, the address of the token being bought, the amount of token being sold, the amount of token being bought, and the trade period (the duration of the trade).

Once a trade has been added, it will have a status of Pending until it is either confirmed, canceled, or expires. The trade can be confirmed using the `confirmTrade` function, and canceled using the `cancelTrade` function. The trade will also expire automatically if the trade period has passed.

## Functions

-   `addTrade`: adds a trade between a buyer and a seller.
-   `confirmTrade`: confirms a pending trade.
-   `cancelTrade`: cancels a pending trade.
-   `withdraw`: allows the buyer to withdraw from a trade that has been confirmed or has expired.

## Types

-   `Trade`
