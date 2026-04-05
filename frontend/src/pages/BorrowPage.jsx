import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast }  from "../context/ToastContext";
import { loansApi, propertiesApi } from "../services/api";
import { txRequestLoan } from "../services/contracts";
import { ethers } from "ethers";

export default function BorrowPage() {
  const wallet = useWallet();
  const toast  = useToast();
  const [loading, setLoad] = useState(false);
  const [form, setForm] = useState({
    propertyId:    "",
    sharesToLock:  "",
    principal:     "",
    interest:      "",
    emiCount:      "",
    durationPerEMI:"120",
  });

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const totalRepay = form.principal && form.interest
    ? (parseFloat(form.principal || 0) + parseFloat(form.interest || 0)).toFixed(4)
    : "—";

  const emiAmt = totalRepay !== "—" && form.emiCount
    ? (parseFloat(totalRepay) / parseInt(form.emiCount)).toFixed(4)
    : "—";

  const sharesPerEMI = form.sharesToLock && form.emiCount
    ? Math.floor(parseInt(form.sharesToLock) / parseInt(form.emiCount))
    : "—";

  async function handleSubmit() {
    const { propertyId, sharesToLock, principal, interest, emiCount, durationPerEMI } = form;
    if (!propertyId || !sharesToLock || !principal || !emiCount || !durationPerEMI) {
      toast.error("Please fill all required fields"); return;
    }
    if (!wallet.account) { toast.error("Connect wallet first"); return; }

    // Validation: shares must be divisible by emiCount
    if (parseInt(sharesToLock) % parseInt(emiCount) !== 0) {
      toast.error("Shares must divide evenly by EMI count"); return;
    }

    try {
      setLoad(true);
      const { txHash } = await txRequestLoan({
        propertyId:     parseInt(propertyId),
        sharesToLock:   parseInt(sharesToLock),
        principal,
        interest:       interest || "0",
        emiCount:       parseInt(emiCount),
        durationPerEMI: parseInt(durationPerEMI),
      });

      // Save to backend
      await loansApi.create({
        borrower:       wallet.account,
        propertyId:     parseInt(propertyId),
        lockedShares:   parseInt(sharesToLock),
        principal:      ethers.parseEther(principal).toString(),
        interest:       ethers.parseEther(interest || "0").toString(),
        emiCount:       parseInt(emiCount),
        durationPerEMI: parseInt(durationPerEMI),
        txHash,
      });

      // Lock shares in property record
      await propertiesApi.lock(propertyId, parseInt(sharesToLock));

      toast.success("Loan requested on-chain! 🔗");
      setForm({ propertyId:"", sharesToLock:"", principal:"", interest:"", emiCount:"", durationPerEMI:"" });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoad(false);
    }
  }

  return (
    <div className="page-body fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>

        {/* Form */}
        <div className="card">
          <div className="card-title">REQUEST A LOAN</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">PROPERTY ID *</label>
              <input className="form-input" placeholder="e.g. 1" type="number"
                value={form.propertyId} onChange={(e) => setF("propertyId", e.target.value)} />
              <span className="form-hint">ERC-1155 token ID from PropertyShares</span>
            </div>
            <div className="form-group">
              <label className="form-label">SHARES TO LOCK *</label>
              <input className="form-input" placeholder="e.g. 50" type="number"
                value={form.sharesToLock} onChange={(e) => setF("sharesToLock", e.target.value)} />
              <span className="form-hint">Must divide evenly by EMI count</span>
            </div>
            <div className="form-group">
              <label className="form-label">LOAN AMOUNT (ETH) *</label>
              <input className="form-input" placeholder="e.g. 1.0"
                value={form.principal} onChange={(e) => setF("principal", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">TOTAL INTEREST (ETH)</label>
              <input className="form-input" placeholder="e.g. 0.5"
                value={form.interest} onChange={(e) => setF("interest", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">NUMBER OF EMIs *</label>
              <input className="form-input" placeholder="e.g. 5" type="number"
                value={form.emiCount} onChange={(e) => setF("emiCount", e.target.value)} />
              <span className="form-hint">(principal + interest) ÷ emiCount must divide evenly</span>
            </div>
            <div className="form-group">
              <label className="form-label">DURATION PER EMI (seconds) *</label>
              <input className="form-input" placeholder="2592000 = 30 days"
                value={form.durationPerEMI} onChange={(e) => setF("durationPerEMI", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading || !wallet.account}>
              {loading ? <><span className="spinner" />Submitting to Chain…</> : "🔗 Request Loan"}
            </button>
            {!wallet.account && <p className="form-hint" style={{ marginTop: 8 }}>Connect wallet to continue.</p>}
          </div>
        </div>

        {/* Summary + How it works */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div className="card-title">EMI SUMMARY</div>
            <div className="detail-row"><span className="detail-key">TOTAL REPAYMENT</span><span className="detail-val">{totalRepay !== "—" ? totalRepay + " ETH" : "—"}</span></div>
            <div className="detail-row"><span className="detail-key">PER EMI AMOUNT</span><span className="detail-val">{emiAmt !== "—" ? emiAmt + " ETH" : "—"}</span></div>
            <div className="detail-row"><span className="detail-key">SHARES PER EMI</span><span className="detail-val">{sharesPerEMI}</span></div>
            <div className="detail-row"><span className="detail-key">COLLATERAL TYPE</span><span className="detail-val">ERC-1155 Fractional</span></div>
          </div>

          <div className="card">
            <div className="card-title">HOW IT WORKS</div>
            <div className="timeline">
              {[
                ["Approve Shares",     "setApprovalForAll → LoanContract"],
                ["Request Loan",       "requestLoan() locks your shares on-chain"],
                ["Receive ETH",        "Lender funds → ETH sent to your wallet"],
                ["Pay EMIs On Time",   "payEMI() each period before nextDueDate"],
                ["Get Shares Back",    "All EMIs paid → shares auto-returned"],
              ].map(([title, sub], i, arr) => (
                <div key={title} className="tl-item">
                  <div style={{ position: "relative" }}>
                    <div className="tl-dot done" />
                    {i < arr.length - 1 && <div className="tl-line" />}
                  </div>
                  <div>
                    <div className="tl-title">{title}</div>
                    <div className="tl-sub">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
