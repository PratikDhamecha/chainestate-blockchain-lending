require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Minting with:", deployer.address);

  const PROPERTY_ADDRESS = process.env.PROPERTY_CONTRACT_ADDRESS;
  console.log("PropertyShares address:", PROPERTY_ADDRESS);

  if (!PROPERTY_ADDRESS || PROPERTY_ADDRESS === "undefined") {
    throw new Error("PROPERTY_CONTRACT_ADDRESS not set in .env file!");
  }

  const propertyShares = await hre.ethers.getContractAt(
    "PropertyShares",
    PROPERTY_ADDRESS
  );

  // ── List Property 1 ──────────────────────────────────────
  console.log("\nListing Property 1...");
  const tx1 = await propertyShares.listProperty(
    "Sunset Apartments",
    "Mumbai, Maharashtra",
    100,
    hre.ethers.parseEther("0.01")
  );
  await tx1.wait();
  console.log("✅ Property 1 listed — 100 shares at 0.01 ETH each");

  // ── List Property 2 ──────────────────────────────────────
  console.log("\nListing Property 2...");
  const tx2 = await propertyShares.listProperty(
    "Green Valley Villas",
    "Pune, Maharashtra",
    50,
    hre.ethers.parseEther("0.01")
  );
  await tx2.wait();
  console.log("✅ Property 2 listed — 50 shares at 0.01 ETH each");

  // ── Check balances ────────────────────────────────────────
  const balance1 = await propertyShares.balanceOf(deployer.address, 1);
  const balance2 = await propertyShares.balanceOf(deployer.address, 2);
  console.log("\n── Deployer Share Balances ──────────────────────");
  console.log(`Property 1 shares: ${balance1.toString()}`);
  console.log(`Property 2 shares: ${balance2.toString()}`);

  const prop1 = await propertyShares.getProperty(1);
  const prop2 = await propertyShares.getProperty(2);
  console.log("\n── Property Details ─────────────────────────────");
  console.log(`Property 1: ${prop1.name} | ${prop1.location} | ${prop1.totalShares} shares`);
  console.log(`Property 2: ${prop2.name} | ${prop2.location} | ${prop2.totalShares} shares`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});