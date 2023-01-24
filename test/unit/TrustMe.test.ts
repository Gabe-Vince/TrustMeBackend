import {time, loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import { Contract, Signer } from 'ethers';
import {expect} from 'chai';
import {ethers} from 'hardhat';
import {parseEther} from 'ethers/lib/utils';

describe('Trust Me Smart Contract', () => {
    let trustme: Contract;
    let signer: Signer;

    beforeEach(async () => {
        signer = await ethers.getSigners();
        const Trustme = await  ethers.getContractFactory("TrustMe");
        trustme = await Trustme.deploy();

    });

    })
	async function deployOneYearLockFixture() {
		const [owner, seller, buyer] = await ethers.getSigners();

		const Escrow = await ethers.getContractFactory('Escrow');
		const escrow = await Escrow.deploy();

		const Token1 = await ethers.getContractFactory('Token1');
		const token1 = await Token1.deploy();

		const Token2 = await ethers.getContractFactory('Token2');
		const token2 = await Token2.deploy();

		return {escrow, owner, seller, buyer, token1, token2};
	}

	describe('CreateTrade', function () {
		it('Should Create Trade successfully', async () => {
			const {escrow, seller, buyer, token1, token2} = await loadFixture(deployOneYearLockFixture);
			await token1.transfer(seller.address, parseEther('100000'));
			await token2.transfer(buyer.address, parseEther('100000'));
			// await token1
			//     .connect(seller)
			//     .approve(escrow.address, parseEther("10000"));

			const tx = await escrow.createTrade(
				seller.address,
				buyer.address,
				token1.address,
				token2.address,
				parseEther('100'),
				parseEther('100'),
				300
			);
			const txReceipt = await tx.wait(1);
			const tradeId = txReceipt?.events?.[3]?.args?.tradeId;

			expect(tradeId).to.eq(0);
		});
	});
});
function async(): Mocha.Func {
    throw new Error('Function not implemented.');
}

