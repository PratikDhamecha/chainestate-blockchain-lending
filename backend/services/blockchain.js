require("dotenv").config();
const { ethers } = require("ethers");

// ── ABIs for LendingCore ──────────────────────────────────────────────────────
const LOAN_ABI = [
  "function loanCounter() view returns (uint256)",
  "function loans(uint256) view returns (address borrower, uint256 principal, uint256 remainingPrincipal, uint256 monthlyInterestRateBP, uint256 emiAmount, uint256 amountFunded, uint256 deadline, uint8 status)",
  "function lenderAmounts(uint256, address) view returns (uint256)",
  "function accumulatedRepayments(uint256) view returns (uint256)",
  "function alreadyClaimed(uint256, address) view returns (uint256)",
  "function createLoan(uint256 _principal, uint256 _monthlyRateBP, uint256 _duration, uint256 _emiAmount) external",
  "function fundLoan(uint256 loanId) external payable",
  "function payEMI(uint256 loanId) external payable",
  "function claimRepayment(uint256 loanId) external",
  "function markDefault(uint256 loanId) external",
  "event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 principal)",
  "event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount)",
  "event LoanActivated(uint256 indexed loanId)",
  "event EMIPaid(uint256 indexed loanId, uint256 totalPaid, uint256 principalReduction, uint256 interestPaid)",
  "event RepaymentClaimed(uint256 indexed loanId, address indexed lender, uint256 amount)",
  "event LoanDefaulted(uint256 indexed loanId)"
];

const PROPERTY_ABI = [
  "function propertyCounter() view returns (uint256)",
  "function totalShares(uint256) view returns (uint256)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function mintProperty(address owner, uint256 shares) external returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const loanContract = new ethers.Contract(process.env.LOAN_CONTRACT_ADDRESS, LOAN_ABI, wallet);
const propertyContract = new ethers.Contract(process.env.PROPERTY_CONTRACT_ADDRESS, PROPERTY_ABI, wallet);

async function getChainLoan(loanId) {
  const raw = await loanContract.loans(loanId);
  const statusMap = ["REQUESTED", "FUNDING", "ACTIVE", "REPAID", "DEFAULTED"];
  return {
    borrower: raw[0],
    principal: raw[1].toString(),
    remainingPrincipal: raw[2].toString(),
    monthlyInterestRateBP: raw[3].toString(),
    emiAmount: raw[4].toString(),
    amountFunded: raw[5].toString(),
    deadline: Number(raw[6]),
    status: statusMap[Number(raw[7])] || "REQUESTED"
  };
}

module.exports = { provider, wallet, loanContract, propertyContract, getChainLoan };
