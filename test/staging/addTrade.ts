describe('addTrade edge cases', () => {
	it('Edge Case: ETH to Token', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: ethers.constants.AddressZero,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: ethers.constants.AddressZero,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: ethers.constants.AddressZero,
				amountOfTokenToSell: 0,
				tokenToBuy: buyerToken.address,
				amountOfTokenToBuy: parseEther('10'),
			},
			eth: {
				amountOfETHToSell: parseEther('1'),
				amountOfETHToBuy: 0,
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const tx = await trustMe.connect(seller).addTrade(trade, {value: parseEther('1')});
		const etherBalance = await ethers.provider.getBalance(trustMe.address);
		await expect(etherBalance).to.equal(parseEther('1'));
	});
	it('Edge Case: ETH to NFT', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: ethers.constants.AddressZero,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: buyerNFT.address,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: ethers.constants.AddressZero,
				amountOfTokenToSell: 0,
				tokenToBuy: ethers.constants.AddressZero,
				amountOfTokenToBuy: 0,
			},
			eth: {
				amountOfETHToSell: parseEther('1'),
				amountOfETHToBuy: 0,
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const tx = await trustMe.connect(seller).addTrade(trade, {value: parseEther('1')});
		const etherBalance = await ethers.provider.getBalance(trustMe.address);
		await expect(etherBalance).to.equal(parseEther('1'));
	});
	it('Edge Case: Token to Token', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: ethers.constants.AddressZero,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: ethers.constants.AddressZero,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: sellerToken.address,
				amountOfTokenToSell: parseEther('10'),
				tokenToBuy: buyerToken.address,
				amountOfTokenToBuy: parseEther('10'),
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: 0,
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const approve = await sellerToken.connect(seller).approve(trustMe.address, parseEther('10'));
		const tx = await trustMe.connect(seller).addTrade(trade);
		const tokenBalance = await sellerToken.balanceOf(trustMe.address);
		await expect(tokenBalance).to.equal(parseEther('10'));
	});
	it('Edge Case: Token to NFT', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: ethers.constants.AddressZero,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: buyerNFT.address,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: sellerToken.address,
				amountOfTokenToSell: parseEther('10'),
				tokenToBuy: ethers.constants.AddressZero,
				amountOfTokenToBuy: parseEther('0'),
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: 0,
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const approve = await sellerToken.connect(seller).approve(trustMe.address, parseEther('10'));
		const tx = await trustMe.connect(seller).addTrade(trade);
		const tokenBalance = await sellerToken.balanceOf(trustMe.address);
		await expect(tokenBalance).to.equal(parseEther('10'));
	});
	it('Edge Case: Token to ETH', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: ethers.constants.AddressZero,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: ethers.constants.AddressZero,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: sellerToken.address,
				amountOfTokenToSell: parseEther('10'),
				tokenToBuy: ethers.constants.AddressZero,
				amountOfTokenToBuy: parseEther('0'),
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: parseEther('1'),
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const approve = await sellerToken.connect(seller).approve(trustMe.address, parseEther('10'));
		const tx = await trustMe.connect(seller).addTrade(trade);
		const tokenBalance = await sellerToken.balanceOf(trustMe.address);
		await expect(tokenBalance).to.equal(parseEther('10'));
	});
	it('Edge Case: NFT to Token', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: sellerNFT.address,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: ethers.constants.AddressZero,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: ethers.constants.AddressZero,
				amountOfTokenToSell: parseEther('0'),
				tokenToBuy: buyerToken.address,
				amountOfTokenToBuy: parseEther('10'),
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: 0,
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const approve = await sellerNFT.connect(seller).approve(trustMe.address, 0);
		const tx = await trustMe.connect(seller).addTrade(trade);
		const nftbalance = await sellerNFT.balanceOf(trustMe.address);
		await expect(nftbalance).to.equal(1);
	});
	it('Edge Case: NFT to ETH', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: sellerNFT.address,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: ethers.constants.AddressZero,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: ethers.constants.AddressZero,
				amountOfTokenToSell: parseEther('0'),
				tokenToBuy: ethers.constants.AddressZero,
				amountOfTokenToBuy: parseEther('0'),
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: parseEther('1'),
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const approve = await sellerNFT.connect(seller).approve(trustMe.address, 0);
		const tx = await trustMe.connect(seller).addTrade(trade);
		const nftbalance = await sellerNFT.balanceOf(trustMe.address);
		await expect(nftbalance).to.equal(1);
	});
	it('Edge Case: NFT to NFT', async () => {
		const trade = {
			tradeId: 0,
			seller: ethers.constants.AddressZero,
			buyer: buyer.address,
			nft: {
				addressNFTToSell: sellerNFT.address,
				tokenIdNFTToSell: 0,
				addressNFTToBuy: buyerNFT.address,
				tokenIdNFTToBuy: 0,
			},
			token: {
				tokenToSell: ethers.constants.AddressZero,
				amountOfTokenToSell: parseEther('0'),
				tokenToBuy: ethers.constants.AddressZero,
				amountOfTokenToBuy: parseEther('0'),
			},
			eth: {
				amountOfETHToSell: 0,
				amountOfETHToBuy: 0,
			},
			deadline: 600,
			dateCreated: 0,
			status: 0,
		};
		const approve = await sellerNFT.connect(seller).approve(trustMe.address, 0);
		const tx = await trustMe.connect(seller).addTrade(trade);
		const nftbalance = await sellerNFT.balanceOf(trustMe.address);
		await expect(nftbalance).to.equal(1);
	});
});
