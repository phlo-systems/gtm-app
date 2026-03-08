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
};
const statusColor = { draft: "#888", submitted: "#D4A017", approved: "#1B7A43", rejected: "#C62828" };

function Sidebar({ active, onNav, user, onLogout }) {
  const items = [
    { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
    { key: "deals", icon: "\u25C8", label: "Deals" },
    { key: "precalc", icon: "\u25A3", label: "Pre-Calc" },
    { key: "customs", icon: "\u25C6", label: "Customs" },
    { key: "postcalc", icon: "\u25C9", label: "Post-Calc" },
  ];
  return (
    <div style={S.sidebar}>
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>GTM</div>
        <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "1.5px", marginTop: 2 }}>PHLO SYSTEMS</div>
      </div>
      <div style={{ flex: 1, padding: "12px 0" }}>
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

function DashboardView({ deals, onNav }) {
  const stats = [
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
          <div style={{ fontSize: 14, fontWeight: 700 }}>Recent Deals</div>
          <button style={S.btn(false)} onClick={() => onNav("deals")}>View All</button>
        </div>
        {deals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#AAA" }}>No deals yet. Go to Deals to create your first one.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={S.th}>Deal</th><th style={S.th}>Customer</th><th style={S.th}>Status</th><th style={{ ...S.th, textAlign: "right" }}>Margin</th></tr></thead>
            <tbody>{deals.slice(0, 5).map(d => (
              <tr key={d.id} onClick={() => onNav("precalc", d)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 600, fontSize: 12 }}>{d.deal_number}</td>
                <td style={S.td}>{d.customer?.name || "\u2014"}</td>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Trade Structure</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Trade Type</label><select style={S.select} disabled={!isDraft} value={form.trade_type} onChange={f("trade_type")}><option value="cross_border_direct">Cross-Border (Direct)</option><option value="cross_border_intermediated">Cross-Border (Intermediated)</option><option value="domestic">Domestic</option><option value="transit_reexport">Transit / Re-Export</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Transport</label><select style={S.select} disabled={!isDraft} value={form.transport_mode} onChange={f("transport_mode")}><option value="ocean">Ocean</option><option value="road">Road</option><option value="air">Air</option></select></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Supplier / Origin</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Supplier</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.supplier_name} onChange={f("supplier_name")} placeholder="Supplier name" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Buy Incoterm</label><select style={S.select} disabled={!isDraft} value={form.buy_incoterm} onChange={f("buy_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Location</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.buy_location} onChange={f("buy_location")} placeholder="e.g. Mumbai" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Unit Price ({form.cost_currency})</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.unit_price} onChange={f("unit_price")} type="number" step="0.01" placeholder="0.00" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>HS Code</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" /></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer / Destination</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Customer</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.customer_name} onChange={f("customer_name")} placeholder="Customer name" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Sell Incoterm</label><select style={S.select} disabled={!isDraft} value={form.sell_incoterm} onChange={f("sell_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Location</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.sell_location} onChange={f("sell_location")} placeholder="e.g. Durban" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Currency</label><select style={S.select} disabled={!isDraft} value={form.cost_currency} onChange={f("cost_currency")}><option>USD</option><option>ZAR</option><option>GBP</option><option>EUR</option><option>AED</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Payment Terms</label><select style={S.select} disabled={!isDraft} value={form.customer_payment_terms} onChange={f("customer_payment_terms")}><option>Net 60</option><option>Net 30</option><option>LC at Sight</option></select></div>
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

export default function GTMApp() {
  const [page, setPage] = useState("dashboard");
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    try {
      const res = await fetch("/api/deals");
      if (res.ok) setDeals(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };
  const openDeal = (deal) => { setCurrentDeal(deal); setPage("precalc"); };
  const newDeal = () => { setCurrentDeal(null); setPage("precalc"); };
  const handleSaved = (saved) => { setCurrentDeal(saved); loadDeals(); };
  const goBack = () => { setCurrentDeal(null); setPage("deals"); loadDeals(); };

  if (loading) return <div style={S.page}><Loading text="Loading GTM..." /></div>;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openDeal(d) : setPage(p)} />;
      case "deals": return <DealsList deals={deals} onOpenDeal={openDeal} onNewDeal={newDeal} />;
      case "precalc": return <PreCalcScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
      case "customs": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Customs Intelligence - Coming Soon</div></div>;
      case "postcalc": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Post-Trade Analytics - Coming Soon</div></div>;
      default: return <DashboardView deals={deals} onNav={setPage} />;
    }
  };

  return (
    <div style={S.page}>
      <Sidebar active={page} onNav={setPage} user={user} onLogout={handleLogout} />
      <div style={S.main}>{renderPage()}</div>
    </div>
  );
}
