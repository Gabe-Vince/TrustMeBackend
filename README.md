<p align="center">
  <img src="./public/Logo.jpeg" height="200px" width="100%">
</p>

A Delivery versus Payment (DVP) contract built for the Ethereum blockchain that facilitates trustless over the counter(OTC) settlements between a buyer and a seller. The contract is written in Solidity and tests are written in Typescript.
The [Frontend](https://github.com/mengiefen/TrustMe-Settlements) has all the functionailty for the smart contract with a user friendly interface.

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Security Considerations](#security-considerations)
-   [Challenges and Future Features](#challenges-and-future-features)
-   [Functions](#functions)
-   [Support](#Support)
-

## Overview

The TrustMe contract is a simple, yet powerful solution for conducting secure, trustless OTC trades between a buyer and a seller on the Ethereum blockchain. The contract makes use of the Ethereum Virtual Machine (EVM) to enforce trade rules and settle trades automatically. With TrustMe, both parties can be sure that the terms of their trade will be upheld without the need for intermediaries or third-party services.

## Features

-   Facilitates secure, trustless trades between two parties.
-   Enables trades with ERC-20 Tokens, ETH and ERC-721 Tokens.
-   Provides a unique trade ID for every trade.
-   Allows trades to be added, confirmed, canceled, and expired.
-   Includes security functions to validate trades and prevent malicious behavior.
-   Includes a TradeLibrary for the trade data structure

## Security Considerations

The TrustMe contract has been thoroughly tested and is considered secure for normal use cases. However, like any smart contract, it is important to understand the potential security risks before using it in a production environment. To ensure the security of your trades, it is recommended to only use TrustMe with trusted and reputable counter-parties. Additionally, it is recommended to thoroughly test the contract in a test environment before deploying it to a mainnet environment.

## Challenges and Future Features

### Challenges

-   The use of a library that contained our data structure was neccessary because using a regular struct gave multiple errors when being inputted into functions. The new library also made values easier to obtain.
-   We faced the challenge of having large modifiers with multiple conditionals that made the contract hard to read and to debug. We introduced libraries that handled all the validation and security of trade inputs.

### Future Features

-   In order for our data on the frontend to be rendered more efficiently, we would like to develop a Sub Graph that will link the Trade ID to the relevant data. We started the boiler plate of the Sub Graph which can be found [here](https://github.com/pokhrelanmol/trustme-subgraph)
-   We would like to include multiple asset transfers in the future. Where settlements can be made on batch asset classes.
-   A huge focus for us moving forward is being able to make the contract modular. Thoughts of implementing Diamond Standard ERC-2535 into the project is necessary if it is deployed to mainet. This will include different faucets for different functionality.

## Functions

-   `addTrade`: adds a trade between two parties.
-   `confirmTrade`: confirms a pending trade.
-   `cancelTrade`: cancels a pending trade.
-   `withdraw`: allows the buyer to withdraw from a trade that has been confirmed or has expired.
-   `checkExpiredTrade`: will set the status to trades who's deadline has been passed as Expired. This function will not be called manually but instead be registered as a Time-Based Chainlink UpKeep.

