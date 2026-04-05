import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast }  from "../context/ToastContext";
import { loansApi }  from "../services/api";
import { txFundLoan, txSeizeShares, shortAddr, fmtEth } from "../services/contracts";
import { ethers } from "ethers";
import Badge from "../components/common/Badge";
import EMIBar from "../components/common/EMIBar";

export default function LendPage() {
  const wallet  = useWallet();
  const toast   = useToast();
  const [tab, setTab]     = useState("open");
  const [loans, setLoans] = useState([]);
  const [myLoans, setMy]  = useState([]);
  const [loading, setLoad]= useState(true);
  const [actId, setActId] = useState(null);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const open = await loansApi.getAll({ status: "REQUESTED" });
      setLoans(open.data);
      if (wallet.account) {
        const mine = await loansApi.getAll({ lender: wallet.account });
        setMy(mine.data);
      }
    } catch { setLoans([]); setMy([]); }
    finally { setLoad(false); }
  }, [wallet.account]);

  useEffect(() => { load(); }, [load]);

  async function handleFund(loan) {
    if (!wallet.account) { toast.error("Connect wallet first"); return; }
    try {
      setActId(loan.loanId);
      const principalEth = ethers.formatEther(loan.principal);
      const { txHash } = await txFundLoan(loan.loanId, principalEth);
      await loansApi.fund(loan.loanId, { lender: wallet.account, txHash });
      toast.success(`Loan #${loan.loanId} funded! ETH sent to borrower. 🎉`);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActId(null);
    }
  }

  async function handleSeize(loan) {
    if (!wallet.account) { toast.error("Connect wallet first"); return; }
    try {
      setActId(loan.loanId);
      const { txHash } = await txSeizeShares(loan.loanId);
      await loansApi.seize(loan.loanId, { txHash });
      toast.success("Shares seized successfully.");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActId(null);
    }
  }

  return (
    <div className="page-body fade-in">
      <div className="tabs-bar">
        {[["open","🔓 Open Requests"], ["my","💼 My Funded Loans"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "open" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {loading && <div className="page-loader"><div className="spinner" />Loading…</div>}
          {!loading && loans.length === 0 && <div className="empty-state">No open loan requests right now.</div>}
          {loans.map((l) => (
            <div key={l._id} className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", alignItems: "center", gap: 20, padding: "20px 24px" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--accent)", marginBottom: 4 }}>LOAN #{l.loanId}</div>
                <span className="cell-addr">{shortAddr(l.borrower)}</span>
              </div>
              <div>
                <div className="form-hint" style={{ marginBottom: 4 }}>COLLATERAL</div>
                <div className="cell-mono">Prop #{l.propertyId} · {l.lockedShares} shares</div>
              </div>
              <div>
                <div className="form-hint" style={{ marginBottom: 4 }}>YOU SEND</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-primary)" }}>{fmtEth(l.principal)}</div>
              </div>
              <div>
                <div className="form-hint" style={{ marginBottom: 4 }}>YOU EARN ({l.emiCount} EMIs)</div>
                <div className="cell-mono" style={{ color: "var(--green)" }}>{fmtEth(l.principal)} + {fmtEth(l.interest)}</div>
              </div>
              <button className="btn btn-primary" onClick={() => handleFund(l)} disabled={actId === l.loanId || !wallet.account}>
                {actId === l.loanId ? <><span className="spinner" />…</> : "💰 Fund"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "my" && (
        <div>
          {loading && <div className="page-loader"><div className="spinner" />Loading…</div>}
          {!loading && myLoans.length === 0 && <div className="empty-state">You haven't funded any loans yet.</div>}
          {myLoans.map((l) => (
            <div key={l._id} className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--accent)" }}>LOAN #{l.loanId}</span>
                  <Badge status={l.status} />
                </div>
                {l.status === "DEFAULTED" && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleSeize(l)} disabled={actId === l.loanId}>
                    {actId === l.loanId ? <><span className="spinner"/>…</> : "⚡ Seize Shares"}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 14 }}>
                <div><div className="form-hint">BORROWER</div><div className="cell-addr">{shortAddr(l.borrower)}</div></div>
                <div><div className="form-hint">PRINCIPAL</div><div className="cell-mono">{fmtEth(l.principal)}</div></div>
                <div><div className="form-hint">INTEREST</div><div className="cell-mono" style={{ color: "var(--green)" }}>{fmtEth(l.interest)}</div></div>
                <div><div className="form-hint">NEXT DUE</div>
                  <div className="cell-mono" style={{ color: l.status === "DEFAULTED" ? "var(--red)" : undefined }}>
                    {l.nextDueDate ? new Date(l.nextDueDate).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              </div>
              <EMIBar paid={l.emiPaid} total={l.emiCount} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
