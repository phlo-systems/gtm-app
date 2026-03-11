/**
 * SIDEBAR + ROLE TOGGLE
 * 
 * Main navigation sidebar that adapts its menu items based on the
 * active role (trader vs forwarder). Includes the role toggle switch
 * and user info / sign-out link.
 * 
 * Props:
 *   active     - current page key (e.g. "dashboard", "deals", "jobs")
 *   onNav      - callback when a nav item is clicked
 *   user       - Supabase auth user object
 *   onLogout   - callback for sign-out
 *   role       - "trader" | "forwarder"
 *   onRoleChange - callback when role toggle is clicked
 */
'use client'

import { S } from './styles';

function RoleToggle({ role, onChange }) {
  return (
    <div style={{ padding: "8px 16px", display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 6, margin: "0 12px 4px 12px" }}>
      {["trader", "forwarder"].map(r => (
        <div key={r} onClick={() => onChange(r)} style={{
          flex: 1, textAlign: "center", padding: "5px 4px", fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.8px", cursor: "pointer", borderRadius: 4,
          background: role === r ? "rgba(255,255,255,0.18)" : "transparent",
          color: role === r ? "#FFF" : "rgba(255,255,255,0.4)",
          transition: "all 0.15s ease",
        }}>{r}</div>
      ))}
    </div>
  );
}

const TRADER_NAV = [
  { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
  { key: "deals", icon: "\u25C8", label: "Deals" },
  { key: "precalc", icon: "\u25A3", label: "Pre-Calc" },
  { key: "customs", icon: "\u25C6", label: "Customs" },
  { key: "postcalc", icon: "\u25C9", label: "Post-Calc" },
  { key: "calculator", icon: "\u25A8", label: "Container Calc" },
  { key: "masterdata", icon: "\u25C7", label: "Master Data" },
  { key: "team", icon: "\u25CB", label: "Team" },
    { key: "agent", icon: "\u{1F4BC}", label: "Agent" },
    { key: "financer", icon: "\u{1F3E6}", label: "Finance" },
];

const FORWARDER_NAV = [
  { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
  { key: "jobs", icon: "\u2693", label: "Jobs" },
  { key: "newjob", icon: "\u25A3", label: "New Job" },
  { key: "customs", icon: "\u25C6", label: "Customs" },
  { key: "tracking", icon: "\u25CE", label: "Tracking" },
  { key: "calculator", icon: "\u25A8", label: "Container Calc" },
  { key: "masterdata", icon: "\u25C7", label: "Master Data" },
  { key: "team", icon: "\u25CB", label: "Team" },
];

export default function Sidebar({ active, onNav, user, onLogout, role, onRoleChange }) {
  const items = role === "forwarder" ? FORWARDER_NAV : TRADER_NAV;

  return (
    <div style={S.sidebar}>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>GTM</div>
        <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "1.5px", marginTop: 2 }}>PHLO SYSTEMS</div>
      </div>
      <RoleToggle role={role} onChange={onRoleChange} />
      <div style={{ flex: 1, padding: "8px 0" }}>
        {items.map((i) => (
          <div key={i.key} onClick={() => onNav(i.key)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13,
            fontWeight: active === i.key ? 700 : 400, background: active === i.key ? "rgba(255,255,255,0.1)" : "transparent",
            borderLeft: active === i.key ? "3px solid #FFF" : "3px solid transparent",
          }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>{i.icon}</span>{i.label}
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, opacity: 0.6 }}>
        <div>{user?.email}</div>
        <div onClick={onLogout} style={{ marginTop: 8, cursor: "pointer", color: "#FF9999", fontWeight: 600 }}>Sign Out</div>
      </div>
    </div>
  );
}
