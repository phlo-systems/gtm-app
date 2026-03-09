/**
 * CUSTOMS INTELLIGENCE SCREEN
 * 
 * Full customs module:
 *   1. Enter product description → get HS code suggestions
 *   2. Select country of origin and import
 *   3. Enter cargo value → get full duty/VAT/fees breakdown
 *   4. View import restrictions and requirements
 *   5. Apply customs costs to deal cost matrix (if linked to a deal)
 * 
 * Props:
 *   deal    - optional deal object (to apply costs to cost matrix)
 *   onApplyToCostMatrix - optional callback({ costLines }) to inject into cost matrix
 */
'use client'

import { useState, useEffect } from 'react';
import { S } from '@/components/shared/styles';

export default function CustomsScreen({ deal, onApplyToCostMatrix }) {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    description: deal?.commodity_desc || "",
    hs_code: deal?.hs_code || "",
    origin_country: "",
    import_country: "",
    cargo_value: "",
    sell_incoterm: deal?.sell_incoterm || "",
  });

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Load available countries on mount
  useEffect(() => {
    fetch("/api/customs-estimate")
      .then(r => r.json())
      .then(data => setCountries(data.countries || []))
      .catch(() => {});
  }, []);

  const calculate = async () => {
    if (!form.description && !form.hs_code) { alert("Enter a product description or HS code"); return; }
    if (!form.import_country) { alert("Select an import country"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/customs-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
      // Auto-select the top HS suggestion if user hasn't specified one
      if (!form.hs_code && data.hs_suggestions?.length > 0) {
        setForm(prev => ({ ...prev, hs_code: data.hs_suggestions[0].code }));
      }
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  };

  const selectHS = (code) => {
    setForm(prev => ({ ...prev, hs_code: code }));
    // Recalculate with the selected code
    setTimeout(() => {
      fetch("/api/customs-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hs_code: code }),
      }).then(r => r.json()).then(setResult).catch(() => {});
    }, 100);
  };

  const handleApply = () => {
    if (result?.cost_lines && onApplyToCostMatrix) {
      onApplyToCostMatrix({ costLines: result.cost_lines });
    }
  };

  const duties = result?.duties;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Customs Intelligence</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Input Form */}
        <div>
          {/* Product & HS Code */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Product Classification</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={S.label}>Product Description</label>
                <input style={{ ...S.input, background: "#FFF" }} value={form.description} onChange={f("description")}
                  placeholder="e.g. Roasted coffee beans, Electronic circuit boards, Cotton t-shirts" />
              </div>
              <div>
                <label style={S.label}>HS Code (auto-suggested or enter manually)</label>
                <input style={{ ...S.input, background: "#FFF", fontFamily: "monospace" }} value={form.hs_code} onChange={f("hs_code")}
                  placeholder="e.g. 0901.21 or leave blank for suggestions" />
              </div>
            </div>
          </div>

          {/* Country Selection */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Trade Route</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={S.label}>Country of Origin</label>
                <select style={S.select} value={form.origin_country} onChange={f("origin_country")}>
                  <option value="">Select origin...</option>
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Country of Import *</label>
                <select style={S.select} value={form.import_country} onChange={f("import_country")}>
                  <option value="">Select import country...</option>
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Value & Incoterm */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Cargo Value & Terms</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={S.label}>Cargo Value (USD)</label>
                <input style={{ ...S.input, background: "#FFF" }} type="number" step="0.01" value={form.cargo_value} onChange={f("cargo_value")}
                  placeholder="e.g. 50000" />
              </div>
              <div>
                <label style={S.label}>Sell Incoterm (optional)</label>
                <select style={S.select} value={form.sell_incoterm} onChange={f("sell_incoterm")}>
                  <option value="">Not specified</option>
                  <option value="EXW">EXW</option><option value="FCA">FCA</option>
                  <option value="FAS">FAS</option><option value="FOB">FOB</option>
                  <option value="CFR">CFR</option><option value="CIF">CIF</option>
                  <option value="CPT">CPT</option><option value="CIP">CIP</option>
                  <option value="DAP">DAP</option><option value="DPU">DPU</option>
                  <option value="DDP">DDP</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button style={{ ...S.btn(true), width: "100%", padding: "10px 20px" }} onClick={calculate} disabled={loading}>
                {loading ? "Calculating..." : "Calculate Duties & Taxes"}
              </button>
            </div>
          </div>

          {/* HS Code Suggestions */}
          {result?.hs_suggestions?.length > 0 && (
            <div style={S.card}>
              <div style={S.sectionTitle}>HS Code Suggestions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {result.hs_suggestions.map((s, i) => (
                  <div key={i} onClick={() => selectHS(s.code)} style={{
                    padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                    background: form.hs_code === s.code ? "#F0FFF4" : "#FAFAF8",
                    border: "1px solid " + (form.hs_code === s.code ? "#C6E6D0" : "#E8E4DC"),
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1B4332", marginRight: 8 }}>{s.code}</span>
                      <span style={{ color: "#666" }}>{s.desc}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={S.badge(s.match_type === "specific" ? "#1B7A43" : "#D4A017")}>{s.match_type}</span>
                      {form.hs_code === s.code && <span style={{ color: "#1B7A43", fontWeight: 700 }}>{"\u2713"}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div>
          {!result?.duties ? (
            <div style={{ ...S.card, textAlign: "center", padding: 60, color: "#888" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{"\u{1F3DB}"}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Enter product details and calculate</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Duty rates, VAT, and restrictions will appear here</div>
            </div>
          ) : (
            <>
              {/* Duty Summary */}
              <div style={{ ...S.card, background: duties.below_de_minimis ? "#F0FFF4" : "#FFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Duty & Tax Summary — {duties.country_name}</div>
                  <span style={S.badge("#1565C0")}>{form.hs_code || "No HS"}</span>
                </div>

                {duties.below_de_minimis && (
                  <div style={{ background: "#F0FFF4", border: "1px solid #C6E6D0", borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 12, color: "#1B7A43" }}>
                    {"\u2713"} Below de minimis threshold ({duties.de_minimis} {duties.currency}). Duty may not apply.
                  </div>
                )}

                {/* Main breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0EDE6" }}>
                    <span style={{ fontSize: 13 }}>Cargo Value</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>${duties.cargo_value.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0EDE6" }}>
                    <span style={{ fontSize: 13 }}>Import Duty ({duties.customs_duty.rate}%)</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#C62828" }}>${duties.customs_duty.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0EDE6" }}>
                    <span style={{ fontSize: 13 }}>{duties.vat.name} ({duties.vat.rate}%)</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#C62828" }}>${duties.vat.amount.toLocaleString()}</span>
                  </div>
                  {duties.additional_fees.map((fee, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0EDE6" }}>
                      <span style={{ fontSize: 12, color: "#666" }}>{fee.name}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>${fee.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0EDE6" }}>
                    <span style={{ fontSize: 12, color: "#666" }}>{duties.brokerage.name}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>${duties.brokerage.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #1B4332", marginTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Total Duties & Taxes</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: "#C62828" }}>${duties.total_duties_taxes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Effective Rate & Landed Cost */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ ...S.card, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Effective Duty Rate</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: duties.effective_rate > 20 ? "#C62828" : duties.effective_rate > 10 ? "#D4A017" : "#1B7A43", margin: "4px 0" }}>
                    {duties.effective_rate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>all duties + taxes / cargo value</div>
                </div>
                <div style={{ ...S.card, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Total Landed Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1B4332", margin: "4px 0", fontFamily: "monospace" }}>
                    ${duties.total_landed_cost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>cargo + duties + brokerage</div>
                </div>
              </div>

              {/* Incoterm Note */}
              {result.incoterm_note && (
                <div style={{ ...S.card, background: "#F0F7FF", border: "1px solid #B8D4F0", padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#1565C0" }}>{"\u2139"} {result.incoterm_note}</div>
                </div>
              )}

              {/* Import Restrictions */}
              {duties.restrictions?.length > 0 && (
                <div style={{ ...S.card, border: "1px solid #FFD54F", background: "#FFFDE7" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#D4A017" }}>{"\u26A0"} Import Requirements & Restrictions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {duties.restrictions.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#666", padding: "4px 0", borderBottom: "1px solid #FFF0C0" }}>
                        {"\u2022"} {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Country Notes */}
              {duties.notes && (
                <div style={S.card}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Country Notes</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{duties.notes}</div>
                </div>
              )}

              {/* Apply to Cost Matrix */}
              {onApplyToCostMatrix && result.cost_lines?.length > 0 && (
                <div style={{ ...S.card, border: "2px solid #1B4332" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Apply to Cost Matrix</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{result.cost_lines.length} cost lines will be added to Block D</div>
                    </div>
                    <button style={S.btn(true)} onClick={handleApply}>Apply Customs Costs</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
