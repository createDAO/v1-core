import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployDAOFixture } from "../../fixtures/dao.fixture";
import { Contract } from "ethers";

describe("DAO Proxies", function () {
    describe("Initialization", function () {
        it("Should initialize with correct implementation and allow proxy functions", async function () {
            const { dao, token, treasury, staking } = await loadFixture(deployDAOFixture);
            
            // Get the DAOProxy contract factory to attach its interface
            const DAOProxy = await ethers.getContractFactory("DAOProxy");
            
            // Attach proxy interface to get access to proxy-specific functions
            const daoAsProxy = DAOProxy.attach(await dao.getAddress());
            const tokenAsProxy = DAOProxy.attach(await token.getAddress());
            const treasuryAsProxy = DAOProxy.attach(await treasury.getAddress());
            const stakingAsProxy = DAOProxy.attach(await staking.getAddress());

            // Test implementation() function
            expect(await daoAsProxy.implementation()).to.not.equal(ethers.ZeroAddress);
            expect(await tokenAsProxy.implementation()).to.not.equal(ethers.ZeroAddress);
            expect(await treasuryAsProxy.implementation()).to.not.equal(ethers.ZeroAddress);
            expect(await stakingAsProxy.implementation()).to.not.equal(ethers.ZeroAddress);

            // Verify contracts are properly initialized
            expect(await dao.version()).to.equal("1.0.0");
            expect(await token.version()).to.equal("1.0.0");
            expect(await treasury.version()).to.equal("1.0.0");
            expect(await staking.version()).to.equal("1.0.0");
        });

        it("Should fail with invalid implementation address", async function () {
            const [owner] = await ethers.getSigners();
            const DAOProxy = await ethers.getContractFactory("DAOProxy");
            
            // Try to deploy proxy with zero address implementation
            await expect(
                DAOProxy.deploy(ethers.ZeroAddress, "0x")
            ).to.be.revertedWithCustomError(DAOProxy, "ERC1967InvalidImplementation");
        });
    });

    describe("Delegation", function () {
        it("Should properly delegate calls to implementation", async function () {
            const { dao, token, accounts } = await loadFixture(deployDAOFixture);
            const [owner] = accounts;

            // Test delegation by calling a function that modifies state
            const newName = "New DAO Name";
            await expect(dao.initialize(
                newName,
                await dao.getAddress(),
                await dao.getAddress(),
                await token.getAddress(),
                owner.address
            )).to.be.revertedWithCustomError(dao, "InvalidInitialization");
        });

        it("Should handle payable functions correctly", async function () {
            const { dao } = await loadFixture(deployDAOFixture);
            const [sender] = await ethers.getSigners();
            
            // Try to send ETH to proxy
            const tx = {
                to: await dao.getAddress(),
                value: ethers.parseEther("1")
            };
            
            // Should revert since implementation doesn't accept ETH
            await expect(
                sender.sendTransaction(tx)
            ).to.be.reverted;
        });

        it("Should handle fallback function calls", async function () {
            const { dao } = await loadFixture(deployDAOFixture);
            const [sender] = await ethers.getSigners();

            // Call non-existent function to trigger fallback
            const tx = {
                to: await dao.getAddress(),
                data: "0x1234567890"
            };

            await expect(
                sender.sendTransaction(tx)
            ).to.be.reverted; // Should revert since implementation doesn't have this function
        });
    });

    describe("Security", function () {
        it("Should prevent unauthorized upgrades", async function () {
            const { dao, accounts } = await loadFixture(deployDAOFixture);
            const [, unauthorized] = accounts;

            // Try to call upgradeTo directly (should fail)
            await expect(
                unauthorized.sendTransaction({
                    to: await dao.getAddress(),
                    data: "0x3659cfe6" // upgradeTo(address) function selector
                })
            ).to.be.reverted;
        });

        it("Should prevent initialization after construction", async function () {
            const { dao, token, accounts } = await loadFixture(deployDAOFixture);
            const [owner] = accounts;

            // Try to initialize again
            await expect(
                dao.initialize(
                    "New DAO",
                    await dao.getAddress(),
                    await dao.getAddress(),
                    await token.getAddress(),
                    owner.address
                )
            ).to.be.revertedWithCustomError(dao, "InvalidInitialization");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero-length calldata", async function () {
            const { dao } = await loadFixture(deployDAOFixture);
            const [sender] = await ethers.getSigners();

            // Send transaction with empty calldata (should revert since receive/fallback not implemented)
            const tx = {
                to: await dao.getAddress(),
                data: "0x"
            };

            await expect(
                sender.sendTransaction(tx)
            ).to.be.reverted;
        });

        it("Should handle revert messages from implementation", async function () {
            const { dao } = await loadFixture(deployDAOFixture);

            // Call a function that should revert in implementation
            await expect(
                dao.proposeTransfer(ethers.ZeroAddress, ethers.ZeroAddress, 0)
            ).to.be.revertedWith("Zero recipient");
        });
    });
});
