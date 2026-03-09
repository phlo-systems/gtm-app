/**
 * CONTAINER STUFFING CALCULATOR
 * 
 * Utility tool for forwarders and traders to calculate:
 *   - How many cartons/pallets/units fit in a container
 *   - Weight vs volume utilisation
 *   - Optimal container type selection
 * 
 * All calculations are client-side, no API calls needed.
 * Uses standard ISO container internal dimensions and payload limits.
 */
'use client'

import { useState } from 'react';
import { S } from '@/components/shared/styles';

// ISO container specs: internal dimensions (m) and max payload (kg)
const CONTAINERS = {
  "20GP": { name: "20' General Purpose", lengthM: 5.898, widthM: 2.352, heightM: 2.393, maxPayloadKg: 28200, tareKg: 2300, cbm: 33.2 },
  "40GP": { name: "40' General Purpose", lengthM: 12.032, widthM: 2.352, heightM: 2.393, maxPayloadKg: 26680, tareKg: 3800, cbm: 67.7 },
  "40HC": { name: "40' High Cube",       lengthM: 12.032, widthM: 2.352, heightM: 2.698, maxPayloadKg: 26460, tareKg: 4020, cbm: 76.3 },
  "20RF": { name: "20' Reefer",          lengthM: 5.444, widthM: 2.268, heightM: 2.071, maxPayloadKg: 27400, tareKg: 3080, cbm: 25.6 },
  "40RF": { name: "40' Reefer",          lengthM: 11.561, widthM: 2.268, heightM: 2.249, maxPayloadKg: 26120, tareKg: 4360, cbm: 59.0 },
  "20OT": { name: "20' Open Top",        lengthM: 5.888, widthM: 2.346, heightM: 2.346, maxPayloadKg: 28130, tareKg: 2350, cbm: 32.4 },
  "40OT": { name: "40' Open Top",        lengthM: 12.022, widthM: 2.346, heightM: 2.346, maxPayloadKg: 26350, tareKg: 4130, cbm: 66.3 },
  "45HC": { name: "45' High Cube",       lengthM: 13.556, widthM: 2.352, heightM: 2.698, maxPayloadKg: 25600, tareKg: 4800, cbm: 86.0 },
};

// Standard pallet sizes (m)
const PALLETS = {
  "euro": { name: "Euro Pallet (1200x800)", lengthM: 1.2, widthM: 0.8 },
  "us": { name: "US Pallet (1219x1016)", lengthM: 1.219, widthM: 1.016 },
  "uk": { name: "UK Pallet (1200x1000)", lengthM: 1.2, widthM: 1.0 },
};

export default function ContainerCalculator() {
  const [mode, setMode] = useState("carton"); // "carton" or "pallet"
  const [containerType, setContainerType] = useState("40HC");
  const [form, setForm] = useState({
    // Carton mode
    cartonLengthCm: "", cartonWidthCm: "", cartonHeightCm: "", cartonWeightKg: "",
    // Pallet mode
    palletType: "euro", palletHeightCm: "150", palletWeightKg: "", palletsCount: "",
    // Stacking
    maxStackHeight: "3",
  });

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const container = CONTAINERS[containerType];

  // ── Carton calculations ──
  const cL = parseFloat(form.cartonLengthCm) / 100 || 0;
  const cW = parseFloat(form.cartonWidthCm) / 100 || 0;
  const cH = parseFloat(form.cartonHeightCm) / 100 || 0;
  const cWt = parseFloat(form.cartonWeightKg) || 0;
  const cVol = cL * cW * cH; // m³ per carton

  let cartonsPerContainer = 0;
  let cartonCalcDetails = null;
  if (cL > 0 && cW > 0 && cH > 0 && container) {
    // Calculate how many cartons fit by trying different orientations
    const orientations = [
      [cL, cW, cH],
      [cL, cH, cW],
      [cW, cL, cH],
      [cW, cH, cL],
      [cH, cL, cW],
      [cH, cW, cL],
    ];

    let bestFit = 0;
    let bestLayout = null;
    for (const [ol, ow, oh] of orientations) {
      const nL = Math.floor(container.lengthM / ol);
      const nW = Math.floor(container.widthM / ow);
      const nH = Math.floor(container.heightM / oh);
      const total = nL * nW * nH;
      if (total > bestFit) {
        bestFit = total;
        bestLayout = { length: nL, width: nW, height: nH, dimL: ol, dimW: ow, dimH: oh };
      }
    }
    cartonsPerContainer = bestFit;

    // Check weight limit
    const weightLimitedQty = cWt > 0 ? Math.floor(container.maxPayloadKg / cWt) : Infinity;
    const actualQty = Math.min(cartonsPerContainer, weightLimitedQty);
    const totalWeight = actualQty * cWt;
    const totalVol = actualQty * cVol;
    const volUtil = (totalVol / container.cbm) * 100;
    const wtUtil = cWt > 0 ? (totalWeight / container.maxPayloadKg) * 100 : 0;
    const limitingFactor = weightLimitedQty < cartonsPerContainer ? "weight" : "volume";

    cartonCalcDetails = {
      layout: bestLayout,
      volumeFit: cartonsPerContainer,
      weightFit: weightLimitedQty === Infinity ? "N/A" : weightLimitedQty,
      actual: actualQty,
      totalWeight,
      totalVol,
      volUtil,
      wtUtil,
      limitingFactor,
    };
  }

  // ── Pallet calculations ──
  const pallet = PALLETS[form.palletType];
  const palletH = parseFloat(form.palletHeightCm) / 100 || 0;
  const palletWt = parseFloat(form.palletWeightKg) || 0;

  let palletsPerContainer = 0;
  let palletCalcDetails = null;
  if (pallet && container) {
    // Try both orientations on floor
    const opt1L = Math.floor(container.lengthM / pallet.lengthM);
    const opt1W = Math.floor(container.widthM / pallet.widthM);
    const opt2L = Math.floor(container.lengthM / pallet.widthM);
    const opt2W = Math.floor(container.widthM / pallet.lengthM);
    const floor1 = opt1L * opt1W;
    const floor2 = opt2L * opt2W;
    const bestFloor = Math.max(floor1, floor2);

    const stackHigh = palletH > 0 ? Math.floor(container.heightM / palletH) : 1;
    palletsPerContainer = bestFloor * stackHigh;

    const weightLimited = palletWt > 0 ? Math.floor(container.maxPayloadKg / palletWt) : Infinity;
    const actual = Math.min(palletsPerContainer, weightLimited);
    const totalWeight = actual * palletWt;
    const palletVol = pallet.lengthM * pallet.widthM * palletH;
    const totalVol = actual * palletVol;

    palletCalcDetails = {
      floorPositions: bestFloor,
      stackHigh,
      volumeFit: palletsPerContainer,
      weightFit: weightLimited === Infinity ? "N/A" : weightLimited,
      actual,
      totalWeight,
      totalVol,
      volUtil: (totalVol / container.cbm) * 100,
      wtUtil: palletWt > 0 ? (totalWeight / container.maxPayloadKg) * 100 : 0,
    };
  }

  const calc = mode === "carton" ? cartonCalcDetails : palletCalcDetails;
  const inputStyle = { ...S.input, background: "#FFF" };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Container Stuffing Calculator</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Left: Input */}
        <div>
          {/* Container Selection */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Container Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {Object.entries(CONTAINERS).map(([code, c]) => (
                <div key={code} onClick={() => setContainerType(code)} style={{
                  padding: "8px 6px", textAlign: "center", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: containerType === code ? "#1B4332" : "#F8F7F4",
                  color: containerType === code ? "#FFF" : "#666",
                  border: "1px solid " + (containerType === code ? "#1B4332" : "#E8E4DC"),
                }}>{code}</div>
              ))}
            </div>
            {container && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "#F0F7FF", borderRadius: 6, fontSize: 11, color: "#666", lineHeight: 1.8 }}>
                <strong>{container.name}</strong><br />
                Internal: {container.lengthM}m x {container.widthM}m x {container.heightM}m = {container.cbm} CBM<br />
                Max payload: {container.maxPayloadKg.toLocaleString()} kg | Tare: {container.tareKg.toLocaleString()} kg
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Cargo Type</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[{ k: "carton", l: "Cartons / Boxes" }, { k: "pallet", l: "Pallets" }].map(m => (
                <button key={m.k} onClick={() => setMode(m.k)} style={{
                  ...S.btn(mode === m.k), flex: 1, fontSize: 12,
                }}>{m.l}</button>
              ))}
            </div>

            {mode === "carton" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={S.label}>Length (cm)</label><input style={inputStyle} type="number" value={form.cartonLengthCm} onChange={f("cartonLengthCm")} placeholder="e.g. 60" /></div>
                <div><label style={S.label}>Width (cm)</label><input style={inputStyle} type="number" value={form.cartonWidthCm} onChange={f("cartonWidthCm")} placeholder="e.g. 40" /></div>
                <div><label style={S.label}>Height (cm)</label><input style={inputStyle} type="number" value={form.cartonHeightCm} onChange={f("cartonHeightCm")} placeholder="e.g. 30" /></div>
                <div><label style={S.label}>Weight per carton (kg)</label><input style={inputStyle} type="number" step="0.1" value={form.cartonWeightKg} onChange={f("cartonWeightKg")} placeholder="e.g. 15" /></div>
              </div>
            )}

            {mode === "pallet" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / -1" }}><label style={S.label}>Pallet Size</label>
                  <select style={S.select} value={form.palletType} onChange={f("palletType")}>
                    {Object.entries(PALLETS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
                  </select></div>
                <div><label style={S.label}>Loaded pallet height (cm)</label><input style={inputStyle} type="number" value={form.palletHeightCm} onChange={f("palletHeightCm")} placeholder="e.g. 150" /></div>
                <div><label style={S.label}>Weight per pallet (kg)</label><input style={inputStyle} type="number" step="0.1" value={form.palletWeightKg} onChange={f("palletWeightKg")} placeholder="e.g. 800" /></div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div>
          {calc ? (
            <>
              {/* Main result */}
              <div style={{ ...S.card, background: "#F0FFF4", border: "1px solid #C6E6D0" }}>
                <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>
                  {mode === "carton" ? "Cartons" : "Pallets"} per {containerType}
                </div>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#1B4332", margin: "4px 0" }}>
                  {calc.actual.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Volume fit: {calc.volumeFit.toLocaleString()} | Weight fit: {calc.weightFit === "N/A" ? "enter weight" : calc.weightFit.toLocaleString()}
                </div>
              </div>

              {/* Utilisation bars */}
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Utilisation</div>

                {/* Volume bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Volume</span>
                    <span style={{ fontWeight: 600 }}>{calc.volUtil.toFixed(1)}% ({calc.totalVol.toFixed(1)} / {container.cbm} CBM)</span>
                  </div>
                  <div style={{ height: 12, background: "#E8E4DC", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.min(calc.volUtil, 100) + "%", background: calc.volUtil > 90 ? "#1B7A43" : calc.volUtil > 70 ? "#D4A017" : "#1565C0", borderRadius: 6, transition: "width 0.3s" }}></div>
                  </div>
                </div>

                {/* Weight bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Weight</span>
                    <span style={{ fontWeight: 600 }}>
                      {calc.wtUtil > 0 ? calc.wtUtil.toFixed(1) + "%" : "N/A"}
                      {calc.totalWeight > 0 && ` (${(calc.totalWeight / 1000).toFixed(1)}t / ${(container.maxPayloadKg / 1000).toFixed(1)}t)`}
                    </span>
                  </div>
                  <div style={{ height: 12, background: "#E8E4DC", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.min(calc.wtUtil || 0, 100) + "%", background: calc.wtUtil > 90 ? "#C62828" : calc.wtUtil > 70 ? "#D4A017" : "#1565C0", borderRadius: 6, transition: "width 0.3s" }}></div>
                  </div>
                </div>
              </div>

              {/* Layout details */}
              {mode === "carton" && cartonCalcDetails?.layout && (
                <div style={S.card}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Stacking Layout</div>
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>
                    <div><strong>Arrangement:</strong> {cartonCalcDetails.layout.length} long x {cartonCalcDetails.layout.width} wide x {cartonCalcDetails.layout.height} high</div>
                    <div><strong>Carton orientation:</strong> {(cartonCalcDetails.layout.dimL * 100).toFixed(0)} x {(cartonCalcDetails.layout.dimW * 100).toFixed(0)} x {(cartonCalcDetails.layout.dimH * 100).toFixed(0)} cm</div>
                    <div><strong>Limiting factor:</strong> <span style={{ fontWeight: 600, color: cartonCalcDetails.limitingFactor === "weight" ? "#C62828" : "#1565C0" }}>{cartonCalcDetails.limitingFactor}</span></div>
                  </div>
                </div>
              )}

              {mode === "pallet" && palletCalcDetails && (
                <div style={S.card}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Layout</div>
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>
                    <div><strong>Floor positions:</strong> {palletCalcDetails.floorPositions}</div>
                    <div><strong>Stacked:</strong> {palletCalcDetails.stackHigh} high</div>
                    <div><strong>Pallet size:</strong> {pallet.name}</div>
                  </div>
                </div>
              )}

              {/* Compare containers */}
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Compare All Containers</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={S.th}>Type</th><th style={{ ...S.th, textAlign: "right" }}>Qty</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Vol %</th><th style={{ ...S.th, textAlign: "right" }}>Wt %</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(CONTAINERS).map(([code, c]) => {
                      let qty = 0;
                      if (mode === "carton" && cL > 0 && cW > 0 && cH > 0) {
                        const orientations = [[cL,cW,cH],[cL,cH,cW],[cW,cL,cH],[cW,cH,cL],[cH,cL,cW],[cH,cW,cL]];
                        for (const [ol,ow,oh] of orientations) {
                          const t = Math.floor(c.lengthM/ol)*Math.floor(c.widthM/ow)*Math.floor(c.heightM/oh);
                          if (t > qty) qty = t;
                        }
                        if (cWt > 0) qty = Math.min(qty, Math.floor(c.maxPayloadKg/cWt));
                      } else if (mode === "pallet" && pallet) {
                        const f1 = Math.floor(c.lengthM/pallet.lengthM)*Math.floor(c.widthM/pallet.widthM);
                        const f2 = Math.floor(c.lengthM/pallet.widthM)*Math.floor(c.widthM/pallet.lengthM);
                        const sh = palletH > 0 ? Math.floor(c.heightM/palletH) : 1;
                        qty = Math.max(f1,f2)*sh;
                        if (palletWt > 0) qty = Math.min(qty, Math.floor(c.maxPayloadKg/palletWt));
                      }
                      const unitVol = mode === "carton" ? cVol : (pallet ? pallet.lengthM*pallet.widthM*palletH : 0);
                      const vPct = unitVol > 0 ? ((qty*unitVol)/c.cbm*100) : 0;
                      const unitWt = mode === "carton" ? cWt : palletWt;
                      const wPct = unitWt > 0 ? ((qty*unitWt)/c.maxPayloadKg*100) : 0;
                      return (
                        <tr key={code} style={{ background: code === containerType ? "#F0FFF4" : "transparent" }}>
                          <td style={{ ...S.td, fontWeight: code === containerType ? 700 : 400 }}>{code}</td>
                          <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{qty}</td>
                          <td style={{ ...S.td, textAlign: "right", fontSize: 12 }}>{vPct > 0 ? vPct.toFixed(0)+"%" : "\u2014"}</td>
                          <td style={{ ...S.td, textAlign: "right", fontSize: 12 }}>{wPct > 0 ? wPct.toFixed(0)+"%" : "\u2014"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ ...S.card, textAlign: "center", padding: 60, color: "#888" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{"\u{1F4E6}"}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Enter cargo dimensions</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Results will appear here as you type</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
