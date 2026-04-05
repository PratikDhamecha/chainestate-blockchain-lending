import React, { useState, useEffect } from "react";
import { txApi } from "../services/api";
import { shortAddr } from "../services/contracts";

const EVENT_COLOR = {
  LoanRequested: "var(--yellow)",
  LoanFunded:    "var(--blue)",
  EMIPaid:       "var(--green)",
  SharesSeized:  "var(--red)",
  LoanClosed:    "var(--gray)",
};

export default function TransactionsPage() {
  const [txs,    setTxs]  = useState([]);
  const [loading,setLoad] = useState(true);
  const [filter, setFlt]  = useState("ALL");

  useEffect(() => {
    async function load() {
      setLoad(true);
      try {
        const params = filter !== "ALL" ? { event: filter } : {};
        const res = await txApi.getAll(params);
        setTxs(res.data);
      } catch { setTxs([]); }
      finally { setLoad(false); }
    }
    load();
  }, [filter]);

  return (
    <div className="page-body fade-in">
      {/* Event legend */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 26 }}>
        {Object.entries(EVENT_COLOR).map(([k, c]) => (
          <button
            key={k}
            onClick={() => setFlt(filter === k ? "ALL" : k)}
            className="stat-card"
            style={{ cursor: "pointer", border: filter === k ? `1px solid ${c}` : undefined, padding: "13px 15px", textAlign: "left" }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}`, marginBottom: 7 }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: c }}>{k}</div>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-head tx-cols">
          <span>EVENT</span><span>TX HASH</span><span>FROM → TO</span><span>VALUE</span><span>TIME</span>
        </div>
        {loading && <div className="page-loader"><div className="spinner" />Loading transactions…</div>}
        {!loading && txs.length === 0 && <div className="empty-state">No transactions recorded yet.</div>}
        {txs.map((tx, i) => (
          <div key={i} className="table-row tx-cols">
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              color: EVENT_COLOR[tx.event] || "var(--text-body)"
            }}>{tx.event}</span>
            <span className="tx-hash-link">{shortAddr(tx.txHash)}</span>
            <span className="cell-addr">{shortAddr(tx.from)} → {shortAddr(tx.to)}</span>
            <span className="cell-mono">{tx.value}</span>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                {tx.blockNumber ? `#${tx.blockNumber}` : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                {new Date(tx.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
