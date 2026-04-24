import React, { useState, useEffect } from "react";
import Badge from "./Badge";
import { useToast } from "../../context/ToastContext";
import { useWallet } from "../../context/WalletContext";
import { useLoans } from "../../hooks/useLoans";
import { shortAddr, fmtEth } from "../../services/contracts";
import { ethers } from "ethers";

export default function LoanModal({ loan, onClose, onRefresh }) {
  const toast = useToast();
  const wallet = useWallet();
  const { payEMI, fundLoan, claimRepayment, isTxPending } = useLoans();

  const [payAmount, setPayAmount] = useState("");

  const isBorrower = wallet.account?.toLowerCase() === loan.borrower?.toLowerCase();

  const doneStep = { REQUESTED: 1, FUNDING: 2, ACTIVE: 3, REPAID: 4, DEFAULTED: 2 }[loan.status] || 0;
  const steps = ["Loan Requested", "Syndicated Funding", "EMIs in Progress", "Loan Closed / Settled"];

  useEffect(() => {
    if (loan && loan.emiAmount) {
      try {
        setPayAmount(ethers.formatEther(loan.emiAmount));
      } catch (e) {
        setPayAmount("0");
      }
    }
  }, [loan]);

  async function handleFund() {
    try {
      // Assuming a generic fund of whatever is left for demo purposes in this modal
      const remainingEth = ethers.formatEther(BigInt(loan.principal) - BigInt(loan.amountFunded || 0));
      await fundLoan(loan.loanId, remainingEth);
      toast.success(`Loan #${loan.loanId} funded! 🎉`);
      onRefresh(); onClose();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handlePayEMI() {
    try {
      await payEMI(loan.loanId, payAmount);
      toast.success("EMI / Prepayment successful! 💳");
      onRefresh(); onClose();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const principalStr = loan.principal ? ethers.formatEther(loan.principal) : "0";
  const remainingStr = loan.remainingPrincipal ? ethers.formatEther(loan.remainingPrincipal) : principalStr;
  const progressPercent = Math.min(100, Math.max(0, ((principalStr - remainingStr) / principalStr) * 100));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <div className="modal-title">LOAN #{loan.loanId} — <Badge status={loan.status} /></div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
            <div className="detail-row"><span className="detail-key">BORROWER</span><span className="detail-val addr-val">{shortAddr(loan.borrower)}</span></div>
            <div className="detail-row"><span className="detail-key">PRINCIPAL</span><span className="detail-val">{fmtEth(loan.principal)}</span></div>
            <div className="detail-row"><span className="detail-key">MIN EMI</span><span className="detail-val">{fmtEth(loan.emiAmount)}</span></div>
          </div>
          <div>
            <div className="detail-row"><span className="detail-key">REMAINING PRINCIPAL</span><span className="detail-val" style={{ color: 'var(--red)', fontWeight: 'bold' }}>{fmtEth(loan.remainingPrincipal)}</span></div>
            <div className="detail-row"><span className="detail-key">INTEREST RATE</span><span className="detail-val">{(loan.monthlyInterestRateBP * 12 / 100).toFixed(2)}% APY</span></div>
            <div className="detail-row"><span className="detail-key">AMOUNT FUNDED</span><span className="detail-val">{fmtEth(loan.amountFunded)}</span></div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 6, fontWeight: 600 }}>PRINCIPAL REPAYMENT PROGRESS ({progressPercent.toFixed(1)}%)</div>
          <div className="progress-bar-bg" style={{ height: 12, background: '#e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--success)' }} />
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline" style={{ marginBottom: 24 }}>
          {steps.map((step, i) => (
            <div key={step} className="tl-item">
              <div style={{ position: "relative" }}>
                <div className={`tl-dot ${i < doneStep ? "done" : ""}`} />
                {i < steps.length - 1 && <div className="tl-line" />}
              </div>
              <div>
                <div className={`tl-title ${i >= doneStep ? "pending" : ""}`}>{step}</div>
                <div className="tl-sub">{i < doneStep ? "Completed" : "Pending"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: 'center' }}>
          {(loan.status === "REQUESTED" || loan.status === "FUNDING") && !isBorrower && (
            <button className="btn btn-primary" onClick={handleFund} disabled={isTxPending}>
              {isTxPending ? <><span className="spinner" />Processing…</> : "💰 Fund Remaining"}
            </button>
          )}

          {loan.status === "ACTIVE" && isBorrower && (
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <input
                type="number"
                className="form-input"
                style={{ flex: 1 }}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                step="0.01"
              />
              <button className="btn btn-success" onClick={handlePayEMI} disabled={isTxPending}>
                {isTxPending ? <><span className="spinner" />Processing…</> : "💳 Pay EMI"}
              </button>
            </div>
          )}
          {loan.status === "ACTIVE" && isBorrower && (
            <div className="form-hint" style={{ width: '100%', marginTop: '-5px', color: 'var(--accent)' }}>
              * Paying more than the minimum EMI directly reduces your principal and slashes future tenure!
            </div>
          )}

          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
