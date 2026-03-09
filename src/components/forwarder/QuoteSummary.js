/**
 * FORWARDER: QUOTE SUMMARY (Step 3)
 * 
 * Final quote summary view showing:
 *   - Profit & Loss breakdown
 *   - Gross margin indicator (colour-coded)
 *   - Shipment summary card
 *   - Cost breakdown by category (Freight, Origin, Destination, Other)
 * 
 * Props:
 *   form       - form state object (for shipment details display)
 *   costBuild  - array of cost line objects
 *   totalBuy   - pre-calculated total buy
 *   totalSell  - pre-calculated total sell
 *   margin     - pre-calculated margin percentage
 */
'use client'

import { S } from '@/components/shared/styles';

export default function QuoteSummary({ form, costBuild, totalBuy, totalSell, margin }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      {/* P&L */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Profit & Loss</div>
        {[
          { l: "Total Sell (Revenue)", v: totalSell, color: "#1B7A43" },
          { l: "Total Buy (Cost)", v: totalBuy, color: "#C62828" },
          { l: "Gross Profit", v: totalSell - totalBuy, bold: true, color: (totalSell - totalBuy) >= 0 ? "#1B7A43" : "#C62828" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: r.bold ? "2px solid #1B4332" : "1px solid #F0EDE6" }}>
            <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 400 }}>{r.l}</span>
            <span style={{ fontFamily: "monospace", fontWeight: r.bold ? 800 : 600, color: r.color }}>{form.cost_currency} {r.v.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Margin + Shipment Summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          ...S.card, padding: 20,
          background: margin >= 10 ? "#F0FFF4" : margin >= 5 ? "#FFFDE7" : "#FFF5F5",
          border: "1px solid " + (margin >= 10 ? "#C6E6D0" : margin >= 5 ? "#FFD54F" : "#E6C6C6"),
        }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Gross Margin</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: margin >= 10 ? "#1B7A43" : margin >= 5 ? "#D4A017" : "#C62828", margin: "4px 0" }}>
            {margin.toFixed(1)}%
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {margin >= 10 ? "\u2713 Healthy margin" : margin >= 5 ? "\u26A0 Thin margin" : "\u2717 Below threshold"}
          </div>
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

      {/* Cost Breakdown by Category */}
      <div style={{ ...S.card, gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Cost Breakdown by Category</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {["Freight", "Origin", "Destination", "Other"].map(cat => {
            const lines = cat === "Other"
              ? costBuild.filter(c => !["Freight","Origin","Destination"].includes(c.category))
              : costBuild.filter(c => c.category === cat);
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
  );
}
