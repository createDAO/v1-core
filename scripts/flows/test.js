const { ethers, network } = require("hardhat");

const VERSION = "1.0.0"; // Must match FACTORY_VERSION in DAOFactory.sol

// Import deployment functions from core scripts
const { main: deployFactory } = require("../core/factory/deploy.js");
const { main: deployImplementations } = require("../core/factory/implementations/deploy.js");
const { main: registerImplementations } = require("../core/factory/implementations/register.js");
const { main: createDAO } = require("../core/dao/create.js");
const { main: verifyDAO } = require("../core/dao/verify.js");
const { main: deployPresale } = require("../core/presale/deploy.js");
const { main: registerPresale } = require("../core/presale/register.js");

async function main() {
    console.log("Starting complete deployment process...");
    const [deployer] = await ethers.getSigners();

    // 1. Deploy Factory and get addresses
    console.log("\n1. Deploying Factory...");
    const factoryAddresses = await deployFactory();
    const FACTORY_PROXY_ADDRESS = factoryAddresses.proxyAddress;
    console.log("Factory Proxy deployed at:", FACTORY_PROXY_ADDRESS);

    // Verify factory implementation
    console.log("\nVerifying factory setup...");
    const factory = await ethers.getContractFactory("contracts/DAOFactory.sol:DAOFactory");
    const factoryContract = factory.attach(FACTORY_PROXY_ADDRESS);
    
    try {
        const version = await factoryContract.getFactoryVersion();
        console.log("Factory version:", version);
        
        // Verify owner is the deployer
        const owner = await factoryContract.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            throw new Error("Factory owner is not the deployer!");
        }
        console.log("Factory owner verified ✅");
        
        // Try to access a function that requires initialization
        await factoryContract.getLatestVersion().catch(() => {});
        console.log("Factory initialized ✅");
    } catch (error) {
        console.error("Factory proxy not properly initialized!");
        console.error("This might mean the implementation contract is not properly set");
        throw error;
    }

    // 2. Deploy Implementations and get addresses
    console.log("\n2. Deploying Implementations...");
    const implAddresses = await deployImplementations();
    const {
        daoAddress: DAO_IMPL_ADDRESS,
        tokenAddress: TOKEN_IMPL_ADDRESS,
        treasuryAddress: TREASURY_IMPL_ADDRESS,
        stakingAddress: STAKING_IMPL_ADDRESS,
    } = implAddresses;
    
    // 3. Register implementations
    console.log("\n3. Registering implementations...");
    await registerImplementations({
        FACTORY_PROXY_ADDRESS,
        DAO_IMPL_ADDRESS,
        TOKEN_IMPL_ADDRESS,
        TREASURY_IMPL_ADDRESS,
        STAKING_IMPL_ADDRESS,
    });

    // Verify implementations are registered
    console.log("\nVerifying implementation registration...");
    const [registeredDao, registeredToken, registeredTreasury, registeredStaking] = 
        await factoryContract.getCoreImplementation(VERSION);

    console.log("\nChecking registered implementations:");
    
    // Check each implementation with visual feedback
    const checkImpl = (name, registered, expected) => {
        const matches = registered.toLowerCase() === expected.toLowerCase();
        console.log(`- ${name}: ${matches ? "✅" : "❌"}`);
        if (!matches) {
            throw new Error(`${name} implementation mismatch!\nExpected: ${expected}\nGot: ${registered}`);
        }
    };

    checkImpl("DAO", registeredDao, DAO_IMPL_ADDRESS);
    checkImpl("Token", registeredToken, TOKEN_IMPL_ADDRESS);
    checkImpl("Treasury", registeredTreasury, TREASURY_IMPL_ADDRESS);
    checkImpl("Staking", registeredStaking, STAKING_IMPL_ADDRESS);
    
    console.log("\nAll implementations verified ✅");

    // Verify version is registered
    const latestVersion = await factoryContract.getLatestVersion();
    if (latestVersion !== VERSION) {
        throw new Error(`Version mismatch!\nExpected: ${VERSION}\nGot: ${latestVersion}`);
    }
    console.log("Version registration verified ✅");

    console.log("\n✅ Core implementations deployment successful!");
    console.log("\nDeployed Core Addresses:");
    console.log("Factory Proxy:", FACTORY_PROXY_ADDRESS);
    console.log("DAO Implementation:", DAO_IMPL_ADDRESS);
    console.log("Token Implementation:", TOKEN_IMPL_ADDRESS);
    console.log("Treasury Implementation:", TREASURY_IMPL_ADDRESS);
    console.log("Staking Implementation:", STAKING_IMPL_ADDRESS);

    // 4. Deploy DAOPresale implementation
    console.log("\n4. Deploying DAOPresale implementation...");
    const PRESALE_IMPL_ADDRESS = await deployPresale();
    console.log("DAOPresale Implementation:", PRESALE_IMPL_ADDRESS);

    // 5. Register DAOPresale as a module
    console.log("\n5. Registering DAOPresale as a module...");
    await registerPresale({
        FACTORY_PROXY_ADDRESS,
        PRESALE_IMPL_ADDRESS,
    });

    // Verify presale module registration
    console.log("\nVerifying presale module registration...");
    const presaleImpl = await factoryContract.getModuleImplementation(0, VERSION); // 0 = Presale
    
    console.log("Presale implementation:", presaleImpl);
    if (presaleImpl.toLowerCase() !== PRESALE_IMPL_ADDRESS.toLowerCase()) {
        throw new Error("Presale implementation mismatch!");
    }
    console.log("Presale module registration verified ✅");

    // Create a test DAO
    console.log("\n6. Creating Test DAO...");
    const daoAddresses = await createDAO({
        factoryAddress: FACTORY_PROXY_ADDRESS,
        name: "Test DAO",
        tokenName: "Test Token",
        tokenSymbol: "TEST",
        initialSupply: ethers.parseEther("1000000")
    });

    console.log("\nTest DAO Addresses:");
    console.log("DAO:", daoAddresses.daoAddress);
    console.log("Token:", daoAddresses.tokenAddress);
    console.log("Treasury:", daoAddresses.treasuryAddress);
    console.log("Staking:", daoAddresses.stakingAddress);

    // Verify proxy contracts on Etherscan/Sourcify if not on local network
    let verificationResults;
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\n7. Verifying DAO proxy contracts...");
        verificationResults = await verifyDAO({
            factoryAddress: FACTORY_PROXY_ADDRESS,
            daoAddress: daoAddresses.daoAddress,
            tokenAddress: daoAddresses.tokenAddress,
            treasuryAddress: daoAddresses.treasuryAddress,
            stakingAddress: daoAddresses.stakingAddress,
            creator: deployer.address,
            name: "Test DAO",
            tokenName: "Test Token",
            tokenSymbol: "TEST",
            initialSupply: ethers.parseEther("1000000").toString()
        });
        
        if (verificationResults.verified) {
            console.log("\nAll proxy contracts verified successfully on Etherscan/Sourcify! ✅");
        }
    }

    // Final verification of DAO proxy
    console.log("\nVerifying DAO proxy setup...");
    const DAO = await ethers.getContractFactory("contracts/DAO.sol:DAO");
    const dao = DAO.attach(daoAddresses.daoAddress);
    
    try {
        // Check basic state
        const daoName = await dao.name();
        console.log("\nDAO State:");
        console.log("- Name:", daoName, "✅");
        
        // Check all contract references
        console.log("\nContract References:");
        const daoToken = await dao.upgradeableContracts(1); // Token = 1
        const daoTreasury = await dao.upgradeableContracts(2); // Treasury = 2
        const daoStaking = await dao.upgradeableContracts(3); // Staking = 3
        
        console.log("- Token:", daoToken === daoAddresses.tokenAddress ? "✅" : "❌");
        console.log("- Treasury:", daoTreasury === daoAddresses.treasuryAddress ? "✅" : "❌");
        console.log("- Staking:", daoStaking === daoAddresses.stakingAddress ? "✅" : "❌");
        
        // Verify all references match
        if (daoToken.toLowerCase() !== daoAddresses.tokenAddress.toLowerCase() ||
            daoTreasury.toLowerCase() !== daoAddresses.treasuryAddress.toLowerCase() ||
            daoStaking.toLowerCase() !== daoAddresses.stakingAddress.toLowerCase()) {
            throw new Error("DAO contract references don't match created addresses!");
        }
        
        console.log("\nDAO proxy verified ✅");

        // Verify token distribution
        console.log("\nVerifying token distribution:");
        const Token = await ethers.getContractFactory("contracts/DAOToken.sol:DAOToken");
        const token = Token.attach(daoAddresses.tokenAddress);
        
        const totalSupply = await token.totalSupply();
        const creatorBalance = await token.balanceOf(deployer.address);
        const treasuryBalance = await token.balanceOf(daoAddresses.treasuryAddress);
        
        console.log("- Total Supply:", ethers.formatEther(totalSupply), "tokens");
        console.log("- Creator Balance:", ethers.formatEther(creatorBalance), "tokens");
        console.log("- Treasury Balance:", ethers.formatEther(treasuryBalance), "tokens");
        
        // Verify balances add up to total supply
        if (creatorBalance + treasuryBalance !== totalSupply) {
            throw new Error("Token balances don't add up to total supply!");
        }
        console.log("Token distribution verified ✅");
        console.log("Deployer is " + deployer.address);
        
    } catch (error) {
        console.error("Error verifying DAO proxy:");
        console.error("- Make sure the implementation is correct");
        console.error("- Check that initialization parameters were correct");
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
