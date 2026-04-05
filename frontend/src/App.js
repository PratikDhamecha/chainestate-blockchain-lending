import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { WalletProvider } from "./context/WalletContext";
import { ToastProvider }  from "./context/ToastContext";

import Sidebar        from "./components/layout/Sidebar";
import Topbar         from "./components/layout/Topbar";
import ToastContainer from "./components/common/ToastContainer";
import KYCGuard       from "./components/common/KYCGuard";

import Dashboard        from "./pages/Dashboard";
import PropertiesPage   from "./pages/PropertiesPage";
import KYCPage          from "./pages/KYCPage";
import BorrowPage       from "./pages/BorrowPage";
import LendPage         from "./pages/LendPage";
import LoansPage        from "./pages/LoansPage";
import TransactionsPage from "./pages/TransactionsPage";
import AdminKYCPage     from "./pages/AdminKYCPage";

import "./styles/global.css";
import "./styles/components.css";

const TITLES = {
  "/":             "DASHBOARD",
  "/properties":  "PROPERTY REGISTRY",
  "/kyc":         "eKYC VERIFICATION",
  "/borrow":      "REQUEST LOAN",
  "/lend":        "FUND A LOAN",
  "/loans":       "ALL LOANS",
  "/transactions":"BLOCKCHAIN LEDGER",
  "/admin/kyc":   "ADMIN — KYC REVIEW",
};

function AppShell() {
  return (
    <div className="app-shell grid-bg">
      <Sidebar />
      <Topbar titles={TITLES} />
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/properties"   element={<PropertiesPage />} />
          <Route path="/kyc"          element={<KYCPage />} />
          <Route path="/borrow"       element={<KYCGuard><BorrowPage /></KYCGuard>} />
          <Route path="/lend"         element={<LendPage />} />
          <Route path="/loans"        element={<LoansPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/admin/kyc"    element={<AdminKYCPage />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <WalletProvider>
          <AppShell />
        </WalletProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
