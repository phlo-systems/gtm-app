/**
 * DASHBOARD VIEW
 * 
 * Shared dashboard screen that adapts to the active role.
 * Shows KPI stat cards and a recent deals/jobs table.
 * 
 * Props:
 *   deals  - array of deal/job objects from the API
 *   onNav  - callback(pageKey, optionalDeal) for navigation
 *   role   - "trader" | "forwarder"
 */
'use client'

import { S, statusColor } from '@/components/shared/styles';

export default function DashboardView({ deals, onNav, role }) {
  const isFwd = role === "forwarder";

  const stats = isFwd ? [
    { label: "Active Jobs", value: deals.length, sub: deals.filter(d => d.status === "booked" || d.status === "in_transit").length + " in progress", color: "#1B4332" },
    { label: "Quoted", value: deals.filter(d => d.status === "quoted" || d.status === "submitted").length, sub: "awaiting confirmation", color: "#1565C0" },
    { label: "Delivered", value: deals.filter(d => d.status === "delivered" || d.status === "approved").length, sub: "completed", color: "#1B7A43" },
    { label: "Total Jobs", value: deals.length, sub: "all time", color: "#13B5EA" },
  ] : [
    { label: "Active Deals", value: deals.length, sub: deals.filter(d => d.status === "submitted").length + " pending", color: "#1B4332" },
    { label: "Drafts", value: deals.filter(d => d.status === "draft").length, sub: "editable", color: "#888" },
    { label: "Approved", value: deals.filter(d => d.status === "approved").length, sub: "ready for execution", color: "#1B7A43" },
    { label: "Total Deals", value: deals.length, sub: "all time", color: "#13B5EA" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Dashboard</h2>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ ...S.card, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: "4px 0" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#AAA" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Deals/Jobs Table */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Recent {isFwd ? "Jobs" : "Deals"}</div>
          <button style={S.btn(false)} onClick={() => onNav(isFwd ? "jobs" : "deals")}>View All</button>
        </div>
        {deals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#AAA" }}>No {isFwd ? "jobs" : "deals"} yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>{isFwd ? "Job #" : "Deal"}</th>
              <th style={S.th}>{isFwd ? "Shipper" : "Customer"}</th>
              <th style={S.th}>Status</th>
              <th style={{ ...S.th, textAlign: "right" }}>{isFwd ? "Route" : "Margin"}</th>
            </tr></thead>
            <tbody>{deals.slice(0, 5).map(d => (
              <tr key={d.id} onClick={() => onNav(isFwd ? "newjob" : "precalc", d)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 600, fontSize: 12 }}>{d.deal_number}</td>
                <td style={S.td}>{d.customer?.name || "\u2014"}</td>
                <td style={S.td}><span style={S.badge(statusColor[d.status] || "#888")}>{d.status}</span></td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>
                  {isFwd ? (d.buy_location && d.sell_location ? d.buy_location + " \u2192 " + d.sell_location : "\u2014")
                         : (d.gross_margin_pct > 0 ? d.gross_margin_pct.toFixed(1) + "%" : "\u2014")}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
