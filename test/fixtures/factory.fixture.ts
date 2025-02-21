import { ethers } from "hardhat";

export async function deployFactoryFixture() {
  const [owner, ...accounts] = await ethers.getSigners();
  
  // Deploy factory implementation
  const factoryImpl = await ethers.deployContract("DAOFactory");
  await factoryImpl.waitForDeployment();
  
  // Deploy & initialize proxy
  const proxy = await ethers.deployContract("DAOFactoryProxy", [
    await factoryImpl.getAddress(),
    factoryImpl.interface.encodeFunctionData("initialize", [owner.address])
  ]);
  await proxy.waitForDeployment();
  
  // Get factory instance at proxy address
  const factory = await ethers.getContractAt("DAOFactory", await proxy.getAddress());
  
  return { factory, factoryImpl, owner, accounts };
}

export async function deployImplementationsFixture() {
  const { factory, owner, accounts } = await deployFactoryFixture();
  
  // Deploy all implementations
  const daoImpl = await ethers.deployContract("DAO");
  const tokenImpl = await ethers.deployContract("DAOToken");
  const treasuryImpl = await ethers.deployContract("DAOTreasury");
  const stakingImpl = await ethers.deployContract("DAOStaking");
  const presaleImpl = await ethers.deployContract("DAOPresale");
  
  // Wait for all deployments
  await Promise.all([
    daoImpl.waitForDeployment(),
    tokenImpl.waitForDeployment(),
    treasuryImpl.waitForDeployment(),
    stakingImpl.waitForDeployment(),
    presaleImpl.waitForDeployment()
  ]);
  
  // Register implementations
  await factory.registerCoreImplementation(
    "1.0.0",
    await daoImpl.getAddress(),
    await tokenImpl.getAddress(),
    await treasuryImpl.getAddress(),
    await stakingImpl.getAddress(),
    "0x" // Empty initialization template
  );
  
  return {
    factory,
    implementations: {
      dao: daoImpl,
      token: tokenImpl,
      treasury: treasuryImpl,
      staking: stakingImpl
    },
    owner,
    accounts
  };
}
