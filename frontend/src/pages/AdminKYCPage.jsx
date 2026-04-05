import React, { useState, useEffect, useCallback } from "react";
import { kycApi } from "../services/api";
import { useToast } from "../context/ToastContext";
import { shortAddr } from "../services/contracts";

export default function AdminKYCPage() {
  const toast = useToast();
  const [list,    setList]    = useState([]);
  const [loading, setLoad]    = useState(true);
  const [acting,  setActing]  = useState(null);
  const [preview, setPreview] = useState(null); // { type, url }

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const res = await kycApi.getPending();
      setList(res.data);
    } catch { setList([]); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(wallet) {
    try {
      setActing(wallet + "_approve");
      await kycApi.approve(wallet);
      toast.success(`KYC approved for ${shortAddr(wallet)} ✅`);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setActing(null); }
  }

  async function handleReject(wallet) {
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    try {
      setActing(wallet + "_reject");
      await kycApi.reject(wallet, reason);
      toast.info(`KYC rejected for ${shortAddr(wallet)}`);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setActing(null); }
  }

  const API_BASE = process.env.REACT_APP_API_BASE?.replace("/api", "") || "http://localhost:5000";

  return (
    <div className="page-body fade-in">
      <div className="section-header">
        <span className="section-title">PENDING KYC REVIEWS</span>
        <div className="section-line" />
        <button className="btn btn-outline btn-sm" onClick={load}>↺ Refresh</button>
      </div>

      {loading && <div className="page-loader"><div className="spinner" />Loading submissions…</div>}
      {!loading && list.length === 0 && <div className="empty-state">No pending KYC submissions. 🎉</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {list.map((kyc) => (
          <div key={kyc._id} className="card" style={{ padding: "22px 26px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 20, alignItems: "center" }}>

              {/* Identity */}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--accent)", marginBottom: 6 }}>
                  APPLICANT
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{kyc.fullName}</div>
                <div className="cell-addr">{shortAddr(kyc.walletAddress)}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                  Submitted: {new Date(kyc.createdAt).toLocaleString()}
                </div>
              </div>

              {/* ID Details */}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--accent)", marginBottom: 6 }}>ID INFO</div>
                <div className="detail-row" style={{ padding: "4px 0" }}>
                  <span className="detail-key">AADHAAR</span>
                  <span className="detail-val">XXXX-XXXX-{kyc.aadhaarNumber?.slice(-4) || "?????"}</span>
                </div>
                {kyc.panNumber && (
                  <div className="detail-row" style={{ padding: "4px 0" }}>
                    <span className="detail-key">PAN</span>
                    <span className="detail-val">{kyc.panNumber}</span>
                  </div>
                )}
              </div>

              {/* Document previews */}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--accent)", marginBottom: 6 }}>DOCUMENTS</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {kyc.aadhaarImagePath && (
                    <div
                      onClick={() => setPreview({ type: "Aadhaar Card", url: `${API_BASE}/${kyc.aadhaarImagePath.replace(/\\/g,"/")}` })}
                      style={{
                        width: 56, height: 40, borderRadius: 6,
                        background: "var(--bg-elevated)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontSize: 20, transition: "border-color 0.2s",
                      }}
                      title="View Aadhaar"
                    >🪪</div>
                  )}
                  {kyc.selfiePath && (
                    <div
                      onClick={() => setPreview({ type: "Selfie", url: `${API_BASE}/${kyc.selfiePath.replace(/\\/g,"/")}` })}
                      style={{
                        width: 56, height: 40, borderRadius: 6,
                        background: "var(--bg-elevated)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontSize: 20, transition: "border-color 0.2s",
                      }}
                      title="View Selfie"
                    >🤳</div>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", marginTop: 5 }}>
                  Click to preview
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleApprove(kyc.walletAddress)}
                  disabled={!!acting}
                >
                  {acting === kyc.walletAddress + "_approve" ? <><span className="spinner"/>…</> : "✅ Approve"}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleReject(kyc.walletAddress)}
                  disabled={!!acting}
                >
                  {acting === kyc.walletAddress + "_reject" ? <><span className="spinner"/>…</> : "✕ Reject"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image preview modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <button className="modal-close-btn" onClick={() => setPreview(null)}>✕</button>
            <div className="modal-title">{preview.type}</div>
            <img
              src={preview.url}
              alt={preview.type}
              style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
