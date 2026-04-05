import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast }  from "../context/ToastContext";
import { kycApi }    from "../services/api";

const STATUS_CONFIG = {
  NOT_SUBMITTED: { color: "var(--text-muted)", icon: "○", label: "Not Submitted",  bg: "rgba(100,116,139,0.1)"  },
  PENDING:       { color: "var(--yellow)",     icon: "⏳", label: "Under Review",   bg: "rgba(234,179,8,0.1)"    },
  VERIFIED:      { color: "var(--green)",      icon: "✅", label: "KYC Verified",   bg: "rgba(34,197,94,0.1)"    },
  REJECTED:      { color: "var(--red)",        icon: "✕",  label: "KYC Rejected",   bg: "rgba(239,68,68,0.1)"    },
};

function FileUploadBox({ label, hint, name, onChange, preview, required }) {
  const inputRef = useRef();
  return (
    <div className="form-group">
      <label className="form-label">{label} {required && "*"}</label>
      <div
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${preview ? "var(--accent)" : "rgba(0,180,255,0.25)"}`,
          borderRadius: "var(--radius-md)",
          padding: "20px",
          cursor: "pointer",
          textAlign: "center",
          background: preview ? "rgba(0,200,255,0.05)" : "var(--bg-elevated)",
          transition: "all 0.2s",
          minHeight: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{ maxHeight: 90, maxWidth: "100%", borderRadius: 6, objectFit: "cover" }}
          />
        ) : (
          <>
            <span style={{ fontSize: 28 }}>📎</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              Click to upload
            </span>
          </>
        )}
      </div>
      <span className="form-hint">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/jpg"
        style={{ display: "none" }}
        onChange={onChange}
      />
    </div>
  );
}

export default function KYCPage() {
  const wallet = useWallet();
  const toast  = useToast();

  const [kycStatus, setKycStatus] = useState("NOT_SUBMITTED");
  const [kycData,   setKycData]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmit]    = useState(false);

  const [form, setForm] = useState({
    fullName: "", aadhaarNumber: "", panNumber: "",
  });
  const [files, setFiles]     = useState({ aadhaarImage: null, selfie: null });
  const [previews, setPreviews] = useState({ aadhaarImage: null, selfie: null });

  // Load KYC status on wallet connect
  useEffect(() => {
    if (!wallet.account) { setLoading(false); return; }
    loadStatus();
  }, [wallet.account]); // eslint-disable-line

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await kycApi.getStatus(wallet.account);
      setKycStatus(res.data.status || "NOT_SUBMITTED");
      setKycData(res.data);
    } catch {
      setKycStatus("NOT_SUBMITTED");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const { name, files: f } = e.target;
    if (!f[0]) return;
    setFiles(prev => ({ ...prev, [name]: f[0] }));
    setPreviews(prev => ({ ...prev, [name]: URL.createObjectURL(f[0]) }));
  }

  async function handleSubmit() {
    if (!wallet.account)        { toast.error("Connect your wallet first"); return; }
    if (!form.fullName)          { toast.error("Full name is required"); return; }
    if (!form.aadhaarNumber || form.aadhaarNumber.length !== 12) {
      toast.error("Aadhaar number must be 12 digits"); return;
    }
    if (!files.aadhaarImage)     { toast.error("Aadhaar card image is required"); return; }
    if (!files.selfie)           { toast.error("Selfie photo is required"); return; }

    const fd = new FormData();
    fd.append("walletAddress",  wallet.account);
    fd.append("fullName",       form.fullName);
    fd.append("aadhaarNumber",  form.aadhaarNumber);
    fd.append("panNumber",      form.panNumber);
    fd.append("aadhaarImage",   files.aadhaarImage);
    fd.append("selfie",         files.selfie);

    try {
      setSubmit(true);
      await kycApi.submit(fd);
      toast.success("KYC submitted! Awaiting admin review. 🎉");
      loadStatus();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmit(false);
    }
  }

  const cfg = STATUS_CONFIG[kycStatus] || STATUS_CONFIG.NOT_SUBMITTED;

  return (
    <div className="page-body fade-in">

      {/* Status Banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: cfg.bg,
        border: `1px solid ${cfg.color}`,
        borderRadius: "var(--radius-lg)",
        padding: "18px 24px",
        marginBottom: 28,
      }}>
        <span style={{ fontSize: 28 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: cfg.color, letterSpacing: 2 }}>
            KYC STATUS — {cfg.label.toUpperCase()}
          </div>
          {kycData?.submittedAt && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              Submitted: {new Date(kycData.submittedAt).toLocaleDateString()}
              {kycData.verifiedAt && ` · Verified: ${new Date(kycData.verifiedAt).toLocaleDateString()}`}
            </div>
          )}
          {kycStatus === "REJECTED" && kycData?.rejectionReason && (
            <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>
              Reason: {kycData.rejectionReason}
            </div>
          )}
          {kycStatus === "VERIFIED" && (
            <div style={{ fontSize: 12, color: "var(--green)", marginTop: 4 }}>
              ✓ You are eligible to request collateral loans
            </div>
          )}
        </div>
        {wallet.account && (
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            {wallet.account.slice(0,6)}…{wallet.account.slice(-4)}
          </span>
        )}
      </div>

      {!wallet.account && (
        <div className="empty-state">Please connect your wallet to submit KYC.</div>
      )}

      {wallet.account && loading && (
        <div className="page-loader"><div className="spinner" />Checking KYC status…</div>
      )}

      {/* Show form only if not submitted / rejected */}
      {wallet.account && !loading && (kycStatus === "NOT_SUBMITTED" || kycStatus === "REJECTED") && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>

          {/* Form */}
          <div className="card">
            <div className="card-title">
              {kycStatus === "REJECTED" ? "RE-SUBMIT KYC" : "SUBMIT eKYC"}
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">FULL NAME (as on Aadhaar) *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Rahul Sharma"
                  value={form.fullName}
                  onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">AADHAAR NUMBER *</label>
                <input
                  className="form-input"
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                  value={form.aadhaarNumber}
                  onChange={e => setForm(p => ({ ...p, aadhaarNumber: e.target.value.replace(/\D/g,"") }))}
                />
                <span className="form-hint">Stored encrypted, never on blockchain</span>
              </div>
              <div className="form-group">
                <label className="form-label">PAN NUMBER (optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  value={form.panNumber}
                  onChange={e => setForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
              <FileUploadBox
                label="AADHAAR CARD IMAGE"
                hint="Upload front side of Aadhaar card (JPEG/PNG, max 5MB)"
                name="aadhaarImage"
                onChange={handleFileChange}
                preview={previews.aadhaarImage}
                required
              />
              <FileUploadBox
                label="SELFIE PHOTO"
                hint="Clear face photo in good lighting (JPEG/PNG, max 5MB)"
                name="selfie"
                onChange={handleFileChange}
                preview={previews.selfie}
                required
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <><span className="spinner" />Submitting…</>
                  : "🔐 Submit KYC"}
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card">
              <div className="card-title">WHY KYC IS REQUIRED</div>
              <div className="timeline">
                {[
                  ["Identity Verification",  "Proves you are a real person before locking property as collateral"],
                  ["Fraud Prevention",       "Stops fake wallets from requesting loans"],
                  ["Legal Compliance",       "Meets RBI digital lending guidelines"],
                  ["Admin Approval",         "Our team reviews and approves within 24 hours"],
                  ["Loan Access Unlocked",   "Once verified, your wallet can call requestLoan() on-chain"],
                ].map(([t, s], i, arr) => (
                  <div key={t} className="tl-item">
                    <div style={{ position: "relative" }}>
                      <div className="tl-dot done" />
                      {i < arr.length - 1 && <div className="tl-line" />}
                    </div>
                    <div>
                      <div className="tl-title">{t}</div>
                      <div className="tl-sub">{s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">DATA SECURITY</div>
              {[
                ["📵", "Aadhaar & photos",   "Never stored on blockchain"],
                ["🔒", "MongoDB encrypted",  "Personal data stored encrypted off-chain"],
                ["✅", "On-chain flag only",  "Only VERIFIED/PENDING status goes on-chain"],
                ["🛡️", "Admin only access",  "KYC files only accessible by admin"],
              ].map(([icon, k, v]) => (
                <div key={k} className="detail-row">
                  <span className="detail-key">{icon} {k}</span>
                  <span className="detail-val" style={{ fontSize: 11, color: "var(--green)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending state */}
      {wallet.account && !loading && kycStatus === "PENDING" && (
        <div className="card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--yellow)", letterSpacing: 2, marginBottom: 12 }}>
            KYC UNDER REVIEW
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
            Your KYC documents have been submitted and are being reviewed by our admin team.
            Approval typically takes <strong style={{ color: "var(--text-body)" }}>24–48 hours</strong>.
          </div>
          <div style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
            Submitted: {kycData?.submittedAt ? new Date(kycData.submittedAt).toLocaleString() : "—"}
          </div>
        </div>
      )}

      {/* Verified state */}
      {wallet.account && !loading && kycStatus === "VERIFIED" && (
        <div className="card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--green)", letterSpacing: 2, marginBottom: 12 }}>
            KYC VERIFIED
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
            Your identity has been verified. You can now request collateral loans
            from the <strong style={{ color: "var(--accent)" }}>Borrow</strong> page.
          </div>
          {kycData?.fullName && (
            <div style={{ marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-body)" }}>
              Welcome, {kycData.fullName} 👋
            </div>
          )}
        </div>
      )}

    </div>
  );
}
