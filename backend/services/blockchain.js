require("dotenv").config();
const { ethers } = require("ethers");

// ── ABIs (paste full ABIs from artifacts after compilation) ───────────────────
const LOAN_ABI = [
  "function loanCounter() view returns (uint256)",
  "function loans(uint256) view returns (address borrower, address lender, uint256 propertyId, uint256 lockedShares, uint256 principal, uint256 interest, uint256 emiCount, uint256 emiPaid, uint256 emiAmount, uint256 sharesPerEMI, uint256 nextDueDate, uint256 durationPerEMI, bool funded, bool closed)",
  "function requestLoan(uint256 propertyId, uint256 sharesToLock, uint256 principal, uint256 interest, uint256 emiCount, uint256 durationPerEMI) external",
  "function fundLoan(uint256 loanId) external payable",
  "function payEMI(uint256 loanId) external payable",
  "function seizeShares(uint256 loanId) external",
  "event LoanRequested(uint256 indexed loanId, address indexed borrower)",
  "event LoanFunded(uint256 indexed loanId, address indexed lender)",
  "event EMIPaid(uint256 indexed loanId)",
  "event SharesSeized(uint256 indexed loanId, uint256 shares)",
  "event LoanClosed(uint256 indexed loanId)",
];

const PROPERTY_ABI = [
  "function propertyCounter() view returns (uint256)",
  "function totalShares(uint256) view returns (uint256)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function mintProperty(address owner, uint256 shares) external returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
];

// ── Provider setup ────────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);


// ── Contract instances ────────────────────────────────────────────────────────
const loanContract = new ethers.Contract(
  process.env.LOAN_CONTRACT_ADDRESS,
  LOAN_ABI,
  wallet
);

const propertyContract = new ethers.Contract(
  process.env.PROPERTY_CONTRACT_ADDRESS,
  PROPERTY_ABI,
  wallet
);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getChainLoan(loanId) {
  const raw = await loanContract.loans(loanId);
  return {
    borrower:       raw[0],
    lender:         raw[1],
    propertyId:     Number(raw[2]),
    lockedShares:   Number(raw[3]),
    principal:      raw[4].toString(),
    interest:       raw[5].toString(),
    emiCount:       Number(raw[6]),
    emiPaid:        Number(raw[7]),
    emiAmount:      raw[8].toString(),
    sharesPerEMI:   Number(raw[9]),
    nextDueDate:    Number(raw[10]),
    durationPerEMI: Number(raw[11]),
    funded:         raw[12],
    closed:         raw[13],
  };
}

module.exports = { provider, wallet, loanContract, propertyContract, getChainLoan };
