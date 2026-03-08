'use client'
import { useState } from "react";

// --- MOCK DATA ---
const mockDeals = [
  { id: "GTM-2026-001", customer: "Shoprite Holdings", supplier: "ABC Foods India", product: "Basmati Rice 5kg", status: "Approved", margin: 14.2, value: 109070, buyInco: "FOB Mumbai", sellInco: "CIF Durban", date: "2026-03-05", erpPushed: true },
  { id: "GTM-2026-002", customer: "Tesco UK", supplier: "Mekong Delta Co.", product: "Jasmine Rice 1kg", status: "Draft", margin: 0, value: 0, buyInco: "EXW HCMC", sellInco: "DDP London", date: "2026-03-07", erpPushed: false },
  { id: "GTM-2026-003", customer: "Woolworths SA", supplier: "Sunrise Mills", product: "Sunflower Oil 2L", status: "Submitted", margin: 11.8, value: 85400, buyInco: "FCA Factory", sellInco: "CIF Cape Town", date: "2026-03-06", erpPushed: false },
  { id: "GTM-2026-004", customer: "Carrefour UAE", supplier: "Thai Union Group", product: "Canned Tuna 185g", status: "Approved", margin: 16.5, value: 142300, buyInco: "FOB Bangkok", sellInco: "CIF Jebel Ali", date: "2026-02-28", erpPushed: true },
  { id: "GTM-2026-005", customer: "Pick n Pay", supplier: "Olam Intl", product: "Cashew Nuts 500g", status: "Rejected", margin: 3.1, value: 67200, buyInco: "FOB Mombasa", sellInco: "CIF Durban", date: "2026-03-01", erpPushed: false },
];

const costMatrix = [
  { cat: "A", line: "Supplier Quote (FOB Mumbai)", type: "Base", amount: 98400, perCase: 984, resp: "Supplier" },
  { cat: "B", line: "Origin Inland Transport", type: "Incoterm Gap", amount: 1200, perCase: 12, resp: "Trader" },
  { cat: "B", line: "Export Clearance & Docs", type: "Incoterm Gap", amount: 800, perCase: 8, resp: "Trader" },
  { cat: "B", line: "Origin Terminal Handling", type: "Incoterm Gap", amount: 950, perCase: 9.5, resp: "Trader" },
  { cat: "B", line: "Ocean Freight (FOB\u2192CIF)", type: "Incoterm Gap", amount: 3400, perCase: 34, resp: "Trader" },
  { cat: "B", line: "Marine Insurance", type: "Incoterm Gap", amount: 120, perCase: 1.2, resp: "Trader" },
  { cat: "C", line: "Finance Charge (12%)", type: "Business Charge", amount: 1500, perCase: 15, resp: "Trader" },
  { cat: "C", line: "Handling Fee", type: "Business Charge", amount: 300, perCase: 3, resp: "Trader" },
  { cat: "C", line: "Risk Buffer (2%)", type: "Business Charge", amount: 800, perCase: 8, resp: "Trader" },
  { cat: "C", line: "Management Fee (5%)", type: "Business Charge", amount: 1200, perCase: 12, resp: "Trader" },
  { cat: "C", line: "Under/Over Recovery (1%)", type: "Business Charge", amount: 400, perCase: 4, resp: "Trader" },
];

const S = {
  page: { fontFamily: "'Segoe UI', -apple-system, sans-serif", background: "#F8F7F4", minHeight: "100vh", color: "#1A1A1A" },
  sidebar: { width: 220, background: "#1B4332", color: "#FFF", position: "fixed", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", zIndex: 10 },
  main: { marginLeft: 220, padding: "24px 32px" },
  card: { background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 20, marginBottom: 16 },
  badge: (color) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + "18", color }),
  input: { width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#FAFAF8" },
  select: { width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", background: "#FAFAF8" },
  btn: (primary) => ({ padding: "8px 20px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: primary ? "#1B4332" : "#E8E4DC", color: primary ? "#FFF" : "#1A1A1A", transition: "all 0.15s" }),
  btnXero: { padding: "8px 20px", borderRadius: 6, border: "2px solid #13B5EA", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#FFF", color: "#13B5EA", display: "flex", alignItems: "center", gap: 6 },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#888", borderBottom: "2px solid #E8E4DC" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #F0EDE6" },
};

const statusColor = { Draft: "#888", Submitted: "#D4A017", Approved: "#1B7A43", Rejected: "#C62828" };

function Sidebar({ active, onNav }) {
  const items = [
    { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
    { key: "deals", icon: "\u25C8", label: "Deals" },
    { key: "precalc", icon: "\u25A3", label: "Pre-Calc" },
    { key: "customs", icon: "\u25C6", label: "Customs" },
    { key: "postcalc", icon: "\u25C9", label: "Post-Calc" },
    { key: "erp", icon: "\u21C4", label: "ERP Sync" },
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
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, opacity: 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: "#13B5EA" }} />Connected: Xero</div>
        <div style={{ marginTop: 4 }}>Tenant: Demo Trading Co</div>
      </div>
    </div>
  );
}

function Dashboard({ onNav }) {
  const stats = [
    { label: "Active Deals", value: "12", sub: "3 pending approval", color: "#1B4332" },
    { label: "Avg Margin", value: "13.4%", sub: "+1.2% vs last month", color: "#1B7A43" },
    { label: "Pipeline Value", value: "$1.2M", sub: "8 deals in progress", color: "#1B4332" },
    { label: "Pushed to Xero", value: "7", sub: "5 quotes, 7 POs", color: "#13B5EA" },
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent Deals</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={S.th}>Deal</th><th style={S.th}>Customer</th><th style={S.th}>Status</th><th style={S.th}>ERP</th><th style={{ ...S.th, textAlign: "right" }}>Margin</th></tr></thead>
            <tbody>
              {mockDeals.slice(0, 4).map((d) => (
                <tr key={d.id} onClick={() => onNav("precalc")} style={{ cursor: "pointer" }}>
                  <td style={{ ...S.td, fontWeight: 600, fontSize: 12 }}>{d.id}</td>
                  <td style={S.td}>{d.customer}</td>
                  <td style={S.td}><span style={S.badge(statusColor[d.status])}>{d.status}</span></td>
                  <td style={S.td}>{d.erpPushed ? <span style={{ fontSize: 11, color: "#13B5EA" }}>\u2713 Xero</span> : <span style={{ fontSize: 11, color: "#CCC" }}>\u2014</span>}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{d.margin > 0 ? d.margin + "%" : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>ERP Push Summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {[
              { label: "Sales Quotes Created in Xero", count: 5, total: 7 },
              { label: "Purchase Orders Created in Xero", count: 7, total: 7 },
              { label: "Post-Trade Journals Posted", count: 3, total: 5 },
            ].map((r, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#666" }}>{r.label}</span>
                  <span style={{ fontWeight: 700 }}>{r.count}/{r.total}</span>
                </div>
                <div style={{ height: 6, background: "#F0EDE6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(r.count / r.total) * 100}%`, background: "#13B5EA", borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealsList({ onOpenDeal }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Deals</h2>
        <button style={S.btn(true)}>+ New Deal</button>
      </div>
      <div style={S.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>Deal ID</th><th style={S.th}>Customer</th><th style={S.th}>Supplier</th>
            <th style={S.th}>Incoterms</th><th style={S.th}>Status</th><th style={S.th}>ERP</th><th style={{ ...S.th, textAlign: "right" }}>Margin</th>
          </tr></thead>
          <tbody>
            {mockDeals.map((d) => (
              <tr key={d.id} onClick={() => onOpenDeal(d.id)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 700, color: "#1B4332" }}>{d.id}</td>
                <td style={S.td}>{d.customer}</td>
                <td style={S.td}>{d.supplier}</td>
                <td style={{ ...S.td, fontSize: 11 }}><span style={{ color: "#1B7A43" }}>{d.buyInco}</span> \u2192 <span style={{ color: "#C62828" }}>{d.sellInco}</span></td>
                <td style={S.td}><span style={S.badge(statusColor[d.status])}>{d.status}</span></td>
                <td style={S.td}>{d.erpPushed ? <span style={{ fontSize: 11, color: "#13B5EA", fontWeight: 600 }}>\u2713 POs in Xero</span> : <span style={{ fontSize: 11, color: "#CCC" }}>\u2014</span>}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: d.margin < 8 ? "#C62828" : "#1B7A43" }}>{d.margin > 0 ? d.margin + "%" : "\u2014"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreCalcScreen() {
  const [step, setStep] = useState(1);
  const [showErpModal, setShowErpModal] = useState(false);
  const [erpPushed, setErpPushed] = useState(false);
  const total = costMatrix.reduce((s, c) => s + c.amount, 0);
  const margin = ((total - 98400) / total * 100).toFixed(1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Pre-Calc: GTM-2026-001</h2>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Shoprite Holdings \u2014 Basmati Rice 5kg \u2014 FOB Mumbai \u2192 CIF Durban</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {step < 4 && <button style={S.btn(false)}>Save Draft</button>}
          {step < 4 && <button style={S.btn(true)} onClick={() => setStep(4)}>Submit for Approval</button>}
          {step === 4 && !erpPushed && (
            <button style={S.btnXero} onClick={() => setShowErpModal(true)}>
              <span style={{ fontSize: 16 }}>\u21C4</span> Create in Xero
            </button>
          )}
          {erpPushed && (
            <span style={{ fontSize: 12, color: "#13B5EA", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              \u2713 Created in Xero
            </span>
          )}
        </div>
      </div>

      {/* Step Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[{ n: 1, label: "Deal Sheet" }, { n: 2, label: "Cost Matrix" }, { n: 3, label: "Feasibility" }, { n: 4, label: "Approval" }, { n: 5, label: "ERP Handoff" }].map((s) => (
          <div key={s.n} onClick={() => setStep(s.n)} style={{
            padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: step === s.n ? 700 : 400,
            background: step === s.n ? (s.n === 5 ? "#13B5EA" : "#1B4332") : "#E8E4DC", color: step === s.n ? "#FFF" : "#666",
            borderRadius: s.n === 1 ? "6px 0 0 6px" : s.n === 5 ? "0 6px 6px 0" : 0,
          }}>
            {s.n === 5 ? "\u21C4 " : ""}{s.label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Trade Structure</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Trade Type</label><select style={S.select}><option>Cross-Border (Direct)</option><option>Cross-Border (Intermediated)</option><option>Domestic</option><option>Transit / Re-Export</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Mode of Transport</label><select style={S.select}><option>Ocean</option><option>Road</option><option>Air</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Your Role</label><select style={S.select}><option>Trader / Trading House</option><option>Buyer</option><option>Seller</option><option>Commission Agent</option><option>Freight Forwarder</option></select></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Supplier / Origin</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Supplier</label><input style={S.input} defaultValue="ABC Foods India" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Buy Incoterm</label><select style={S.select}><option>FOB Mumbai</option><option>EXW Factory</option><option>FCA Factory</option><option>CIF</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Unit Price (USD)</label><input style={S.input} defaultValue="9.84" type="number" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>HS Code</label><input style={S.input} defaultValue="1006.30.10" /></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer / Destination</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Customer</label><input style={S.input} defaultValue="Shoprite Holdings" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Sell Incoterm</label><select style={S.select}><option>CIF Durban</option><option>DDP Durban</option><option>DAP Warehouse</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Currency</label><select style={S.select}><option>USD</option><option>ZAR</option><option>GBP</option><option>EUR</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Payment Terms</label><select style={S.select}><option>Net 60</option><option>Net 30</option><option>LC at Sight</option></select></div>
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1", background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 8, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>\u26A0</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Incoterm Responsibility Gap Detected</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>FOB Mumbai \u2192 CIF Durban: You must cover ocean freight, marine insurance, origin terminal handling, and export clearance. These cost lines have been activated in the Cost Matrix.</div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Cost Matrix (per container)</div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#888" }}>Total COS</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1B4332" }}>${total.toLocaleString()}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#888" }}>Gross Margin</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1B7A43" }}>{margin}%</div></div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ ...S.th, width: 40 }}>Blk</th><th style={S.th}>Cost Line</th><th style={S.th}>Type</th><th style={{ ...S.th, textAlign: "right" }}>Per Container</th><th style={{ ...S.th, textAlign: "right" }}>Per Case</th><th style={S.th}>Responsibility</th></tr></thead>
            <tbody>
              {costMatrix.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontWeight: 700, color: c.cat === "A" ? "#1B7A43" : c.cat === "B" ? "#D4A017" : "#6B2D5B" }}>{c.cat}</td>
                  <td style={{ ...S.td, fontWeight: c.cat === "A" ? 700 : 400 }}>{c.line}</td>
                  <td style={S.td}><span style={S.badge(c.type === "Base" ? "#1B7A43" : c.type === "Incoterm Gap" ? "#D4A017" : "#6B2D5B")}>{c.type}</span></td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${c.amount.toLocaleString()}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: "#888" }}>${c.perCase}</td>
                  <td style={S.td}>{c.resp}</td>
                </tr>
              ))}
              <tr style={{ background: "#1B433210" }}>
                <td style={{ ...S.td, fontWeight: 800 }} colSpan={3}>TOTAL (CIF Quote to Customer)</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 15 }}>${total.toLocaleString()}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>${(total / 100).toFixed(1)}</td>
                <td style={S.td}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Customer Feasibility</div>
            {[
              { label: "CIF Price (per container)", value: "$109,070" },
              { label: "Import Duty (0% \u2014 Basmati)", value: "$0" },
              { label: "VAT (15%)", value: "$16,361" },
              { label: "Landed Cost (incl VAT)", value: "$125,431" },
              { label: "Required Selling Price", value: "$135,465" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? "1px solid #F0EDE6" : "none" }}>
                <span style={{ fontSize: 13, color: i === 4 ? "#1A1A1A" : "#666", fontWeight: i === 4 ? 700 : 400 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: i === 4 ? 800 : 600, color: i === 4 ? "#1B4332" : "#1A1A1A" }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Margin Breakdown</div>
            <div style={{ display: "flex", gap: 0, height: 32, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ flex: 90.2, background: "#1B4332" }} /><div style={{ flex: 5.9, background: "#D4A017" }} /><div style={{ flex: 3.9, background: "#6B2D5B" }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[{ label: "Supplier", pct: "90.2%", color: "#1B4332" }, { label: "Incoterm Gap", pct: "5.9%", color: "#D4A017" }, { label: "Business Charges", pct: "3.9%", color: "#6B2D5B" }].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} /><span style={{ fontSize: 11, color: "#888" }}>{s.label}: {s.pct}</span></div>
              ))}
            </div>
            <div style={{ padding: 12, background: "#F0FFF4", borderRadius: 6, border: "1px solid #C6E6D0" }}>
              <div style={{ fontSize: 11, color: "#1B7A43", fontWeight: 600 }}>MARGIN CHECK PASSED</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Gross margin ({margin}%) exceeds minimum threshold (8%).</div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ ...S.card, maxWidth: 600 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Approval Status</div>
          {[
            { step: "Deal Sheet Complete", status: "done", by: "Demo User", time: "Mar 5, 10:22 AM" },
            { step: "Cost Matrix Generated", status: "done", by: "System", time: "Mar 5, 10:23 AM" },
            { step: "Submitted for Approval", status: "done", by: "Demo User", time: "Mar 5, 10:45 AM" },
            { step: "Approved \u2014 Values Locked", status: "done", by: "Finance Approver", time: "Mar 5, 11:30 AM" },
            { step: erpPushed ? "Created in Xero" : "Ready to push to ERP", status: erpPushed ? "done" : "current", by: erpPushed ? "Via API" : "Click Create in Xero above", time: erpPushed ? "Mar 5, 11:32 AM" : "" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "start", marginBottom: 16 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: s.status === "done" ? "#1B7A43" : s.status === "current" ? "#13B5EA" : "#E8E4DC",
                color: s.status === "pending" ? "#888" : "#FFF", fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {s.status === "done" ? "\u2713" : s.status === "current" ? "\u21C4" : i + 1}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.status === "pending" ? "#AAA" : "#1A1A1A" }}>{s.step}</div>
                {s.by && <div style={{ fontSize: 11, color: "#888" }}>{s.by}{s.time ? ` \u2014 ${s.time}` : ""}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 5 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Sales Side PO */}
            <div style={{ ...S.card, borderTop: "4px solid #1B7A43" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1B7A43", textTransform: "uppercase", letterSpacing: "1px" }}>Sales Side</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Quote / Sales Order</div>
                </div>
                <span style={erpPushed ? S.badge("#13B5EA") : S.badge("#888")}>{erpPushed ? "\u2713 In Xero (DRAFT)" : "Not yet pushed"}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Customer", "Shoprite Holdings"],
                    ["Product", "Basmati Rice 5kg"],
                    ["Selling Price", "$109,070 per container"],
                    ["Quantity", "10 containers"],
                    ["Currency", "USD"],
                    ["Sell Incoterm", "CIF Durban"],
                    ["Payment Terms", "Net 60"],
                    ["GTM Deal ID", "GTM-2026-001"],
                    ["FX Rate (locked)", "1.00 (USD/USD)"],
                  ].map(([k, v], i) => (
                    <tr key={i}>
                      <td style={{ ...S.td, fontWeight: 600, color: "#888", fontSize: 12, width: 140 }}>{k}</td>
                      <td style={{ ...S.td, fontWeight: i === 2 ? 700 : 400, color: i === 2 ? "#1B4332" : "#1A1A1A" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: 11, color: "#888", fontStyle: "italic" }}>Xero: Created as Quote (DRAFT) \u2014 you send to customer when ready</div>
            </div>

            {/* Purchase Side PO */}
            <div style={{ ...S.card, borderTop: "4px solid #C62828" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#C62828", textTransform: "uppercase", letterSpacing: "1px" }}>Purchase Side</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Purchase Order</div>
                </div>
                <span style={erpPushed ? S.badge("#13B5EA") : S.badge("#888")}>{erpPushed ? "\u2713 In Xero (DRAFT)" : "Not yet pushed"}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Supplier", "ABC Foods India"],
                    ["Product", "Basmati Rice 5kg"],
                    ["Buying Price", "$98,400 per container"],
                    ["Quantity", "10 containers"],
                    ["Currency", "USD"],
                    ["Buy Incoterm", "FOB Mumbai"],
                    ["Payment Terms", "30% advance, 70% against docs"],
                    ["GTM Deal ID", "GTM-2026-001"],
                  ].map(([k, v], i) => (
                    <tr key={i}>
                      <td style={{ ...S.td, fontWeight: 600, color: "#888", fontSize: 12, width: 140 }}>{k}</td>
                      <td style={{ ...S.td, fontWeight: i === 2 ? 700 : 400, color: i === 2 ? "#C62828" : "#1A1A1A" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: 11, color: "#888", fontStyle: "italic" }}>Xero: Created as Purchase Order (DRAFT) \u2014 you send to supplier when ready</div>
            </div>
          </div>

          {/* What stays in GTM */}
          <div style={{ ...S.card, background: "#FAFAF8", borderStyle: "dashed" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Stays in GTM (not pushed to ERP)</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {["Full cost matrix", "Incoterm gap analysis", "Estimated freight & insurance", "Business charge breakdown", "Margin calculation", "Approval audit trail", "Customs duty research"].map((item, i) => (
                <span key={i} style={{ fontSize: 11, color: "#AAA", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: "#DDD" }}>\u25CB</span> {item}
                </span>
              ))}
            </div>
          </div>

          {!erpPushed && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button style={{ ...S.btnXero, display: "inline-flex", padding: "12px 32px", fontSize: 15 }} onClick={() => { setErpPushed(true); setShowErpModal(true); }}>
                <span style={{ fontSize: 18 }}>\u21C4</span> Create in Xero
              </button>
              <div style={{ fontSize: 11, color: "#AAA", marginTop: 8 }}>Creates both documents as drafts. You retain full control in Xero.</div>
            </div>
          )}
        </div>
      )}

      {/* ERP Push Modal */}
      {showErpModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowErpModal(false)}>
          <div style={{ background: "#FFF", borderRadius: 12, padding: 28, maxWidth: 480, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            {!erpPushed ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Create in Xero?</div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>This will create two draft documents in your connected Xero organisation:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: 12, background: "#F0FFF4", borderRadius: 6, border: "1px solid #C6E6D0" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Sales Quote (DRAFT)</div>
                    <div style={{ fontSize: 12, color: "#666" }}>To: Shoprite Holdings \u2014 $109,070/container \u2014 CIF Durban</div>
                  </div>
                  <div style={{ padding: 12, background: "#FFF5F5", borderRadius: 6, border: "1px solid #E6C6C6" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Purchase Order (DRAFT)</div>
                    <div style={{ fontSize: 12, color: "#666" }}>To: ABC Foods India \u2014 $98,400/container \u2014 FOB Mumbai</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 20 }}>Both documents will be tagged with GTM Deal ID: GTM-2026-001. You can review, adjust, and send them from within Xero.</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button style={S.btn(false)} onClick={() => setShowErpModal(false)}>Cancel</button>
                  <button style={{ ...S.btnXero, background: "#13B5EA", color: "#FFF" }} onClick={() => { setErpPushed(true); }}>Create in Xero</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>\u2713</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1B7A43", marginBottom: 8 }}>Created in Xero</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Both documents are now in your Xero account as drafts.</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <div style={{ padding: "8px 16px", background: "#F0FFF4", borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>Quote QU-0142</div><div style={{ color: "#888", fontSize: 11 }}>DRAFT</div>
                    </div>
                    <div style={{ padding: "8px 16px", background: "#FFF5F5", borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>PO-0089</div><div style={{ color: "#888", fontSize: 11 }}>DRAFT</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                  <button style={S.btn(false)} onClick={() => setShowErpModal(false)}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomsScreen() {
  const [query, setQuery] = useState("Basmati rice");
  const hsResults = [
    { code: "1006.30.10", desc: "Semi-milled or wholly milled rice: Basmati", duty: "0%", pref: "0% (UK-India CEPA)", vat: "0%" },
    { code: "1006.30.90", desc: "Semi-milled or wholly milled rice: Other", duty: "5%", pref: "2.5% (SADC)", vat: "15%" },
    { code: "1006.40.00", desc: "Broken rice", duty: "10%", pref: "5% (GSP)", vat: "15%" },
  ];
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Customs Intelligence</h2>
      <div style={{ ...S.card, display: "flex", gap: 12, alignItems: "center" }}>
        <select style={{ ...S.select, width: 180 }}><option>South Africa</option><option>United Kingdom</option><option>UAE</option><option>Australia</option></select>
        <input style={{ ...S.input, flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by keyword, HS code, or description..." />
        <button style={S.btn(true)}>Search</button>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>3 results for "{query}" in South Africa</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>HS Code</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Duty</th><th style={{ ...S.th, textAlign: "right" }}>Preferential</th><th style={{ ...S.th, textAlign: "right" }}>VAT</th></tr></thead>
          <tbody>
            {hsResults.map((r, i) => (
              <tr key={i}><td style={{ ...S.td, fontWeight: 700, color: "#1B4332", fontFamily: "monospace" }}>{r.code}</td><td style={S.td}>{r.desc}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{r.duty}</td><td style={{ ...S.td, textAlign: "right", fontSize: 12, color: "#1B7A43" }}>{r.pref}</td><td style={{ ...S.td, textAlign: "right" }}>{r.vat}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PostCalcScreen() {
  const variance = [
    { line: "Supplier Cost", estimated: 98400, actual: 98400, var: 0 },
    { line: "Ocean Freight", estimated: 3400, actual: 3850, var: 450 },
    { line: "Marine Insurance", estimated: 120, actual: 115, var: -5 },
    { line: "Finance Charge", estimated: 1500, actual: 1620, var: 120 },
    { line: "Management Fee", estimated: 1200, actual: 1200, var: 0 },
    { line: "FX Impact", estimated: 0, actual: 380, var: 380 },
  ];
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Post-Trade: GTM-2026-001</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Estimated Margin", value: "14.2%", color: "#1B7A43" },
          { label: "Actual Margin", value: "12.8%", color: "#D4A017" },
          { label: "Variance", value: "-1.4%", color: "#C62828" },
          { label: "Actuals Source", value: "Xero", color: "#13B5EA" },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, padding: 14 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Cost Variance (Estimated vs Actual)</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>Cost Line</th><th style={{ ...S.th, textAlign: "right" }}>Estimated</th><th style={{ ...S.th, textAlign: "right" }}>Actual</th><th style={{ ...S.th, textAlign: "right" }}>Variance</th></tr></thead>
          <tbody>
            {variance.map((v, i) => (
              <tr key={i}><td style={S.td}>{v.line}</td><td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${v.estimated.toLocaleString()}</td><td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${v.actual.toLocaleString()}</td><td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: v.var > 0 ? "#C62828" : v.var < 0 ? "#1B7A43" : "#888" }}>{v.var === 0 ? "\u2014" : (v.var > 0 ? "+" : "") + "$" + Math.abs(v.var).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, fontSize: 11, color: "#888" }}>Actuals pulled from Xero invoices matching GTM Deal ID: GTM-2026-001. Freight variance driven by bunker surcharge increase.</div>
      </div>
    </div>
  );
}

function ErpSyncScreen() {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>ERP Sync</h2>
      <div style={{ ...S.card, display: "flex", gap: 16, alignItems: "center", borderLeft: "4px solid #13B5EA" }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#13B5EA18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#13B5EA" }}>\u21C4</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Connected to Xero</div>
          <div style={{ fontSize: 12, color: "#888" }}>Demo Trading Co Ltd \u2014 Last sync: 2 minutes ago</div>
        </div>
        <button style={S.btn(false)}>Sync Now</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Reference Data (Xero \u2192 GTM)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Customers", "87 synced", "Real-time + daily"],
                ["Suppliers", "55 synced", "Real-time + daily"],
                ["Products", "142 synced", "Daily"],
                ["Tax Rates", "12 synced", "Weekly"],
                ["FX Rates", "Updated today", "Daily (Open Exchange)"],
              ].map(([entity, count, freq], i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{entity}</td>
                  <td style={{ ...S.td, color: "#1B7A43" }}>{count}</td>
                  <td style={{ ...S.td, color: "#888", fontSize: 11 }}>{freq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Documents Pushed (GTM \u2192 Xero)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Sales Quotes", "5 created", "On deal approval"],
                ["Purchase Orders", "7 created", "On deal approval"],
                ["Commission Journals", "3 posted", "On post-trade close"],
                ["Business Charge Journals", "3 posted", "On post-trade close"],
              ].map(([doc, count, trigger], i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{doc}</td>
                  <td style={{ ...S.td, color: "#13B5EA" }}>{count}</td>
                  <td style={{ ...S.td, color: "#888", fontSize: 11 }}>{trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Integration Principle</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { title: "On Deal Approval", desc: "Draft Sales Quote + Draft Purchase Order created in Xero. On-demand, not automatic. You retain full control.", color: "#1B7A43" },
            { title: "Actuals from Xero", desc: "Invoices and payments flow back to GTM via webhooks for post-trade variance analysis. No manual re-entry.", color: "#13B5EA" },
            { title: "On Deal Closure", desc: "Commission and business charge journals posted as confirmed entries. Only real numbers touch the GL.", color: "#6B2D5B" },
          ].map((p, i) => (
            <div key={i} style={{ padding: 14, background: "#FAFAF8", borderRadius: 6, borderLeft: `3px solid ${p.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GTMApp() {
  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNav={setPage} />;
      case "deals": return <DealsList onOpenDeal={() => setPage("precalc")} />;
      case "precalc": return <PreCalcScreen />;
      case "customs": return <CustomsScreen />;
      case "postcalc": return <PostCalcScreen />;
      case "erp": return <ErpSyncScreen />;
      default: return <Dashboard onNav={setPage} />;
    }
  };

  return (
    <div style={S.page}>
      <Sidebar active={page} onNav={setPage} />
      <div style={S.main}>{renderPage()}</div>
    </div>
  );
}
