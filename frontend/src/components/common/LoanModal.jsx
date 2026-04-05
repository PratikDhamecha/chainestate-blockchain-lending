import React, { useState } from "react";
import Badge from "./Badge";
import EMIBar from "./EMIBar";
import { useToast } from "../../context/ToastContext";
import { useWallet } from "../../context/WalletContext";
import { loansApi } from "../../services/api";
import { txFundLoan, txPayEMI, txSeizeShares, shortAddr, fmtEth } from "../../services/contracts";
import { ethers } from "ethers";

export default function LoanModal({ loan, onClose, onRefresh }) {
  const toast  = useToast();
  const wallet = useWallet();
  const [loading, setLoading] = useState(null); // "fund" | "emi" | "seize"

  const isBorrower = wallet.account?.toLowerCase() === loan.borrower?.toLowerCase();
  const isLender   = wallet.account?.toLowerCase() === loan.lender?.toLowerCase();

  const doneStep = { REQUESTED: 1, FUNDED: 2, ACTIVE: 3, CLOSED: 4, DEFAULTED: 2 }[loan.status] || 0;
  const steps    = ["Loan Requested", "Loan Funded", "EMIs in Progress", "Loan Closed / Settled"];

  async function handleFund() {
    try {
      setLoading("fund");
      const principalEth = ethers.formatEther(loan.principal);
      const { txHash } = await txFundLoan(loan.loanId, principalEth);
      await loansApi.fund(loan.loanId, { lender: wallet.account, txHash });
      toast.success(`Loan #${loan.loanId} funded! 🎉`);
      onRefresh(); onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handlePayEMI() {
    try {
      setLoading("emi");
      const { txHash } = await txPayEMI(loan.loanId, loan.emiAmount);
      await loansApi.payEMI(loan.loanId, { txHash });
      toast.success("EMI paid successfully! 💳");
      onRefresh(); onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleSeize() {
    try {
      setLoading("seize");
      const { txHash } = await txSeizeShares(loan.loanId);
      await loansApi.seize(loan.loanId, { txHash });
      toast.success("Shares seized successfully.");
      onRefresh(); onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <div className="modal-title">LOAN #{loan.loanId} — <Badge status={loan.status} /></div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div>
            <div className="detail-row"><span className="detail-key">BORROWER</span><span className="detail-val addr-val">{shortAddr(loan.borrower)}</span></div>
            <div className="detail-row"><span className="detail-key">LENDER</span><span className="detail-val addr-val">{loan.lender ? shortAddr(loan.lender) : "Awaiting…"}</span></div>
            <div className="detail-row"><span className="detail-key">PROPERTY ID</span><span className="detail-val">#{loan.propertyId}</span></div>
            <div className="detail-row"><span className="detail-key">LOCKED SHARES</span><span className="detail-val">{loan.lockedShares}</span></div>
          </div>
          <div>
            <div className="detail-row"><span className="detail-key">PRINCIPAL</span><span className="detail-val">{fmtEth(loan.principal)}</span></div>
            <div className="detail-row"><span className="detail-key">INTEREST</span><span className="detail-val">{fmtEth(loan.interest)}</span></div>
            <div className="detail-row"><span className="detail-key">PER EMI</span><span className="detail-val">{fmtEth(loan.emiAmount)}</span></div>
            <div className="detail-row"><span className="detail-key">NEXT DUE</span>
              <span className="detail-val" style={{ color: loan.status === "DEFAULTED" ? "var(--red)" : "inherit" }}>
                {loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <EMIBar paid={loan.emiPaid} total={loan.emiCount} />
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {loan.status === "REQUESTED" && !isBorrower && (
            <button className="btn btn-primary" onClick={handleFund} disabled={!!loading}>
              {loading === "fund" ? <><span className="spinner"/>Processing…</> : "💰 Fund This Loan"}
            </button>
          )}
          {loan.status === "ACTIVE" && isBorrower && (
            <button className="btn btn-success" onClick={handlePayEMI} disabled={!!loading}>
              {loading === "emi" ? <><span className="spinner"/>Processing…</> : "💳 Pay Next EMI"}
            </button>
          )}
          {loan.status === "DEFAULTED" && isLender && (
            <button className="btn btn-danger" onClick={handleSeize} disabled={!!loading}>
              {loading === "seize" ? <><span className="spinner"/>Processing…</> : "⚡ Seize Shares"}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
