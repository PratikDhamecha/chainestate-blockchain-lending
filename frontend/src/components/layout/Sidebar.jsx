import React from "react";
import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/",              icon: "⬡",  label: "Dashboard"       },
  { to: "/properties",   icon: "🏛️", label: "Properties"      },
  { to: "/kyc",          icon: "🔐",  label: "KYC Verify"      },
  { to: "/borrow",       icon: "📥",  label: "Borrow"          },
  { to: "/lend",         icon: "💰",  label: "Lend"            },
  { to: "/loans",        icon: "📋",  label: "All Loans"       },
  { to: "/transactions", icon: "⛓️",  label: "Transactions"    },
  { to: "/admin/kyc",    icon: "🛡️",  label: "Admin — KYC"    },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-title">CHAIN<br/>ESTATE</div>
        <div className="logo-sub">DEFI · PROPERTY · LOANS</div>
      </div>

      <nav className="nav-section">
        <div className="nav-group-label">MAIN</div>
        {NAV.slice(0, 7).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </NavLink>
        ))}
        <div className="nav-group-label" style={{ marginTop: 12 }}>ADMIN</div>
        {NAV.slice(7).map((n) => (
          <NavLink key={n.to} to={n.to}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="net-label">NETWORK</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div className="net-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)" }}>Hardhat Local</span>
        </div>
      </div>
    </aside>
  );
}
