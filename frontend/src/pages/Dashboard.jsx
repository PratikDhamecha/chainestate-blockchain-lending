import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/common/Badge";
import { loansApi, txApi } from "../services/api";
import { shortAddr, fmtEth } from "../services/contracts";

const EVENT_COLOR = {
  LoanRequested: "var(--yellow)",
  LoanFunded:    "var(--blue)",
  EMIPaid:       "var(--green)",
  SharesSeized:  "var(--red)",
  LoanClosed:    "var(--gray)",
};

export default function Dashboard() {
  const nav = useNavigate();
  const [stats,  setStats]  = useState(null);
  const [loans,  setLoans]  = useState([]);
  const [txs,    setTxs]    = useState([]);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, l, t] = await Promise.all([
          loansApi.getStats(),
          loansApi.getAll(),
          txApi.getAll(),
        ]);
        setStats(s.data);
        setLoans(l.data.slice(0, 5));
        setTxs(t.data.slice(0, 6));
      } catch {
        // If backend not running, use placeholders
        setStats({ tvlEth: "0.0", active: 0, total: 0, defaulted: 0 });
        setLoans([]);
        setTxs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { icon: "🔒", label: "TOTAL VALUE LOCKED", value: stats ? `${parseFloat(stats.tvlEth).toFixed(2)} ETH` : "—", sub: "Active + Funded loans" },
    { icon: "📋", label: "ACTIVE LOANS",       value: stats?.active   ?? "—", sub: "Funded & in repayment" },
    { icon: "⏳", label: "OPEN REQUESTS",      value: stats?.requested ?? "—", sub: "Awaiting lenders" },
    { icon: "🛡️", label: "DEFAULT RATE",       value: stats?.total > 0 ? `${((stats.defaulted / stats.total) * 100).toFixed(1)}%` : "0%", sub: "Across all loans" },
  ];

  return (
    <div className="page-body fade-in">
      {/* Stat cards */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{loading ? "…" : s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent loans */}
      <div className="section-header">
        <span className="section-title">RECENT LOANS</span>
        <div className="section-line" />
        <button className="btn btn-outline btn-sm" onClick={() => nav("/loans")}>View All →</button>
      </div>

      <div className="table-wrap" style={{ marginBottom: 28 }}>
        <div className="table-head loans-cols">
          <span>ID</span><span>BORROWER</span><span>PROPERTY</span>
          <span>PRINCIPAL</span><span>EMIs</span><span>STATUS</span>
          <span>DUE DATE</span><span>ACTION</span>
        </div>
        {loading && <div className="page-loader"><div className="spinner" />Loading…</div>}
        {!loading && loans.length === 0 && <div className="empty-state">No loans yet. Be the first to request one!</div>}
        {loans.map((l) => (
          <div key={l._id} className="table-row loans-cols">
            <span className="cell-id">#{l.loanId}</span>
            <span className="cell-addr">{shortAddr(l.borrower)}</span>
            <span className="cell-mono">Prop #{l.propertyId}</span>
            <span className="cell-mono">{fmtEth(l.principal)}</span>
            <span className="cell-mono">{l.emiPaid}/{l.emiCount}</span>
            <Badge status={l.status} />
            <span className={l.status === "DEFAULTED" ? "cell-due-miss" : "cell-mono"}>
              {l.nextDueDate ? new Date(l.nextDueDate).toLocaleDateString() : "N/A"}
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => nav("/loans")}>View</button>
          </div>
        ))}
      </div>

      {/* Live events */}
      <div className="section-header">
        <span className="section-title">LIVE BLOCKCHAIN EVENTS</span>
        <div className="section-line" />
      </div>
      <div className="table-wrap">
        <div className="table-head tx-cols">
          <span>EVENT</span><span>TX HASH</span><span>FROM</span><span>VALUE</span><span>TIME</span>
        </div>
        {!loading && txs.length === 0 && <div className="empty-state">No transactions recorded yet.</div>}
        {txs.map((tx, i) => (
          <div key={i} className="table-row tx-cols">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: EVENT_COLOR[tx.event] }}>{tx.event}</span>
            <span className="tx-hash-link">{shortAddr(tx.txHash)}</span>
            <span className="cell-addr">{shortAddr(tx.from)}</span>
            <span className="cell-mono">{tx.value}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(tx.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
