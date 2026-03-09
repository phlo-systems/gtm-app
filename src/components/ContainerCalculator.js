'use client'
import { useState, useMemo } from "react";

const CONTAINERS = {
  "20ft": { name: "20' Standard", length: 5.9, width: 2.35, height: 2.39, maxKg: 28200, cbm: 33.2 },
  "40ft": { name: "40' Standard", length: 12.03, width: 2.35, height: 2.39, maxKg: 28750, cbm: 67.7 },
  "40hc": { name: "40' High Cube", length: 12.03, width: 2.35, height: 2.69, maxKg: 28570, cbm: 76.3 },
  "45hc": { name: "45' High Cube", length: 13.56, width: 2.35, height: 2.69, maxKg: 27600, cbm: 85.7 },
};
const PALLETS = {
  none: { name: "No pallets (loose)", length: 0, width: 0, height: 0 },
  eur: { name: "EUR (1200x800mm)", length: 1.2, width: 0.8, height: 0.144 },
  us: { name: "US (48x40 in)", length: 1.219, width: 1.016, height: 0.15 },
  asia: { name: "Asia (1100x1100mm)", length: 1.1, width: 1.1, height: 0.15 },
};
const SI = { input: { padding: "6px 10px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }, label: { fontSize: 11, color: "#888", display: "block", marginBottom: 3 }, select: { padding: "6px 10px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" } };

export default function ContainerCalculator({ onResult }) {
  const [form, setForm] = useState({ containerType: "40ft", palletType: "none", pkgLength: "", pkgWidth: "", pkgHeight: "", pkgUnit: "cm", pkgWeight: "", weightUnit: "kg", casesPerLayer: "", layersPerPallet: "", maxStackHeight: "", totalQty: "", qtyUnit: "cases" });
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const calc = useMemo(() => {
    const c = CONTAINERS[form.containerType]; const p = PALLETS[form.palletType]; if (!c) return null;
    const conv = form.pkgUnit === "cm" ? 0.01 : form.pkgUnit === "mm" ? 0.001 : form.pkgUnit === "in" ? 0.0254 : 1;
    const pL = (parseFloat(form.pkgLength)||0)*conv, pW = (parseFloat(form.pkgWidth)||0)*conv, pH = (parseFloat(form.pkgHeight)||0)*conv;
    const pKg = (parseFloat(form.pkgWeight)||0) * (form.weightUnit==="lb"?0.4536:1);
    if (!pL||!pW||!pH||!pKg) return null;
    const pkgVol = pL*pW*pH; const totalQty = parseFloat(form.totalQty)||0;
    if (form.palletType === "none") {
      const fitL=Math.floor(c.length/pL), fitW=Math.floor(c.width/pW);
      const fitH = form.maxStackHeight ? Math.min(Math.floor(c.height/pH),parseInt(form.maxStackHeight)) : Math.floor(c.height/pH);
      const maxByVol=fitL*fitW*fitH, maxByWt=Math.floor(c.maxKg/pKg), maxPkgs=Math.min(maxByVol,maxByWt);
      const limitedBy=maxByVol<=maxByWt?"volume":"weight", usedVol=maxPkgs*pkgVol, usedWt=maxPkgs*pKg;
      return { mode:"loose",container:c,fitPerLayer:fitL*fitW,layers:fitH,fitL,fitW,fitH,maxByVol,maxByWt,maxPkgs,limitedBy,usedVolCBM:usedVol.toFixed(2),usedWeightKg:Math.round(usedWt),volUtil:(usedVol/c.cbm*100).toFixed(1),wtUtil:(usedWt/c.maxKg*100).toFixed(1),containersNeeded:totalQty>0?Math.ceil(totalQty/maxPkgs):1,optimalQty:maxPkgs,wastedCBM:(c.cbm-usedVol).toFixed(2) };
    } else {
      const casesAcrossL=Math.floor(p.length/pL), casesAcrossW=Math.floor(p.width/pW);
      const casesPerLayer=form.casesPerLayer?parseInt(form.casesPerLayer):casesAcrossL*casesAcrossW;
      const layersPerPallet=form.layersPerPallet?parseInt(form.layersPerPallet):Math.floor((c.height-p.height)/pH);
      const casesPerPallet=casesPerLayer*layersPerPallet, palletTotalH=p.height+(layersPerPallet*pH);
      const fit1=Math.floor(c.length/p.length)*Math.floor(c.width/p.width), fit2=Math.floor(c.length/p.width)*Math.floor(c.width/p.length);
      const palletsPerContainer=Math.max(fit1,fit2), totalCases=palletsPerContainer*casesPerPallet;
      const maxByWt=Math.floor(c.maxKg/pKg), maxCases=Math.min(totalCases,maxByWt), limitedBy=totalCases<=maxByWt?"volume":"weight";
      const usedVol=maxCases*pkgVol;
      return { mode:"palletised",container:c,pallet:p,casesPerLayer,layersPerPallet,casesPerPallet,palletTotalH:palletTotalH.toFixed(2),palletsPerContainer,totalCases,maxByWt,maxCases,limitedBy,usedVolCBM:usedVol.toFixed(2),usedWeightKg:Math.round(maxCases*pKg),volUtil:(usedVol/c.cbm*100).toFixed(1),wtUtil:(maxCases*pKg/c.maxKg*100).toFixed(1),containersNeeded:totalQty>0?Math.ceil(totalQty/maxCases):1,optimalQty:maxCases,wastedCBM:(c.cbm-usedVol).toFixed(2) };
    }
  }, [form]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Container & Pallet</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div><label style={SI.label}>Container</label><select style={SI.select} value={form.containerType} onChange={f("containerType")}>{Object.entries(CONTAINERS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
          <div><label style={SI.label}>Pallet</label><select style={SI.select} value={form.palletType} onChange={f("palletType")}>{Object.entries(PALLETS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Package / Case</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.7fr", gap: 8, marginBottom: 8 }}>
          <div><label style={SI.label}>L</label><input style={SI.input} type="number" value={form.pkgLength} onChange={f("pkgLength")} placeholder="0" /></div>
          <div><label style={SI.label}>W</label><input style={SI.input} type="number" value={form.pkgWidth} onChange={f("pkgWidth")} placeholder="0" /></div>
          <div><label style={SI.label}>H</label><input style={SI.input} type="number" value={form.pkgHeight} onChange={f("pkgHeight")} placeholder="0" /></div>
          <div><label style={SI.label}>Unit</label><select style={SI.select} value={form.pkgUnit} onChange={f("pkgUnit")}><option value="cm">cm</option><option value="mm">mm</option><option value="in">in</option><option value="m">m</option></select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div><label style={SI.label}>Weight/case</label><input style={SI.input} type="number" value={form.pkgWeight} onChange={f("pkgWeight")} /></div>
          <div><label style={SI.label}>Unit</label><select style={SI.select} value={form.weightUnit} onChange={f("weightUnit")}><option value="kg">kg</option><option value="lb">lbs</option></select></div>
        </div>
        {form.palletType !== "none" && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Stacking (optional)</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={SI.label}>Cases/layer</label><input style={SI.input} type="number" value={form.casesPerLayer} onChange={f("casesPerLayer")} placeholder="auto" /></div><div><label style={SI.label}>Layers/pallet</label><input style={SI.input} type="number" value={form.layersPerPallet} onChange={f("layersPerPallet")} placeholder="auto" /></div></div></div>}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Shipment Qty</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={SI.label}>Total qty</label><input style={SI.input} type="number" value={form.totalQty} onChange={f("totalQty")} placeholder="e.g. 5000" /></div>
          <div><label style={SI.label}>Unit</label><select style={SI.select} value={form.qtyUnit} onChange={f("qtyUnit")}><option value="cases">Cases</option><option value="bags">Bags</option><option value="drums">Drums</option><option value="units">Units</option></select></div>
        </div>
      </div>
      <div>
        {!calc ? <div style={{ padding: 40, textAlign: "center", color: "#AAA", fontSize: 13 }}>Enter package dimensions and weight to calculate.</div> : (
          <div>
            <div style={{ background: "#1A1A2E", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: "#FFF", fontSize: 13, fontWeight: 700 }}>{calc.container.name}</span><span style={{ color: "#00E5FF", fontSize: 11 }}>{calc.container.length}m x {calc.container.width}m x {calc.container.height}m</span></div>
              <div style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", marginBottom: 3 }}><span>Volume: {calc.usedVolCBM}/{calc.container.cbm} CBM</span><span>{calc.volUtil}%</span></div><div style={{ height: 10, background: "#2A2A3E", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min(100,parseFloat(calc.volUtil))+"%", background: parseFloat(calc.volUtil)>90?"#4CAF50":"#00E5FF", borderRadius: 5, transition: "width 0.5s" }} /></div></div>
              <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", marginBottom: 3 }}><span>Weight: {calc.usedWeightKg.toLocaleString()}/{calc.container.maxKg.toLocaleString()} kg</span><span>{calc.wtUtil}%</span></div><div style={{ height: 10, background: "#2A2A3E", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min(100,parseFloat(calc.wtUtil))+"%", background: parseFloat(calc.wtUtil)>90?"#FF5252":"#4CAF50", borderRadius: 5, transition: "width 0.5s" }} /></div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ padding: 12, background: "#1B4332", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 10, color: "#A5D6A7", fontWeight: 600, textTransform: "uppercase" }}>Max per container</div><div style={{ fontSize: 28, fontWeight: 800, color: "#FFF" }}>{calc.optimalQty.toLocaleString()}</div><div style={{ fontSize: 10, color: "#A5D6A7" }}>{form.qtyUnit}</div></div>
              <div style={{ padding: 12, background: calc.limitedBy==="weight"?"#C62828":"#0D47A1", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 10, color: "#FFF", fontWeight: 600, textTransform: "uppercase", opacity: 0.7 }}>Limited by</div><div style={{ fontSize: 20, fontWeight: 800, color: "#FFF" }}>{calc.limitedBy==="weight"?"\u2696\uFE0F Weight":"\uD83D\uDCE6 Volume"}</div><div style={{ fontSize: 10, color: "#FFF", opacity: 0.7 }}>{calc.wastedCBM} CBM wasted</div></div>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
              {calc.mode==="loose" && <div><div><strong>Layout:</strong> {calc.fitL}x{calc.fitW}={calc.fitPerLayer}/layer x {calc.fitH} layers</div><div><strong>By volume:</strong> {calc.maxByVol.toLocaleString()} | <strong>By weight:</strong> {calc.maxByWt.toLocaleString()}</div></div>}
              {calc.mode==="palletised" && <div><div><strong>Per pallet:</strong> {calc.casesPerLayer}/layer x {calc.layersPerPallet} layers = {calc.casesPerPallet}</div><div><strong>Pallets:</strong> {calc.palletsPerContainer} | <strong>Total:</strong> {calc.maxCases.toLocaleString()} {form.qtyUnit}</div></div>}
            </div>
            {parseFloat(form.totalQty)>0 && <div style={{ marginTop: 12, padding: 12, background: "#F0F7FF", borderRadius: 8, border: "1px solid #B8D4F0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1565C0" }}>For {parseFloat(form.totalQty).toLocaleString()} {form.qtyUnit}:</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0D47A1", marginTop: 4 }}>{calc.containersNeeded} x {calc.container.name}</div>
              {calc.containersNeeded===1 && parseFloat(form.totalQty)<calc.optimalQty && <div style={{ fontSize: 11, color: "#2E7D32", marginTop: 4 }}>{"\uD83D\uDCA1"} Could fit <strong>{calc.optimalQty.toLocaleString()}</strong> {form.qtyUnit}. Increase by {(calc.optimalQty-parseFloat(form.totalQty)).toLocaleString()} to maximise.</div>}
              {calc.containersNeeded>1 && <div style={{ fontSize: 11, color: "#E65100", marginTop: 4 }}>Last container: {(parseFloat(form.totalQty)%calc.optimalQty)||calc.optimalQty} {form.qtyUnit} ({((((parseFloat(form.totalQty)%calc.optimalQty)||calc.optimalQty)/calc.optimalQty)*100).toFixed(0)}% full)</div>}
            </div>}
            {onResult && <button onClick={() => onResult({ optimalQty: calc.optimalQty, containersNeeded: calc.containersNeeded, containerType: form.containerType })} style={{ marginTop: 12, width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "#1B4332", color: "#FFF" }}>Apply {calc.optimalQty.toLocaleString()} {form.qtyUnit} to Deal</button>}
          </div>
        )}
      </div>
    </div>
  );
}
