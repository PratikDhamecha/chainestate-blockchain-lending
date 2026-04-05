import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { propertiesApi } from "../services/api";
import { txMintProperty, shortAddr } from "../services/contracts";

export default function PropertiesPage() {
  const wallet = useWallet();
  const toast  = useToast();
  const [props, setProps]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [minting, setMint]  = useState(false);
  const [form, setForm]     = useState({ owner: "", shares: "", name: "", location: "" });

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { loadProps(); }, []);

  async function loadProps() {
    setLoad(true);
    try {
      const res = await propertiesApi.getAll();
      setProps(res.data);
    } catch { setProps([]); }
    finally { setLoad(false); }
  }

  async function handleMint() {
    if (!form.owner || !form.shares) { toast.error("Owner and shares are required"); return; }
    if (!wallet.account)             { toast.error("Connect wallet first"); return; }
    try {
      setMint(true);
      const { txHash } = await txMintProperty(form.owner, parseInt(form.shares));
      await propertiesApi.create({
        owner:    form.owner,
        shares:   parseInt(form.shares),
        txHash,
        metadata: { name: form.name, location: form.location },
      });
      toast.success(`Property minted! ${form.shares} shares → ${shortAddr(form.owner)}`);
      setForm({ owner: "", shares: "", name: "", location: "" });
      loadProps();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setMint(false);
    }
  }

  return (
    <div className="page-body fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.65fr", gap: 24 }}>

        {/* Mint form */}
        <div className="card">
          <div className="card-title">MINT PROPERTY SHARES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">OWNER ADDRESS *</label>
              <input className="form-input" placeholder="0x…" value={form.owner} onChange={(e) => setF("owner", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">NUMBER OF SHARES *</label>
              <input className="form-input" placeholder="e.g. 100" type="number" value={form.shares} onChange={(e) => setF("shares", e.target.value)} />
              <span className="form-hint">100 shares = 100% ownership. Must divide evenly by EMI count later.</span>
            </div>
            <div className="form-group">
              <label className="form-label">PROPERTY NAME</label>
              <input className="form-input" placeholder="e.g. Sunrise Villa" value={form.name} onChange={(e) => setF("name", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">LOCATION</label>
              <input className="form-input" placeholder="e.g. Mumbai, India" value={form.location} onChange={(e) => setF("location", e.target.value)} />
            </div>
            <div style={{ marginTop: 4 }}>
              <button className="btn btn-primary btn-lg" onClick={handleMint} disabled={minting || !wallet.account}>
                {minting ? <><span className="spinner" />Minting…</> : "🏛️ Mint Property"}
              </button>
              {!wallet.account && <p className="form-hint" style={{ marginTop: 8 }}>Connect wallet to mint.</p>}
            </div>
          </div>
        </div>

        {/* Property list */}
        <div className="card">
          <div className="card-title">TOKENIZED PROPERTIES (ERC-1155)</div>
          {loading && <div className="page-loader"><div className="spinner" />Loading…</div>}
          {!loading && props.length === 0 && <div className="empty-state">No properties minted yet.</div>}
          {props.map((p) => {
            const pct = p.totalShares > 0 ? (p.lockedShares / p.totalShares) * 100 : 0;
            return (
              <div key={p._id} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--accent)" }}>
                      Property #{p.propertyId}
                    </span>
                    {p.metadata?.name && (
                      <span style={{ marginLeft: 10, fontSize: 13, color: "var(--text-body)" }}>{p.metadata.name}</span>
                    )}
                    {p.metadata?.location && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>· {p.metadata.location}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{p.totalShares - p.lockedShares}/{p.totalShares} free</span>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span className="cell-addr">{shortAddr(p.owner)}</span>
                </div>
                <div className="emi-bar-bg">
                  <div className="emi-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100
                        ? "linear-gradient(90deg,#ef4444,#f87171)"
                        : undefined,
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span className="form-hint">AS COLLATERAL</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)" }}>{p.lockedShares} shares locked</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
