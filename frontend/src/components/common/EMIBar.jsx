import React from "react";

export default function EMIBar({ paid = 0, total = 0 }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="emi-bar-wrap">
      <div className="emi-bar-labels">
        <span>EMI PROGRESS</span>
        <span>{paid}/{total} ({pct}%)</span>
      </div>
      <div className="emi-bar-bg">
        <div className="emi-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
