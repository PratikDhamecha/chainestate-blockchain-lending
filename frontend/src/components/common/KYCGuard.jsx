import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { kycApi }    from "../../services/api";

/**
 * KYCGuard
 * Wraps any page that requires KYC verification.
 * If wallet not verified → shows a blocking overlay with CTA to KYC page.
 */
export default function KYCGuard({ children }) {
  const wallet  = useWallet();
  const nav     = useNavigate();
  const [status,  setStatus]  = useState("LOADING"); // LOADING | VERIFIED | NOT_VERIFIED

  useEffect(() => {
    if (!wallet.account) { setStatus("NOT_VERIFIED"); return; }
    kycApi.getStatus(wallet.account)
      .then(res => {
        setStatus(res.data?.status === "VERIFIED" ? "VERIFIED" : res.data?.status || "NOT_SUBMITTED");
      })
      .catch(() => setStatus("NOT_SUBMITTED"));
  }, [wallet.account]);

  if (status === "LOADING") {
    return <div className="page-loader"><div className="spinner" />Checking KYC status…</div>;
  }

  if (status === "VERIFIED") return <>{children}</>;

  // Not verified — show blocking wall
  const messages = {
    NOT_SUBMITTED: { icon: "🔐", title: "KYC REQUIRED",      sub: "You must complete identity verification before requesting a collateral loan.",   btn: "Submit KYC Now" },
    PENDING:       { icon: "⏳", title: "KYC UNDER REVIEW",  sub: "Your KYC documents are being reviewed. You'll be able to borrow once approved.", btn: "View KYC Status" },
    REJECTED:      { icon: "✕",  title: "KYC REJECTED",      sub: "Your KYC was rejected. Please re-submit with correct documents.",                btn: "Re-submit KYC"  },
  };

  const m = messages[status] || messages.NOT_SUBMITTED;

  return (
    <div className="page-body fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="card" style={{ maxWidth: 480, textAlign: "center", padding: "48px 40px" }}>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: status === "PENDING" ? "rgba(234,179,8,0.12)" : status === "REJECTED" ? "rgba(239,68,68,0.12)" : "rgba(0,200,255,0.1)",
          border: `2px solid ${status === "PENDING" ? "var(--yellow)" : status === "REJECTED" ? "var(--red)" : "var(--accent)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, margin: "0 auto 20px",
        }}>
          {m.icon}
        </div>

        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2.5, color: "var(--text-primary)", marginBottom: 14 }}>
          {m.title}
        </div>

        <div style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.75, marginBottom: 28 }}>
          {m.sub}
        </div>

        {/* KYC steps preview */}
        {status === "NOT_SUBMITTED" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 28 }}>
            {["Name + Aadhaar", "Photo ID", "Selfie"].map((step, i) => (
              <div key={step} style={{ textAlign: "center" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--accent-dim)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontSize: 12, color: "var(--accent)",
                  margin: "0 auto 6px",
                }}>{i + 1}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>{step}</div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-lg" onClick={() => nav("/kyc")} style={{ width: "100%" }}>
          {m.btn} →
        </button>

        {!wallet.account && (
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Connect your wallet first
          </div>
        )}
      </div>
    </div>
  );
}
