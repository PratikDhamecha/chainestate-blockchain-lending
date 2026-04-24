import { ethers } from "ethers";

export const LOAN_ABI = [
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

export const PROPERTY_ABI = [
  "function propertyCounter() view returns (uint256)",
  "function totalShares(uint256) view returns (uint256)",
  "function balanceOf(address, uint256) view returns (uint256)",
  "function mintProperty(address owner, uint256 shares) external returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
];

// --- Get signer from MetaMask ----------
export async function getSigner() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

// ── Contract instances -------
export function getLoanContract(signerOrProvider) {
  const address = process.env.REACT_APP_LOAN_CONTRACT_ADDRESS;
  if (!address) throw new Error("REACT_APP_LOAN_CONTRACT_ADDRESS is missing");
  return new ethers.Contract(
    address,
    LOAN_ABI,
    signerOrProvider
  );
}

export function getPropertyContract(signerOrProvider) {
  const address = process.env.REACT_APP_PROPERTY_CONTRACT_ADDRESS;
  if (!address) throw new Error("REACT_APP_PROPERTY_CONTRACT_ADDRESS is missing");
  return new ethers.Contract(
    address,
    PROPERTY_ABI,
    signerOrProvider
  );
}

// ── createLoan ───────────────────────────────────────────────────────────────
export async function txCreateLoan({ principal, monthlyRateBP, duration, emiAmount }) {
  const signer = await getSigner();
  const loan = getLoanContract(signer);

  // Request loan in LendingCore
  const tx = await loan.createLoan(
    ethers.parseEther(principal.toString()),
    monthlyRateBP,
    duration,
    ethers.parseEther(emiAmount.toString())
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── fundLoan ──────────────────────────────────────────────────────────────────
export async function txFundLoan(loanId, contributionEth) {
  const signer = await getSigner();
  const loan = getLoanContract(signer);
  const tx = await loan.fundLoan(loanId, { value: ethers.parseEther(contributionEth) });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── payEMI ────────────────────────────────────────────────────────────────────
export async function txPayEMI(loanId, paymentEth) {
  const signer = await getSigner();
  const loan = getLoanContract(signer);
  const tx = await loan.payEMI(loanId, { value: ethers.parseEther(paymentEth.toString()) });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── claimRepayment ───────────────────────────────────────────────────────────────
export async function txClaimRepayment(loanId) {
  const signer = await getSigner();
  const loan = getLoanContract(signer);
  const tx = await loan.claimRepayment(loanId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── markDefault ───────────────────────────────────────────────────────────────
export async function txMarkDefault(loanId) {
  const signer = await getSigner();
  const loan = getLoanContract(signer);
  const tx = await loan.markDefault(loanId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── mintProperty ─────────────────────────────────────────────────────────────
export async function txMintProperty(ownerAddress, shares) {
  const signer = await getSigner();
  const prop = getPropertyContract(signer);
  const tx = await prop.mintProperty(ownerAddress, shares);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── helpers ───────────────────────────────────────────────────────────────────
export function fmtEth(wei) {
  try { return parseFloat(ethers.formatEther(wei)).toFixed(4) + " ETH"; }
  catch { return "—"; }
}

export function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
