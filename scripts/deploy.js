const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy PropertyShares
  const PropertyShares = await hre.ethers.getContractFactory("PropertyShares");
  const propertyShares = await PropertyShares.deploy();
  await propertyShares.waitForDeployment();
  const propertyAddress = await propertyShares.getAddress();
  console.log("PropertyShares deployed to:", propertyAddress);

  // 2. Deploy KYCRegistry
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy();
  await kycRegistry.waitForDeployment();
  const kycAddress = await kycRegistry.getAddress();
  console.log("KYCRegistry deployed to:", kycAddress);

  // 3. Deploy LendingCore (Syndicated Multi-Lender Protocol)
  const LendingCore = await hre.ethers.getContractFactory("LendingCore");
  const lendingCore = await LendingCore.deploy();
  await lendingCore.waitForDeployment();
  const lendingCoreAddress = await lendingCore.getAddress();
  console.log("LendingCore deployed to:", lendingCoreAddress);

  console.log("\n── Copy these into your .env files ──────────────────────");
  console.log(`PROPERTY_CONTRACT_ADDRESS=${propertyAddress}`);
  console.log(`KYC_CONTRACT_ADDRESS=${kycAddress}`);
  console.log(`LOAN_CONTRACT_ADDRESS=${lendingCoreAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
