import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { loansApi } from "../services/api";
import { shortAddr, fmtEth } from "../services/contracts";
import { useLoans } from "../hooks/useLoans";
import { useContract } from "../hooks/useContract";
import { ethers } from "ethers";
import Badge from "../components/common/Badge";

export default function LendPage() {
  const wallet = useWallet();
  const toast = useToast();

  const { fundLoan, claimRepayment, markDefault, isTxPending } = useLoans();
  const { useEventListener } = useContract();

  const [tab, setTab] = useState("open");
  const [loans, setLoans] = useState([]);
  const [myLoans, setMy] = useState([]);
  const [loading, setLoad] = useState(true);
  const [actId, setActId] = useState(null);
  const [fundAmounts, setFundAmounts] = useState({});

  const load = useCallback(async () => {
    setLoad(true);
    try {
      // Get REQUESTED and FUNDING loans
      const openReq = await loansApi.getAll({ status: "REQUESTED" });
      const fundReq = await loansApi.getAll({ status: "FUNDING" });
      setLoans([...openReq.data, ...fundReq.data]);

      if (wallet.account) {
        // Find loans where current user is a lender
        const all = await loansApi.getAll();
        // Assuming backend adds a 'lenders' array or similar. For now, filter if needed.
        const mine = all.data.filter(l => l.status !== "REQUESTED"); // Simplified for demo
        setMy(mine);
      }
    } catch { setLoans([]); setMy([]); }
    finally { setLoad(false); }
  }, [wallet.account]);

  useEffect(() => { load(); }, [load]);

  // Event Listeners for real-time UI updates
  useEventListener("LoanFunded", (loanId) => {
    console.log(`Loan #${loanId} was funded! Refreshing data...`);
    load();
  });

  useEventListener("RepaymentClaimed", (loanId) => {
    load();
  });

  useEventListener("LoanDefaulted", (loanId) => {
    load();
  });

  async function handleFund(loan) {
    if (!wallet.account) { toast.error("Connect wallet first"); return; }

    const amt = fundAmounts[loan.loanId];
    if (!amt || isNaN(amt) || parseFloat(amt) <= 0) {
      toast.error("Enter a valid funding amount"); return;
    }

    try {
      setActId(loan.loanId);
      await fundLoan(loan.loanId, amt);
      toast.info("Transaction sent! Waiting for confirmation...");
      // load() is handled by useEventListener now
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActId(null);
    }
  }

  async function handleClaim(loan) {
    if (!wallet.account) { toast.error("Connect wallet first"); return; }
    try {
      setActId(loan.loanId);
      await claimRepayment(loan.loanId);
      toast.info("Claim transaction sent...");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActId(null);
    }
  }

  async function handleDefault(loan) {
    if (!wallet.account) { toast.error("Connect wallet first"); return; }
    try {
      setActId(loan.loanId);
      await markDefault(loan.loanId);
      toast.info("Default transaction sent...");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActId(null);
    }
  }

  return (
    <div className="page-body fade-in">
      <div className="tabs-bar">
        {[["open", "🔓 Loan Marketplace"], ["my", "💼 My Investments"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "open" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {loading && <div className="page-loader"><div className="spinner" />Loading Marketplace…</div>}
          {!loading && loans.length === 0 && <div className="empty-state">No open loan requests right now.</div>}

          {loans.map((l) => {
            const principal = parseFloat(ethers.formatEther(l.principal || "0"));
            const funded = parseFloat(ethers.formatEther(l.amountFunded || "0"));
            const progress = (funded / principal) * 100;
            const remaining = principal - funded;
            const annualRate = l.monthlyInterestRateBP ? (l.monthlyInterestRateBP * 12) / 100 : 0;

            return (
              <div key={l._id} className="card lend-card">
                <div className="lend-card-header">
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--accent)", marginBottom: 4 }}>LOAN #{l.loanId}</div>
                    <span className="cell-addr">{shortAddr(l.borrower)}</span>
                  </div>
                  <Badge status={l.status} />
                </div>

                <div className="lend-card-grid">
                  <div>
                    <div className="form-hint" style={{ marginBottom: 4 }}>TARGET PRINCIPAL</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)" }}>{fmtEth(l.principal)}</div>
                  </div>
                  <div>
                    <div className="form-hint" style={{ marginBottom: 4 }}>EST. APY</div>
                    <div className="cell-mono" style={{ color: "var(--green)", fontSize: 14 }}>
                      {annualRate.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div className="form-hint" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>FUNDING PROGRESS</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="emi-bar-bg">
                      <div className="emi-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="form-hint" style={{ marginTop: 6, textAlign: 'right' }}>
                      {funded.toFixed(2)} / {principal.toFixed(2)} ETH
                    </div>
                  </div>
                </div>

                <div className="lend-action-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <input className="form-input" placeholder={`Amount (Max: ${remaining.toFixed(2)} ETH)`} type="number" step="0.01" max={remaining}
                      value={fundAmounts[l.loanId] || ""} onChange={(e) => setFundAmounts(p => ({ ...p, [l.loanId]: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={() => handleFund(l)} disabled={actId === l.loanId || !wallet.account || progress >= 100}>
                    {actId === l.loanId ? <><span className="spinner" />…</> : "💰 Fund Loan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "my" && (
        <div style={{ display: "grid", gap: 14 }}>
          {loading && <div className="page-loader"><div className="spinner" />Loading Portfolio…</div>}
          {!loading && myLoans.length === 0 && <div className="empty-state">You haven't funded any active loans yet.</div>}

          {myLoans.map((l) => (
            <div key={l._id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--accent)" }}>LOAN #{l.loanId}</span>
                  <Badge status={l.status} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {l.status === "ACTIVE" && new Date() > new Date(l.deadline) && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDefault(l)} disabled={actId === l.loanId}>
                      {actId === l.loanId ? <><span className="spinner" />…</> : "⚠️ Mark Default"}
                    </button>
                  )}
                  {(l.status === "REPAID" || l.status === "ACTIVE") && (
                    <button className="btn btn-success btn-sm" onClick={() => handleClaim(l)} disabled={actId === l.loanId}>
                      {actId === l.loanId ? <><span className="spinner" />…</> : "💸 Claim Dividends"}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                <div><div className="form-hint">BORROWER</div><div className="cell-addr">{shortAddr(l.borrower)}</div></div>
                <div><div className="form-hint">LOAN SIZE</div><div className="cell-mono">{fmtEth(l.principal)}</div></div>
                <div><div className="form-hint">INTEREST RATE</div><div className="cell-mono" style={{ color: "var(--green)" }}>{l.monthlyInterestRateBP ? ((l.monthlyInterestRateBP * 12) / 100).toFixed(2) : 0}% APY</div></div>
                <div><div className="form-hint">DEADLINE</div>
                  <div className="cell-mono" style={{ color: l.status === "DEFAULTED" ? "var(--red)" : undefined }}>
                    {l.deadline ? new Date(l.deadline).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
