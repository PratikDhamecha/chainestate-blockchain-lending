import React, { useState, useEffect, useCallback } from "react";
import Badge from "../components/common/Badge";
import LoanModal from "../components/common/LoanModal";
import { loansApi } from "../services/api";
import { shortAddr, fmtEth } from "../services/contracts";

const FILTERS = ["ALL", "REQUESTED", "ACTIVE", "FUNDED", "CLOSED", "DEFAULTED"];

export default function LoansPage() {
  const [filter, setFilter] = useState("ALL");
  const [loans, setLoans] = useState([]);
  const [loading, setLoad] = useState(true);
  const [sel, setSel] = useState(null);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const params = filter !== "ALL" ? { status: filter } : {};
      const res = await loansApi.getAll(params);
      setLoans(res.data);
    } catch { setLoans([]); }
    finally { setLoad(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-body fade-in">
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter(f)}
          >{f}</button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-head loans-cols">
          <span>ID</span><span>BORROWER</span><span>LENDER</span>
          <span>PRINCIPAL</span><span>REMAINING</span><span>STATUS</span>
          <span>NEXT DUE</span><span>INSPECT</span>
        </div>
        {loading && <div className="page-loader"><div className="spinner" />Loading loans…</div>}
        {!loading && loans.length === 0 && (
          <div className="empty-state">No loans found{filter !== "ALL" ? ` with status "${filter}"` : ""}.</div>
        )}
        {loans.map((l) => (
          <div key={l._id} className="table-row loans-cols" onClick={() => setSel(l)}>
            <span className="cell-id">#{l.loanId}</span>
            <span className="cell-addr">{shortAddr(l.borrower)}</span>
            <span className="cell-addr">{l.lender ? shortAddr(l.lender) : <span style={{ color: "var(--yellow)" }}>Awaiting…</span>}</span>
            <span className="cell-mono">{fmtEth(l.principal)}</span>
            <span className="cell-mono" style={{ color: "var(--red)" }}>{fmtEth(l.remainingPrincipal || l.principal)}</span>
            <Badge status={l.status} />
            <span className={l.status === "DEFAULTED" ? "cell-due-miss" : "cell-mono"}>
              {l.deadline ? new Date(l.deadline).toLocaleDateString() : "N/A"}
            </span>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setSel(l); }}>
              Inspect
            </button>
          </div>
        ))}
      </div>

      {sel && <LoanModal loan={sel} onClose={() => setSel(null)} onRefresh={load} />}
    </div>
  );
}
