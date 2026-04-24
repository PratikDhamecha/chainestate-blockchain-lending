import React, { useState, useMemo } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { useLoans } from "../hooks/useLoans";
import { useContract } from "../hooks/useContract";

export default function BorrowPage() {
  const wallet = useWallet();
  const toast = useToast();

  const { createLoan, isTxPending } = useLoans();
  const { useEventListener } = useContract();

  const [form, setForm] = useState({
    principal: "",
    annualRate: "10", // default 10%
    termMonths: "12", // default 12 months
  });

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Dynamic EMI Calculation
  const { emi, totalRepay, monthlyRateBP } = useMemo(() => {
    const p = parseFloat(form.principal || 0);
    const rate = parseFloat(form.annualRate || 0);
    const months = parseInt(form.termMonths || 1);

    if (!p || !rate || !months) return { emi: "—", totalRepay: "—", monthlyRateBP: 0 };

    const r = rate / 12 / 100;
    const emiVal = p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);

    // BP calculation: (Annual Rate / 12) * 100
    const bp = Math.floor((rate * 100) / 12);

    return {
      emi: emiVal.toFixed(6),
      totalRepay: (emiVal * months).toFixed(6),
      monthlyRateBP: bp
    };
  }, [form]);

  // Listen for the smart contract event
  useEventListener("LoanCreated", (loanId, borrower, principalAmt) => {
    if (borrower.toLowerCase() === wallet.account?.toLowerCase()) {
      toast.success(`Loan #${loanId} created successfully! 🔗`);
    }
  });

  async function handleSubmit() {
    const { principal, termMonths } = form;
    if (!principal || !termMonths || emi === "—") {
      toast.error("Please fill all valid fields"); return;
    }
    if (!wallet.account) { toast.error("Connect wallet first"); return; }

    try {
      // duration in seconds = months * 30 days
      const durationSeconds = parseInt(termMonths) * 30 * 24 * 60 * 60;

      await createLoan(principal, monthlyRateBP, durationSeconds, emi);
      toast.info("Transaction sent! Waiting for confirmation...");
      setForm({ principal: "", annualRate: "10", termMonths: "12" });
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="page-body fade-in">
      <div className="borrow-grid">

        {/* Form */}
        <div className="card">
          <div className="card-title">REQUEST A SYNDICATED LOAN</div>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">LOAN AMOUNT (ETH) *</label>
              <input className="form-input" placeholder="e.g. 10.0" type="number"
                value={form.principal} onChange={(e) => setF("principal", e.target.value)} />
            </div>
            <div className="form-group half">
              <label className="form-label">ANNUAL INTEREST RATE (%)</label>
              <input className="form-input" placeholder="10" type="number"
                value={form.annualRate} onChange={(e) => setF("annualRate", e.target.value)} />
            </div>
            <div className="form-group half">
              <label className="form-label">TERM (MONTHS)</label>
              <input className="form-input" placeholder="12" type="number"
                value={form.termMonths} onChange={(e) => setF("termMonths", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 22 }}>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isTxPending || !wallet.account} style={{ width: '100%', justifyContent: 'center' }}>
              {isTxPending ? <><span className="spinner" />Submitting to Chain…</> : "🔗 Request Loan"}
            </button>
            {!wallet.account && <p className="form-hint" style={{ marginTop: 8, textAlign: 'center' }}>Connect wallet to continue.</p>}
          </div>
        </div>

        {/* Summary + How it works */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <div className="card-title" style={{ color: 'var(--accent)' }}>EMI PREVIEW</div>
            <div className="detail-row"><span className="detail-key">TARGET PRINCIPAL</span><span className="detail-val">{form.principal ? `${form.principal} ETH` : "—"}</span></div>
            <div className="detail-row"><span className="detail-key">MONTHLY EMI</span><span className="detail-val" style={{ fontWeight: 'bold' }}>{emi !== "—" ? `${emi} ETH` : "—"}</span></div>
            <div className="detail-row"><span className="detail-key">EST. TOTAL REPAYMENT</span><span className="detail-val">{totalRepay !== "—" ? `${totalRepay} ETH` : "—"}</span></div>
            <div className="detail-row"><span className="detail-key">TERM LENGTH</span><span className="detail-val">{form.termMonths ? `${form.termMonths} Months` : "—"}</span></div>
          </div>

          <div className="card">
            <div className="card-title">HOW IT WORKS</div>
            <div className="timeline">
              {[
                ["Request Loan", "createLoan() initializes your request with dynamic EMI"],
                ["Syndicated Funding", "Multiple lenders can fund your loan partially"],
                ["Auto Activation", "Once 100% funded, ETH is sent to you instantly"],
                ["EMI Repayment", "payEMI() pays down interest, and you can prepay principal!"],
                ["Continuous Claim", "Lenders claim dividends after every payment you make"],
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
