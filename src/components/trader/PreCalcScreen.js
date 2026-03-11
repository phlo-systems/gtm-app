/**
 * TRADER: PRE-CALC SCREEN
 * 
 * Three-step deal workflow for physical commodity traders:
 *   Step 1 - Deal Sheet: trade structure, supplier/origin, customer/destination
 *   Step 2 - Cost Matrix: auto-generated from Incoterm Gap Engine
 *   Step 3 - Feasibility: margin analysis and go/no-go decision
 * 
 * Props:
 *   deal   - existing deal object (null for new deal)
 *   onBack - callback to return to deals list
 *   onSaved - callback(savedDeal) after successful save
 */
'use client'

import { useState, useEffect } from 'react';
import { S, statusColor } from '@/components/shared/styles';
import { calculateIncotermGap, INCOTERMS_2020 } from '@/lib/incoterms';
import VoyageSearch from './VoyageSearch';
import FuturesPricingWidget from '@/components/trader/FuturesPricingWidget';
import DealExtendedFields from '@/components/trader/DealExtendedFields';
import DealLifecyclePanel from '@/components/trader/DealLifecyclePanel';

export default function PreCalcScreen({ deal, onBack, onSaved }) {
  const isNew = !deal;
  const isDraft = isNew || deal?.status === "draft";
  const [saving, setSaving] = useState(false);
  const [costMatrix, setCostMatrix] = useState(null);
  const [step, setStep] = useState(1);
  const [appliedVoyage, setAppliedVoyage] = useState(null);
  const [customsResult, setCustomsResult] = useState(null);
  const [customsLoading, setCustomsLoading] = useState(false);
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
    extended: deal?.extended || {},
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

  const handleVoyageApply = ({ costs, voyage }) => {
    if (!costMatrix) return;
    const nonBLines = (costMatrix.cost_lines || []).filter(l => l.block !== "B");
    const newBLines = costs.map((c, i) => ({
      ...c, sort_order: 100 + i, responsibility: "trader", is_active: true, currency: form.cost_currency,
    }));
    const allLines = [...nonBLines, ...newBLines];
    const newTotal = allLines.reduce((s, l) => s + (l.amount || 0), 0);
    setCostMatrix({
      ...costMatrix, cost_lines: allLines, total_cost: newTotal,
      gross_margin_pct: costMatrix.selling_price > 0 ? ((costMatrix.selling_price - newTotal) / costMatrix.selling_price) * 100 : 0,
    });
    setAppliedVoyage(voyage);
  };

  const fetchCustomsEstimate = async (importCountry) => {
    if (!importCountry) return;
    setCustomsLoading(true);
    try {
      const cargoValue = (parseFloat(form.unit_price) || 0) * (deal?.quantity || 1);
      const res = await fetch("/api/customs-estimate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: deal?.product?.name || "", hs_code: form.hs_code, origin_country: "", import_country: importCountry, cargo_value: cargoValue || 10000, sell_incoterm: form.sell_incoterm }),
      });
      const data = await res.json();
      setCustomsResult(data);
    } catch (err) { console.error(err); }
    setCustomsLoading(false);
  };

  const handleCustomsApply = () => {
    if (!costMatrix || !customsResult?.cost_lines) return;
    const nonDLines = (costMatrix.cost_lines || []).filter(l => l.source !== "customs");
    const newDLines = customsResult.cost_lines.map((c, i) => ({
      ...c, sort_order: 300 + i, responsibility: "trader", is_active: true, currency: form.cost_currency,
    }));
    const allLines = [...nonDLines, ...newDLines];
    const newTotal = allLines.reduce((s, l) => s + (l.amount || 0), 0);
    setCostMatrix({ ...costMatrix, cost_lines: allLines, total_cost: newTotal });
  };

  const inputStyle = (editable) => ({ ...S.input, background: editable ? "#FFF" : "#F0EDE6" });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>{"\u2190"}</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isNew ? "New Deal" : deal.deal_number}</h2>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {form.customer_name || "Customer"} {"\u2014"} {form.buy_incoterm} {"\u2192"} {form.sell_incoterm}
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

      {/* Step Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[{ n: 1, l: "Deal Sheet" }, { n: 2, l: "Cost Matrix" }, { n: 3, l: "Feasibility" }].map(s => (
          <div key={s.n} onClick={() => setStep(s.n)} style={{
            padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: step === s.n ? 700 : 400,
            background: step === s.n ? "#1B4332" : "#E8E4DC", color: step === s.n ? "#FFF" : "#666",
            borderRadius: s.n === 1 ? "6px 0 0 6px" : s.n === 3 ? "0 6px 6px 0" : 0,
          }}>{s.l}</div>
        ))}
      </div>

      {/* Step 1: Deal Sheet */}
      {step === 1 && (
        <div>
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
              <div><label style={S.label}>Supplier</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.supplier_name} onChange={f("supplier_name")} placeholder="Supplier name" /></div>
              <div><label style={S.label}>Buy Incoterm</label><select style={S.select} disabled={!isDraft} value={form.buy_incoterm} onChange={f("buy_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={S.label}>Location</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.buy_location} onChange={f("buy_location")} placeholder="e.g. Mumbai" /></div>
              <div><label style={S.label}>Unit Price ({form.cost_currency})</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.unit_price} onChange={f("unit_price")} type="number" step="0.01" placeholder="0.00" /></div>
              <div><label style={S.label}>HS Code</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" /></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Customer / Destination</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={S.label}>Customer</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.customer_name} onChange={f("customer_name")} placeholder="Customer name" /></div>
              <div><label style={S.label}>Sell Incoterm</label><select style={S.select} disabled={!isDraft} value={form.sell_incoterm} onChange={f("sell_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={S.label}>Location</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.sell_location} onChange={f("sell_location")} placeholder="e.g. Durban" /></div>
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

          {/* Futures Pricing Widget */}
          <div style={{ background: "#F5F7F0", borderRadius: 12, padding: 20, border: "1px solid #D4DBC8", marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pricing</div>
            <FuturesPricingWidget
              buyPrice={form.unit_price || ''}
              sellPrice={form.sell_price || ''}
              onBuyPriceChange={v => setForm(p => ({...p, unit_price: v}))}
              onSellPriceChange={v => setForm(p => ({...p, sell_price: v}))}
              disabled={!isDraft}
              S={S}
            />
          </div>

          {/* Extended Deal Fields (Parties, Shipping, Payment, Compliance, Documents, Execution) */}
          <DealExtendedFields
            ext={form.extended || {}}
            onChange={(key, val) => setForm(p => ({...p, extended: {...(p.extended||{}), [key]: val}}))}
            disabled={!isDraft}
          />
        </div>
      )}

      {/* Step 2: Cost Matrix */}
      {step === 2 && (
        <div>
          {costMatrix && isDraft && (
            <VoyageSearch origin={form.buy_location} destination={form.sell_location} onApply={handleVoyageApply} currency={form.cost_currency} />
          )}
          {appliedVoyage && (
            <div style={{ ...S.card, background: "#F0FFF4", border: "1px solid #C6E6D0", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1B7A43" }}>{"\u2713"} Voyage Applied to Cost Matrix</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {appliedVoyage.carrier} {"\u2022"} {appliedVoyage.vessel} ({appliedVoyage.voyage_number})
                    {" \u2022 "} ETD: {appliedVoyage.etd} {" \u2022 "} ETA: {appliedVoyage.eta} ({appliedVoyage.transit_days} days)
                    {" \u2022 "} {appliedVoyage.container_type}: ${appliedVoyage.total?.toLocaleString()}
                  </div>
                </div>
                <button style={{ ...S.btn(false), fontSize: 11, padding: "4px 12px" }} onClick={() => setAppliedVoyage(null)}>Clear</button>
              </div>
            </div>
          )}
          {costMatrix && isDraft && (
            <div style={{ ...S.card, border: "1px solid #D4A017", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#D4A017" }}>{"\u{1F3DB}"} Customs Duty Estimate</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Fetch import duties, VAT, and fees for the destination country</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Import Country</label>
                  <select style={S.select} onChange={e => fetchCustomsEstimate(e.target.value)} disabled={customsLoading}>
                    <option value="">Select country...</option>
                    <option value="GB">United Kingdom</option><option value="US">United States</option>
                    <option value="EU">European Union</option><option value="IN">India</option>
                    <option value="ZA">South Africa</option><option value="AE">UAE</option>
                    <option value="CN">China</option><option value="SG">Singapore</option>
                    <option value="AU">Australia</option><option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option><option value="BR">Brazil</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>HS Code</label>
                  <input style={{ ...S.input, background: "#F0EDE6", fontFamily: "monospace" }} readOnly value={form.hs_code || "Not set"} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Cargo Value (est.)</label>
                  <input style={{ ...S.input, background: "#F0EDE6", fontFamily: "monospace" }} readOnly value={"$" + ((parseFloat(form.unit_price) || 0) * (deal?.quantity || 1)).toLocaleString()} />
                </div>
              </div>
              {customsResult?.duties && (
                <div style={{ marginTop: 12, padding: 12, background: "#FAFAF8", borderRadius: 6, border: "1px solid #E8E4DC" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Duty:</span> <strong>${customsResult.duties.customs_duty.amount.toLocaleString()}</strong> ({customsResult.duties.customs_duty.rate}%)</div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>{customsResult.duties.vat.name}:</span> <strong>${customsResult.duties.vat.amount.toLocaleString()}</strong> ({customsResult.duties.vat.rate}%)</div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Brokerage:</span> <strong>${customsResult.duties.brokerage.amount.toLocaleString()}</strong></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Total:</span> <strong style={{ color: "#C62828" }}>${customsResult.duties.total_duties_taxes.toLocaleString()}</strong> ({customsResult.duties.effective_rate.toFixed(1)}%)</div>
                  </div>
                  {customsResult.duties.restrictions?.length > 0 && (
                    <div style={{ fontSize: 11, color: "#D4A017", marginBottom: 8 }}>{"\u26A0"} {customsResult.duties.restrictions[0]}</div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "#888" }}>{customsResult.incoterm_note}</div>
                    <button style={S.btn(true)} onClick={handleCustomsApply}>Apply to Block D</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
                  <thead><tr><th style={{ ...S.th, width: 40 }}>Blk</th><th style={S.th}>Cost Line</th><th style={S.th}>Type</th><th style={{ ...S.th, textAlign: "right" }}>Amount</th><th style={S.th}>Resp.</th><th style={{ ...S.th, width: 50 }}>Src</th></tr></thead>
                  <tbody>{(costMatrix.cost_lines || []).sort((a, b) => a.sort_order - b.sort_order).map((c, i) => (
                    <tr key={i} style={{ background: c.source === "voyage" ? "#F0FFF4" : "transparent" }}>
                      <td style={{ ...S.td, fontWeight: 700, color: c.block === "A" ? "#1B7A43" : c.block === "B" ? "#D4A017" : "#6B2D5B" }}>{c.block}</td>
                      <td style={{ ...S.td, fontWeight: c.block === "A" ? 700 : 400 }}>{c.line_item}</td>
                      <td style={S.td}><span style={S.badge(c.cost_type === "base" ? "#1B7A43" : c.cost_type === "incoterm_gap" ? "#D4A017" : "#6B2D5B")}>{c.cost_type.replace("_", " ")}</span></td>
                      <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${(c.amount || 0).toLocaleString()}</td>
                      <td style={S.td}>{c.responsibility}</td>
                      <td style={S.td}>{c.source === "voyage" ? <span style={S.badge("#1B7A43")}>{"\u{1F6A2}"}</span> : ""}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Feasibility */}
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
