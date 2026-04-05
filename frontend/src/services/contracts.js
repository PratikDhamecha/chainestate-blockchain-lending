import { ethers } from "ethers";

export const LOAN_ABI = [
  "function loanCounter() view returns (uint256)",
  "function loans(uint256) view returns (address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool)",
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
  return new ethers.Contract(
    process.env.REACT_APP_LOAN_CONTRACT_ADDRESS,
    LOAN_ABI,
    signerOrProvider
  );
}

export function getPropertyContract(signerOrProvider) {
  return new ethers.Contract(
    process.env.REACT_APP_PROPERTY_CONTRACT_ADDRESS,
    PROPERTY_ABI,
    signerOrProvider
  );
}

// ── requestLoan ───────────────────────────────────────────────────────────────
export async function txRequestLoan({ propertyId, sharesToLock, principal, interest, emiCount, durationPerEMI }) {
  const signer = await getSigner();
  const loan   = getLoanContract(signer);
  const prop   = getPropertyContract(signer);

  // 1. Approve shares
  const isApproved = await prop.isApprovedForAll(await signer.getAddress(), process.env.REACT_APP_LOAN_CONTRACT_ADDRESS);
  if (!isApproved) {
    const approveTx = await prop.setApprovalForAll(process.env.REACT_APP_LOAN_CONTRACT_ADDRESS, true);
    await approveTx.wait();
  }

  // 2. Request loan
  const tx = await loan.requestLoan(
    propertyId,
    sharesToLock,
    ethers.parseEther(principal),
    ethers.parseEther(interest),
    emiCount,
    durationPerEMI
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── fundLoan ──────────────────────────────────────────────────────────────────
export async function txFundLoan(loanId, principalEth) {
  const signer = await getSigner();
  const loan   = getLoanContract(signer);
  const tx     = await loan.fundLoan(loanId, { value: ethers.parseEther(principalEth) });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── payEMI ────────────────────────────────────────────────────────────────────
export async function txPayEMI(loanId, emiAmountWei) {
  const signer = await getSigner();
  const loan   = getLoanContract(signer);
  const tx     = await loan.payEMI(loanId, { value: emiAmountWei });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── seizeShares ───────────────────────────────────────────────────────────────
export async function txSeizeShares(loanId) {
  const signer = await getSigner();
  const loan   = getLoanContract(signer);
  const tx     = await loan.seizeShares(loanId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ── mintProperty ─────────────────────────────────────────────────────────────
export async function txMintProperty(ownerAddress, shares) {
  const signer = await getSigner();
  const prop   = getPropertyContract(signer);
  const tx     = await prop.mintProperty(ownerAddress, shares);
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
