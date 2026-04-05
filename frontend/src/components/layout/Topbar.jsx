import React from "react";
import { useLocation } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { shortAddr } from "../../services/contracts";

const TITLES = {
  "/":             "DASHBOARD",
  "/properties":  "PROPERTY REGISTRY",
  "/borrow":      "REQUEST LOAN",
  "/lend":        "FUND A LOAN",
  "/loans":       "ALL LOANS",
  "/transactions":"BLOCKCHAIN LEDGER",
};

export default function Topbar() {
  const { account, connecting, connect, disconnect } = useWallet();
  const { pathname } = useLocation();

  return (
    <header className="topbar">
      <span className="page-title">{TITLES[pathname] || "CHAINESTATE"}</span>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {account && (
          <span className="wallet-connected">{shortAddr(account)}</span>
        )}
        {account ? (
          <button className="btn-wallet" onClick={disconnect}>
            <div className="net-dot" />
            Connected
          </button>
        ) : (
          <button className="btn-wallet" onClick={connect} disabled={connecting}>
            {connecting ? <><span className="spinner" />Connecting…</> : "🔗 Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
