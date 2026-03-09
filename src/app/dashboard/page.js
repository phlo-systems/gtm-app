'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { calculateIncotermGap, INCOTERMS_2020 } from "@/lib/incoterms";

const S = {
  page: { fontFamily: "'Segoe UI', -apple-system, sans-serif", background: "#F8F7F4", minHeight: "100vh", color: "#1A1A1A" },
  sidebar: { width: 220, background: "#1B4332", color: "#FFF", position: "fixed", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", zIndex: 10 },
  main: { marginLeft: 220, padding: "24px 32px" },
  card: { background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 20, marginBottom: 16 },
  badge: (color) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + "18", color }),
  input: { width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#FAFAF8" },
  select: { width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", background: "#FAFAF8" },
  btn: (primary) => ({ padding: "8px 20px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: primary ? "#1B4332" : "#E8E4DC", color: primary ? "#FFF" : "#1A1A1A" }),
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#888", borderBottom: "2px solid #E8E4DC" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #F0EDE6" },
  label: { fontSize: 11, color: "#888", display: "block", marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" },
};
const statusColor = { draft: "#888", submitted: "#D4A017", approved: "#1B7A43", rejected: "#C62828", quoted: "#1565C0", booked: "#6A1B9A", in_transit: "#E65100", delivered: "#1B7A43" };

/* ─── ROLE TOGGLE ────────────────────────────────────────────────── */

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

/* ─── SIDEBAR ────────────────────────────────────────────────────── */

function Sidebar({ active, onNav, user, onLogout, role, onRoleChange }) {
  const traderItems = [
    { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
    { key: "deals", icon: "\u25C8", label: "Deals" },
    { key: "precalc", icon: "\u25A3", label: "Pre-Calc" },
    { key: "customs", icon: "\u25C6", label: "Customs" },
    { key: "postcalc", icon: "\u25C9", label: "Post-Calc" },
  ];
  const forwarderItems = [
    { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
    { key: "jobs", icon: "\u2693", label: "Jobs" },
    { key: "newjob", icon: "\u25A3", label: "New Job" },
    { key: "customs", icon: "\u25C6", label: "Customs" },
    { key: "tracking", icon: "\u25CE", label: "Tracking" },
  ];
  const items = role === "forwarder" ? forwarderItems : traderItems;
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

function Loading({ text }) {
  return <div style={{ textAlign: "center", padding: 60, color: "#888" }}><div style={{ fontSize: 24, marginBottom: 8 }}>&#8635;</div>{text || "Loading..."}</div>;
}

/* ─── DASHBOARD (both roles) ─────────────────────────────────────── */

function DashboardView({ deals, onNav, role }) {
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ ...S.card, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: "4px 0" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#AAA" }}>{s.sub}</div>
          </div>
        ))}
      </div>
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

/* ─── TRADER: Deals List ─────────────────────────────────────────── */

function DealsList({ deals, onOpenDeal, onNewDeal }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Deals</h2>
        <button style={S.btn(true)} onClick={onNewDeal}>+ New Deal</button>
      </div>
      <div style={S.card}>
        {deals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>No deals yet. Create your first deal to start.</div>
            <button style={S.btn(true)} onClick={onNewDeal}>+ Create First Deal</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={S.th}>Deal ID</th><th style={S.th}>Customer</th><th style={S.th}>Supplier</th><th style={S.th}>Incoterms</th><th style={S.th}>Status</th><th style={{ ...S.th, textAlign: "right" }}>Margin</th></tr></thead>
            <tbody>{deals.map(d => (
              <tr key={d.id} onClick={() => onOpenDeal(d)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 700, color: "#1B4332" }}>{d.deal_number}</td>
                <td style={S.td}>{d.customer?.name || "\u2014"}</td>
                <td style={S.td}>{d.supplier?.name || "\u2014"}</td>
                <td style={{ ...S.td, fontSize: 11 }}><span style={{ color: "#1B7A43" }}>{d.buy_incoterm || "\u2014"}</span> {"\u2192"} <span style={{ color: "#C62828" }}>{d.sell_incoterm || "\u2014"}</span></td>
                <td style={S.td}><span style={S.badge(statusColor[d.status] || "#888")}>{d.status}</span></td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{d.gross_margin_pct > 0 ? d.gross_margin_pct.toFixed(1) + "%" : "\u2014"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── TRADER: Pre-Calc Screen (unchanged) ────────────────────────── */

function PreCalcScreen({ deal, onBack, onSaved }) {
  const isNew = !deal;
  const isDraft = isNew || deal?.status === "draft";
  const [saving, setSaving] = useState(false);
  const [costMatrix, setCostMatrix] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    trade_type: deal?.trade_type || "cross_border_direct",
    transport_mode: deal?.transport_mode || "ocean",
    customer_name: deal?.customer?.name || "",
    supplier_name: deal?.supplier?.name || "",
    buy_incoterm: deal?.buy_incoterm || "FOB",
    buy_location: deal?.buy_location || "",
    sell_incoterm: deal?.sell_incoterm || "CIF",
    sell_location: deal?.sell_location || "",
    unit_price: deal?.unit_price || "",
    hs_code: deal?.hs_code || "",
    cost_currency: deal?.cost_currency || "USD",
    customer_payment_terms: deal?.customer_payment_terms || "Net 60",
  });
  const gap = calculateIncotermGap(form.buy_incoterm, form.sell_incoterm);
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    if (deal?.id) {
      fetch("/api/deals/" + deal.id + "/cost-matrix").then(r => r.json()).then(data => {
        if (data && data.length > 0) setCostMatrix(data[0]);
      }).catch(() => {});
    }
  }, [deal?.id]);

  const saveDeal = async () => {
    setSaving(true);
    try {
      const url = deal?.id ? "/api/deals/" + deal.id : "/api/deals";
      const res = await fetch(url, { method: deal?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const saved = await res.json();
      if (res.ok) onSaved(saved);
      else alert(saved.error || "Failed to save");
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };
  const genMatrix = async () => {
    if (!deal?.id) { alert("Save the deal first."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/deals/" + deal.id + "/cost-matrix", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setCostMatrix({ ...data.matrix, cost_lines: data.cost_lines }); setStep(2); }
      else alert(data.error || "Failed");
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };
  const doAction = async (action) => {
    if (!deal?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/deals/" + deal.id + "/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (res.ok) onSaved({ ...deal, status: action === "submit" ? "submitted" : action === "approve" ? "approved" : "rejected" });
      else { const d = await res.json(); alert(d.error); }
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>{"\u2190"}</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isNew ? "New Deal" : deal.deal_number}</h2>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{form.customer_name || "Customer"} {"\u2014"} {form.buy_incoterm} {"\u2192"} {form.sell_incoterm}
              {deal?.status && <span style={{ marginLeft: 8, ...S.badge(statusColor[deal.status] || "#888") }}>{deal.status}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDraft && <button style={S.btn(false)} onClick={saveDeal} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</button>}
          {isDraft && deal?.id && <button style={S.btn(false)} onClick={genMatrix} disabled={saving}>Gen Cost Matrix</button>}
          {isDraft && deal?.id && costMatrix && <button style={S.btn(true)} onClick={() => doAction("submit")} disabled={saving}>Submit for Approval</button>}
          {deal?.status === "submitted" && <button style={{ ...S.btn(true), background: "#1B7A43" }} onClick={() => doAction("approve")} disabled={saving}>Approve</button>}
          {deal?.status === "submitted" && <button style={{ ...S.btn(false), color: "#C62828" }} onClick={() => doAction("reject")} disabled={saving}>Reject</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[{ n: 1, l: "Deal Sheet" }, { n: 2, l: "Cost Matrix" }, { n: 3, l: "Feasibility" }].map(s => (
          <div key={s.n} onClick={() => setStep(s.n)} style={{ padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: step === s.n ? 700 : 400, background: step === s.n ? "#1B4332" : "#E8E4DC", color: step === s.n ? "#FFF" : "#666", borderRadius: s.n === 1 ? "6px 0 0 6px" : s.n === 3 ? "0 6px 6px 0" : 0 }}>
            {s.l}
          </div>
        ))}
      </div>
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Trade Structure</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={S.label}>Trade Type</label><select style={S.select} disabled={!isDraft} value={form.trade_type} onChange={f("trade_type")}><option value="cross_border_direct">Cross-Border (Direct)</option><option value="cross_border_intermediated">Cross-Border (Intermediated)</option><option value="domestic">Domestic</option><option value="transit_reexport">Transit / Re-Export</option></select></div>
              <div><label style={S.label}>Transport</label><select style={S.select} disabled={!isDraft} value={form.transport_mode} onChange={f("transport_mode")}><option value="ocean">Ocean</option><option value="road">Road</option><option value="air">Air</option></select></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Supplier / Origin</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={S.label}>Supplier</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.supplier_name} onChange={f("supplier_name")} placeholder="Supplier name" /></div>
              <div><label style={S.label}>Buy Incoterm</label><select style={S.select} disabled={!isDraft} value={form.buy_incoterm} onChange={f("buy_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={S.label}>Location</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.buy_location} onChange={f("buy_location")} placeholder="e.g. Mumbai" /></div>
              <div><label style={S.label}>Unit Price ({form.cost_currency})</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.unit_price} onChange={f("unit_price")} type="number" step="0.01" placeholder="0.00" /></div>
              <div><label style={S.label}>HS Code</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" /></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Customer / Destination</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={S.label}>Customer</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.customer_name} onChange={f("customer_name")} placeholder="Customer name" /></div>
              <div><label style={S.label}>Sell Incoterm</label><select style={S.select} disabled={!isDraft} value={form.sell_incoterm} onChange={f("sell_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={S.label}>Location</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.sell_location} onChange={f("sell_location")} placeholder="e.g. Durban" /></div>
              <div><label style={S.label}>Currency</label><select style={S.select} disabled={!isDraft} value={form.cost_currency} onChange={f("cost_currency")}><option>USD</option><option>ZAR</option><option>GBP</option><option>EUR</option><option>AED</option></select></div>
              <div><label style={S.label}>Payment Terms</label><select style={S.select} disabled={!isDraft} value={form.customer_payment_terms} onChange={f("customer_payment_terms")}><option>Net 60</option><option>Net 30</option><option>LC at Sight</option></select></div>
            </div>
          </div>
          {gap.valid && gap.hasGap && form.supplier_name && (
            <div style={{ gridColumn: "1 / -1", background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 8, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>{"\u26A0"}</span>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>Incoterm Gap: {gap.gapCosts.length} cost blocks</div><div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{gap.summary}</div></div>
            </div>
          )}
          {isNew && !form.customer_name && (
            <div style={{ gridColumn: "1 / -1", background: "#F0F7FF", border: "1px solid #B8D4F0", borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{"\u2139"} Fill in the deal details, then click Save Draft</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>After saving, you can generate the cost matrix which uses the Incoterm Gap Engine to calculate all costs.</div>
            </div>
          )}
        </div>
      )}
      {step === 2 && (
        <div style={S.card}>
          {!costMatrix ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>No cost matrix yet.</div>
              {isDraft && deal?.id && <button style={S.btn(true)} onClick={genMatrix} disabled={saving}>Generate Cost Matrix</button>}
              {!deal?.id && <div style={{ fontSize: 12, color: "#AAA" }}>Save the deal first.</div>}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Cost Matrix</div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#888" }}>Total COS</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1B4332" }}>${(costMatrix.total_cost || 0).toLocaleString()}</div></div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...S.th, width: 40 }}>Blk</th><th style={S.th}>Cost Line</th><th style={S.th}>Type</th><th style={{ ...S.th, textAlign: "right" }}>Amount</th><th style={S.th}>Resp.</th></tr></thead>
                <tbody>{(costMatrix.cost_lines || []).sort((a, b) => a.sort_order - b.sort_order).map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, fontWeight: 700, color: c.block === "A" ? "#1B7A43" : c.block === "B" ? "#D4A017" : "#6B2D5B" }}>{c.block}</td>
                    <td style={{ ...S.td, fontWeight: c.block === "A" ? 700 : 400 }}>{c.line_item}</td>
                    <td style={S.td}><span style={S.badge(c.cost_type === "base" ? "#1B7A43" : c.cost_type === "incoterm_gap" ? "#D4A017" : "#6B2D5B")}>{c.cost_type.replace("_", " ")}</span></td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${(c.amount || 0).toLocaleString()}</td>
                    <td style={S.td}>{c.responsibility}</td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
        </div>
      )}
      {step === 3 && (
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Feasibility</div>
          {costMatrix ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                {[{ l: "Supplier (A)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="A").reduce((s,l)=>s+l.amount,0) },
                  { l: "Incoterm Gap (B)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="B").reduce((s,l)=>s+l.amount,0) },
                  { l: "Business Charges (C)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="C").reduce((s,l)=>s+l.amount,0) },
                  { l: "Total COS", v: costMatrix.total_cost || 0, bold: true }
                ].map((r,i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: r.bold ? "2px solid #1B4332" : "1px solid #F0EDE6" }}>
                    <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 400 }}>{r.l}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: r.bold ? 800 : 600 }}>${r.v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: 16, background: (costMatrix.gross_margin_pct||0) >= 8 ? "#F0FFF4" : "#FFF5F5", borderRadius: 8, border: "1px solid " + ((costMatrix.gross_margin_pct||0) >= 8 ? "#C6E6D0" : "#E6C6C6") }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: (costMatrix.gross_margin_pct||0) >= 8 ? "#1B7A43" : "#C62828" }}>{(costMatrix.gross_margin_pct||0).toFixed(1)}%</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{(costMatrix.gross_margin_pct||0) >= 8 ? "\u2713 Margin check passed" : "\u2717 Below threshold (8%)"}</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 32, color: "#888" }}>Generate a cost matrix first.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── FORWARDER: Jobs List ───────────────────────────────────────── */

function ForwarderJobsList({ deals, onOpenJob, onNewJob }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Jobs</h2>
        <button style={S.btn(true)} onClick={onNewJob}>+ New Job</button>
      </div>
      <div style={S.card}>
        {deals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>No jobs yet. Create your first forwarding job.</div>
            <button style={S.btn(true)} onClick={onNewJob}>+ Create First Job</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Job #</th><th style={S.th}>Shipper</th><th style={S.th}>Consignee</th>
              <th style={S.th}>Route</th><th style={S.th}>Mode</th><th style={S.th}>Status</th>
            </tr></thead>
            <tbody>{deals.map(d => (
              <tr key={d.id} onClick={() => onOpenJob(d)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 700, color: "#1B4332" }}>{d.deal_number}</td>
                <td style={S.td}>{d.supplier?.name || "\u2014"}</td>
                <td style={S.td}>{d.customer?.name || "\u2014"}</td>
                <td style={{ ...S.td, fontSize: 12 }}>{d.buy_location || "?"} {"\u2192"} {d.sell_location || "?"}</td>
                <td style={S.td}><span style={S.badge("#1565C0")}>{d.transport_mode || "ocean"}</span></td>
                <td style={S.td}><span style={S.badge(statusColor[d.status] || "#888")}>{d.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── FORWARDER: New Job Screen ──────────────────────────────────── */

function ForwarderJobScreen({ deal, onBack, onSaved }) {
  const isNew = !deal;
  const isDraft = isNew || deal?.status === "draft";
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    transport_mode: deal?.transport_mode || "ocean_fcl",
    trade_type: deal?.trade_type || "import",
    supplier_name: deal?.supplier?.name || "",
    buy_location: deal?.buy_location || "",
    customer_name: deal?.customer?.name || "",
    sell_location: deal?.sell_location || "",
    port_of_loading: deal?.port_of_loading || "",
    port_of_discharge: deal?.port_of_discharge || "",
    incoterm: deal?.sell_incoterm || deal?.buy_incoterm || "FOB",
    commodity_desc: deal?.commodity_desc || "",
    hs_code: deal?.hs_code || "",
    num_packages: deal?.num_packages || "",
    package_type: deal?.package_type || "cartons",
    gross_weight_kg: deal?.gross_weight_kg || "",
    volume_cbm: deal?.volume_cbm || "",
    container_type: deal?.container_type || "20GP",
    num_containers: deal?.num_containers || 1,
    is_hazardous: deal?.is_hazardous || false,
    un_number: deal?.un_number || "",
    is_temperature_controlled: deal?.is_temperature_controlled || false,
    temp_range: deal?.temp_range || "",
    cargo_value: deal?.cargo_value || "",
    service_scope: deal?.service_scope || "port_to_port",
    insurance_required: deal?.insurance_required || false,
    customer_ref: deal?.customer_ref || "",
    cost_currency: deal?.cost_currency || "USD",
    notify_party: deal?.notify_party || "",
    required_etd: deal?.required_etd || "",
    required_eta: deal?.required_eta || "",
    customer_payment_terms: deal?.customer_payment_terms || "Net 30",
  });

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const fCheck = (key) => (e) => setForm({ ...form, [key]: e.target.checked });

  const [costBuild, setCostBuild] = useState([
    { id: 1, category: "Freight", description: "Ocean freight rate", buy_rate: "", sell_rate: "", unit: "per container", qty: form.num_containers || 1 },
    { id: 2, category: "Origin", description: "Origin THC", buy_rate: "", sell_rate: "", unit: "per container", qty: form.num_containers || 1 },
    { id: 3, category: "Origin", description: "Documentation / BL fee", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 },
    { id: 4, category: "Origin", description: "Customs clearance (origin)", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 },
    { id: 5, category: "Destination", description: "Destination THC", buy_rate: "", sell_rate: "", unit: "per container", qty: form.num_containers || 1 },
    { id: 6, category: "Destination", description: "Customs clearance (dest)", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 },
    { id: 7, category: "Destination", description: "Delivery / haulage", buy_rate: "", sell_rate: "", unit: "per container", qty: form.num_containers || 1 },
    { id: 8, category: "Insurance", description: "Cargo insurance", buy_rate: "", sell_rate: "", unit: "lump sum", qty: 1 },
  ]);

  const addCostLine = () => setCostBuild([...costBuild, { id: Date.now(), category: "Other", description: "", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 }]);
  const updateCostLine = (id, field, value) => setCostBuild(costBuild.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCostLine = (id) => setCostBuild(costBuild.filter(c => c.id !== id));

  const totalBuy = costBuild.reduce((s, c) => s + (parseFloat(c.buy_rate) || 0) * (parseInt(c.qty) || 1), 0);
  const totalSell = costBuild.reduce((s, c) => s + (parseFloat(c.sell_rate) || 0) * (parseInt(c.qty) || 1), 0);
  const margin = totalSell > 0 ? ((totalSell - totalBuy) / totalSell * 100) : 0;

  const volWeight = (parseFloat(form.volume_cbm) || 0) * 1000;
  const grossW = parseFloat(form.gross_weight_kg) || 0;
  const chargeableWeight = Math.max(volWeight, grossW);

  const inputStyle = (ed) => ({ ...S.input, background: ed ? "#FFF" : "#F0EDE6" });

  const saveDeal = async () => {
    setSaving(true);
    try {
      const payload = {
        trade_type: form.trade_type, transport_mode: form.transport_mode,
        customer_name: form.customer_name, supplier_name: form.supplier_name,
        buy_incoterm: form.incoterm, sell_incoterm: form.incoterm,
        buy_location: form.buy_location, sell_location: form.sell_location,
        unit_price: form.gross_weight_kg, hs_code: form.hs_code,
        cost_currency: form.cost_currency, customer_payment_terms: form.customer_payment_terms,
        _forwarder_data: {
          port_of_loading: form.port_of_loading, port_of_discharge: form.port_of_discharge,
          commodity_desc: form.commodity_desc, num_packages: form.num_packages,
          package_type: form.package_type, gross_weight_kg: form.gross_weight_kg,
          volume_cbm: form.volume_cbm, container_type: form.container_type,
          num_containers: form.num_containers, is_hazardous: form.is_hazardous,
          un_number: form.un_number, is_temperature_controlled: form.is_temperature_controlled,
          temp_range: form.temp_range, cargo_value: form.cargo_value,
          service_scope: form.service_scope, insurance_required: form.insurance_required,
          customer_ref: form.customer_ref, notify_party: form.notify_party,
          required_etd: form.required_etd, required_eta: form.required_eta,
          cost_build: costBuild,
        }
      };
      const url = deal?.id ? "/api/deals/" + deal.id : "/api/deals";
      const res = await fetch(url, { method: deal?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const saved = await res.json();
      if (res.ok) onSaved(saved); else alert(saved.error || "Failed to save");
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  const doAction = async (action) => {
    if (!deal?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/deals/" + deal.id + "/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (res.ok) onSaved({ ...deal, status: action === "submit" ? "submitted" : action === "approve" ? "approved" : "rejected" });
      else { const d = await res.json(); alert(d.error); }
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>{"\u2190"}</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isNew ? "New Forwarding Job" : deal.deal_number}</h2>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {form.supplier_name || "Shipper"} {"\u2192"} {form.customer_name || "Consignee"}
              {form.buy_location && form.sell_location && <span style={{ marginLeft: 8, color: "#AAA" }}>({form.buy_location} {"\u2192"} {form.sell_location})</span>}
              {deal?.status && <span style={{ marginLeft: 8, ...S.badge(statusColor[deal.status] || "#888") }}>{deal.status}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDraft && <button style={S.btn(false)} onClick={saveDeal} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</button>}
          {isDraft && deal?.id && <button style={S.btn(true)} onClick={() => doAction("submit")} disabled={saving}>Send Quote</button>}
          {deal?.status === "submitted" && <button style={{ ...S.btn(true), background: "#1B7A43" }} onClick={() => doAction("approve")} disabled={saving}>Confirm Booking</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[{ n: 1, l: "Job Details" }, { n: 2, l: "Cost Build" }, { n: 3, l: "Quote Summary" }].map(s => (
          <div key={s.n} onClick={() => setStep(s.n)} style={{
            padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: step === s.n ? 700 : 400,
            background: step === s.n ? "#1B4332" : "#E8E4DC", color: step === s.n ? "#FFF" : "#666",
            borderRadius: s.n === 1 ? "6px 0 0 6px" : s.n === 3 ? "0 6px 6px 0" : 0,
          }}>{s.l}</div>
        ))}
      </div>

      {/* ── STEP 1: JOB DETAILS ── */}
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Shipment Type */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Shipment Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={S.label}>Direction</label>
                <select style={S.select} disabled={!isDraft} value={form.trade_type} onChange={f("trade_type")}>
                  <option value="import">Import</option><option value="export">Export</option><option value="cross_trade">Cross-Trade</option><option value="domestic">Domestic</option>
                </select></div>
              <div><label style={S.label}>Transport Mode</label>
                <select style={S.select} disabled={!isDraft} value={form.transport_mode} onChange={f("transport_mode")}>
                  <option value="ocean_fcl">Ocean FCL</option><option value="ocean_lcl">Ocean LCL</option><option value="air">Air Freight</option>
                  <option value="road_ftl">Road FTL</option><option value="road_ltl">Road LTL / Groupage</option><option value="rail">Rail</option><option value="multimodal">Multimodal</option>
                </select></div>
              <div><label style={S.label}>Service Scope</label>
                <select style={S.select} disabled={!isDraft} value={form.service_scope} onChange={f("service_scope")}>
                  <option value="door_to_door">Door-to-Door</option><option value="port_to_port">Port-to-Port</option><option value="door_to_port">Door-to-Port</option><option value="port_to_door">Port-to-Door</option>
                </select></div>
              <div><label style={S.label}>Incoterm</label>
                <select style={S.select} disabled={!isDraft} value={form.incoterm} onChange={f("incoterm")}>
                  {INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
                </select></div>
            </div>
          </div>

          {/* Routing */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Routing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={S.label}>Origin / Pickup</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.buy_location} onChange={f("buy_location")} placeholder="e.g. Shanghai, China" /></div>
              <div><label style={S.label}>Destination / Delivery</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.sell_location} onChange={f("sell_location")} placeholder="e.g. Felixstowe, UK" /></div>
              <div><label style={S.label}>Port of Loading (POL)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.port_of_loading} onChange={f("port_of_loading")} placeholder="e.g. Shanghai" /></div>
              <div><label style={S.label}>Port of Discharge (POD)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.port_of_discharge} onChange={f("port_of_discharge")} placeholder="e.g. Felixstowe" /></div>
              <div><label style={S.label}>Required ETD</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="date" value={form.required_etd} onChange={f("required_etd")} /></div>
              <div><label style={S.label}>Required ETA</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="date" value={form.required_eta} onChange={f("required_eta")} /></div>
            </div>
          </div>

          {/* Shipper & Consignee */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Shipper & Consignee</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={S.label}>Shipper (Consignor)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.supplier_name} onChange={f("supplier_name")} placeholder="Company shipping the goods" /></div>
              <div><label style={S.label}>Consignee (Receiver)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.customer_name} onChange={f("customer_name")} placeholder="Company receiving the goods" /></div>
              <div><label style={S.label}>Notify Party</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.notify_party} onChange={f("notify_party")} placeholder="Optional notify party" /></div>
              <div><label style={S.label}>Customer Reference</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.customer_ref} onChange={f("customer_ref")} placeholder="PO / booking ref" /></div>
            </div>
          </div>

          {/* Cargo Details */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Cargo Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={S.label}>Commodity Description</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.commodity_desc} onChange={f("commodity_desc")} placeholder="e.g. Electronic components" /></div>
              <div><label style={S.label}>HS Code</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" /></div>
              <div><label style={S.label}>Number of Packages</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" value={form.num_packages} onChange={f("num_packages")} placeholder="e.g. 150" /></div>
              <div><label style={S.label}>Package Type</label>
                <select style={S.select} disabled={!isDraft} value={form.package_type} onChange={f("package_type")}>
                  <option value="cartons">Cartons</option><option value="pallets">Pallets</option><option value="drums">Drums</option>
                  <option value="bags">Bags</option><option value="crates">Crates</option><option value="rolls">Rolls</option>
                  <option value="bundles">Bundles</option><option value="bulk">Bulk (loose)</option><option value="other">Other</option>
                </select></div>
              <div><label style={S.label}>Gross Weight (kg)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" step="0.1" value={form.gross_weight_kg} onChange={f("gross_weight_kg")} placeholder="e.g. 18500" /></div>
              <div><label style={S.label}>Volume (CBM)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" step="0.01" value={form.volume_cbm} onChange={f("volume_cbm")} placeholder="e.g. 28.5" /></div>
              {(form.transport_mode === "ocean_fcl" || form.transport_mode === "multimodal") && (<>
                <div><label style={S.label}>Container Type</label>
                  <select style={S.select} disabled={!isDraft} value={form.container_type} onChange={f("container_type")}>
                    <option value="20GP">20' GP</option><option value="40GP">40' GP</option><option value="40HC">40' HC</option>
                    <option value="20RF">20' Reefer</option><option value="40RF">40' Reefer</option>
                    <option value="20OT">20' Open Top</option><option value="40OT">40' Open Top</option>
                    <option value="20FR">20' Flat Rack</option><option value="40FR">40' Flat Rack</option>
                  </select></div>
                <div><label style={S.label}>Number of Containers</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" min="1" value={form.num_containers} onChange={f("num_containers")} /></div>
              </>)}
            </div>
            {chargeableWeight > 0 && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "#F0F7FF", borderRadius: 6, border: "1px solid #B8D4F0", fontSize: 12 }}>
                <strong>Chargeable weight:</strong> {chargeableWeight.toLocaleString()} kg
                {volWeight !== grossW && <span style={{ color: "#888", marginLeft: 8 }}>(gross: {grossW.toLocaleString()} kg, vol: {volWeight.toLocaleString()} kg)</span>}
              </div>
            )}
          </div>

          {/* Special Requirements */}
          <div style={{ ...S.card, gridColumn: "1 / -1" }}>
            <div style={S.sectionTitle}>Special Requirements & Commercial</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.is_hazardous} onChange={fCheck("is_hazardous")} disabled={!isDraft} /><label style={{ fontSize: 12 }}>Hazardous (DG)</label></div>
              {form.is_hazardous && <div><label style={S.label}>UN Number / Class</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.un_number} onChange={f("un_number")} placeholder="UN1234 / Class 3" /></div>}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.is_temperature_controlled} onChange={fCheck("is_temperature_controlled")} disabled={!isDraft} /><label style={{ fontSize: 12 }}>Temp Controlled</label></div>
              {form.is_temperature_controlled && <div><label style={S.label}>Temp Range</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.temp_range} onChange={f("temp_range")} placeholder="e.g. 2-8°C" /></div>}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.insurance_required} onChange={fCheck("insurance_required")} disabled={!isDraft} /><label style={{ fontSize: 12 }}>Insurance Required</label></div>
              {form.insurance_required && <div><label style={S.label}>Cargo Value ({form.cost_currency})</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" value={form.cargo_value} onChange={f("cargo_value")} placeholder="Declared value" /></div>}
              <div><label style={S.label}>Quote Currency</label>
                <select style={S.select} disabled={!isDraft} value={form.cost_currency} onChange={f("cost_currency")}>
                  <option>USD</option><option>GBP</option><option>EUR</option><option>ZAR</option><option>AED</option><option>CNY</option><option>INR</option>
                </select></div>
              <div><label style={S.label}>Payment Terms</label>
                <select style={S.select} disabled={!isDraft} value={form.customer_payment_terms} onChange={f("customer_payment_terms")}>
                  <option>Net 30</option><option>Net 14</option><option>Net 60</option><option>Prepaid</option><option>Collect</option>
                </select></div>
            </div>
          </div>

          {isNew && !form.supplier_name && (
            <div style={{ gridColumn: "1 / -1", background: "#F0F7FF", border: "1px solid #B8D4F0", borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{"\u2139"} Fill in the shipment details, then click Save Draft</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>After saving, move to Cost Build to enter buy/sell rates and generate the quote.</div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: COST BUILD ── */}
      {step === 2 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Cost Build {"\u2014"} Buy & Sell Rates</div>
            {isDraft && <button style={S.btn(false)} onClick={addCostLine}>+ Add Line</button>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Category</th><th style={S.th}>Description</th><th style={S.th}>Unit</th>
              <th style={{ ...S.th, textAlign: "center", width: 50 }}>Qty</th>
              <th style={{ ...S.th, textAlign: "right" }}>Buy Rate</th><th style={{ ...S.th, textAlign: "right" }}>Sell Rate</th>
              <th style={{ ...S.th, textAlign: "right" }}>Buy Total</th><th style={{ ...S.th, textAlign: "right" }}>Sell Total</th>
              {isDraft && <th style={{ ...S.th, width: 30 }}></th>}
            </tr></thead>
            <tbody>
              {costBuild.map((c) => {
                const bT = (parseFloat(c.buy_rate) || 0) * (parseInt(c.qty) || 1);
                const sT = (parseFloat(c.sell_rate) || 0) * (parseInt(c.qty) || 1);
                const catC = { Freight: "#1565C0", Origin: "#1B7A43", Destination: "#D4A017", Insurance: "#6A1B9A", Customs: "#E65100", Surcharge: "#C62828", Other: "#888" };
                return (
                  <tr key={c.id}>
                    <td style={S.td}>{isDraft ? <select style={{ ...S.select, padding: "4px 6px", fontSize: 12 }} value={c.category} onChange={e => updateCostLine(c.id, "category", e.target.value)}>
                      <option>Freight</option><option>Origin</option><option>Destination</option><option>Insurance</option><option>Customs</option><option>Surcharge</option><option>Other</option>
                    </select> : <span style={S.badge(catC[c.category] || "#888")}>{c.category}</span>}</td>
                    <td style={S.td}>{isDraft ? <input style={{ ...S.input, padding: "4px 8px", fontSize: 12 }} value={c.description} onChange={e => updateCostLine(c.id, "description", e.target.value)} /> : c.description}</td>
                    <td style={{ ...S.td, fontSize: 11 }}>{isDraft ? <select style={{ ...S.select, padding: "4px 6px", fontSize: 11 }} value={c.unit} onChange={e => updateCostLine(c.id, "unit", e.target.value)}>
                      <option value="per container">per cntr</option><option value="per shipment">per shpmt</option><option value="per kg">per kg</option><option value="per cbm">per CBM</option><option value="lump sum">lump sum</option><option value="per bl">per B/L</option>
                    </select> : c.unit}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>{isDraft ? <input style={{ ...S.input, padding: "4px", fontSize: 12, textAlign: "center", width: 50 }} type="number" min="1" value={c.qty} onChange={e => updateCostLine(c.id, "qty", e.target.value)} /> : c.qty}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{isDraft ? <input style={{ ...S.input, padding: "4px 8px", fontSize: 12, textAlign: "right", width: 90 }} type="number" step="0.01" value={c.buy_rate} onChange={e => updateCostLine(c.id, "buy_rate", e.target.value)} placeholder="0.00" /> : <span style={{ fontFamily: "monospace" }}>{parseFloat(c.buy_rate||0).toFixed(2)}</span>}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{isDraft ? <input style={{ ...S.input, padding: "4px 8px", fontSize: 12, textAlign: "right", width: 90 }} type="number" step="0.01" value={c.sell_rate} onChange={e => updateCostLine(c.id, "sell_rate", e.target.value)} placeholder="0.00" /> : <span style={{ fontFamily: "monospace" }}>{parseFloat(c.sell_rate||0).toFixed(2)}</span>}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{bT.toFixed(2)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{sT.toFixed(2)}</td>
                    {isDraft && <td style={S.td}><span onClick={() => removeCostLine(c.id)} style={{ cursor: "pointer", color: "#C62828", fontSize: 14 }}>{"\u00D7"}</span></td>}
                  </tr>
                );
              })}
              <tr style={{ background: "#FAFAF8" }}>
                <td colSpan={6} style={{ ...S.td, fontWeight: 700, textAlign: "right", borderTop: "2px solid #E8E4DC" }}>TOTALS ({form.cost_currency})</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 700, borderTop: "2px solid #E8E4DC" }}>{totalBuy.toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#1B4332", borderTop: "2px solid #E8E4DC" }}>{totalSell.toFixed(2)}</td>
                {isDraft && <td style={{ ...S.td, borderTop: "2px solid #E8E4DC" }}></td>}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── STEP 3: QUOTE SUMMARY ── */}
      {step === 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Profit & Loss</div>
            {[{ l: "Total Sell (Revenue)", v: totalSell, color: "#1B7A43" },
              { l: "Total Buy (Cost)", v: totalBuy, color: "#C62828" },
              { l: "Gross Profit", v: totalSell - totalBuy, bold: true, color: (totalSell - totalBuy) >= 0 ? "#1B7A43" : "#C62828" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: r.bold ? "2px solid #1B4332" : "1px solid #F0EDE6" }}>
                <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 400 }}>{r.l}</span>
                <span style={{ fontFamily: "monospace", fontWeight: r.bold ? 800 : 600, color: r.color }}>{form.cost_currency} {r.v.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...S.card, padding: 20, background: margin >= 10 ? "#F0FFF4" : margin >= 5 ? "#FFFDE7" : "#FFF5F5", border: "1px solid " + (margin >= 10 ? "#C6E6D0" : margin >= 5 ? "#FFD54F" : "#E6C6C6") }}>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Gross Margin</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: margin >= 10 ? "#1B7A43" : margin >= 5 ? "#D4A017" : "#C62828", margin: "4px 0" }}>{margin.toFixed(1)}%</div>
              <div style={{ fontSize: 12, color: "#666" }}>{margin >= 10 ? "\u2713 Healthy margin" : margin >= 5 ? "\u26A0 Thin margin" : "\u2717 Below threshold"}</div>
            </div>
            <div style={S.card}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Shipment Summary</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>
                <div><strong>Route:</strong> {form.buy_location || "\u2014"} {"\u2192"} {form.sell_location || "\u2014"}</div>
                <div><strong>Mode:</strong> {form.transport_mode.replace(/_/g, " ").toUpperCase()}</div>
                <div><strong>Scope:</strong> {form.service_scope.replace(/_/g, " ")}</div>
                <div><strong>Cargo:</strong> {form.commodity_desc || "\u2014"} ({form.num_packages || "\u2014"} {form.package_type})</div>
                <div><strong>Weight:</strong> {form.gross_weight_kg || "\u2014"} kg / {form.volume_cbm || "\u2014"} CBM</div>
                {form.is_hazardous && <div style={{ color: "#C62828" }}><strong>{"\u26A0"} DG:</strong> {form.un_number}</div>}
                {form.is_temperature_controlled && <div style={{ color: "#1565C0" }}><strong>{"\u2744"} Temp:</strong> {form.temp_range}</div>}
              </div>
            </div>
          </div>
          <div style={{ ...S.card, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Cost Breakdown by Category</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {["Freight", "Origin", "Destination", "Other"].map(cat => {
                const lines = cat === "Other" ? costBuild.filter(c => !["Freight","Origin","Destination"].includes(c.category)) : costBuild.filter(c => c.category === cat);
                const cB = lines.reduce((s, c) => s + (parseFloat(c.buy_rate)||0) * (parseInt(c.qty)||1), 0);
                const cS = lines.reduce((s, c) => s + (parseFloat(c.sell_rate)||0) * (parseInt(c.qty)||1), 0);
                const cc = { Freight: "#1565C0", Origin: "#1B7A43", Destination: "#D4A017", Other: "#888" };
                return (
                  <div key={cat} style={{ padding: 12, background: "#FAFAF8", borderRadius: 6, border: "1px solid #E8E4DC" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: cc[cat], textTransform: "uppercase" }}>{cat}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Buy: <span style={{ fontFamily: "monospace" }}>{cB.toFixed(2)}</span></div>
                    <div style={{ fontSize: 11, color: "#666" }}>Sell: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{cS.toFixed(2)}</span></div>
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: (cS-cB) >= 0 ? "#1B7A43" : "#C62828" }}>P/L: {(cS-cB).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────────── */

export default function GTMApp() {
  const [page, setPage] = useState("dashboard");
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("trader");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await loadDeals();
      setLoading(false);
    }
    init();
  }, []);

  const loadDeals = async () => {
    try { const res = await fetch("/api/deals"); if (res.ok) setDeals(await res.json()); } catch (err) { console.error(err); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };
  const openDeal = (deal) => { setCurrentDeal(deal); setPage("precalc"); };
  const newDeal = () => { setCurrentDeal(null); setPage("precalc"); };
  const openJob = (deal) => { setCurrentDeal(deal); setPage("newjob"); };
  const newJob = () => { setCurrentDeal(null); setPage("newjob"); };
  const handleSaved = (saved) => { setCurrentDeal(saved); loadDeals(); };
  const goBack = () => { setCurrentDeal(null); setPage(role === "forwarder" ? "jobs" : "deals"); loadDeals(); };
  const handleRoleChange = (r) => { setRole(r); setCurrentDeal(null); setPage("dashboard"); };

  if (loading) return <div style={S.page}><Loading text="Loading GTM..." /></div>;

  const renderPage = () => {
    if (role === "forwarder") {
      switch (page) {
        case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openJob(d) : setPage(p)} role="forwarder" />;
        case "jobs": return <ForwarderJobsList deals={deals} onOpenJob={openJob} onNewJob={newJob} />;
        case "newjob": return <ForwarderJobScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
        case "customs": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Customs Clearance {"\u2014"} Coming Soon</div></div>;
        case "tracking": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Shipment Tracking {"\u2014"} Coming Soon</div></div>;
        default: return <DashboardView deals={deals} onNav={setPage} role="forwarder" />;
      }
    } else {
      switch (page) {
        case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openDeal(d) : setPage(p)} role="trader" />;
        case "deals": return <DealsList deals={deals} onOpenDeal={openDeal} onNewDeal={newDeal} />;
        case "precalc": return <PreCalcScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
        case "customs": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Customs Intelligence {"\u2014"} Coming Soon</div></div>;
        case "postcalc": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Post-Trade Analytics {"\u2014"} Coming Soon</div></div>;
        default: return <DashboardView deals={deals} onNav={setPage} role="trader" />;
      }
    }
  };

  return (
    <div style={S.page}>
      <Sidebar active={page} onNav={setPage} user={user} onLogout={handleLogout} role={role} onRoleChange={handleRoleChange} />
      <div style={S.main}>{renderPage()}</div>
    </div>
  );
}
