/**
 * FORWARDER: COST BUILD (Step 2)
 * 
 * Editable table of buy/sell rate lines for building a freight quote.
 * Each line has: category, description, unit, qty, buy rate, sell rate.
 * Totals are calculated automatically.
 * 
 * Props:
 *   costBuild       - array of cost line objects
 *   onAdd           - callback() to add a new line
 *   onUpdate        - callback(id, field, value) to update a line
 *   onRemove        - callback(id) to remove a line
 *   isDraft         - whether lines are editable
 *   currency        - quote currency (e.g. "USD")
 *   totalBuy        - pre-calculated total buy amount
 *   totalSell       - pre-calculated total sell amount
 */
'use client'

import { S } from '@/components/shared/styles';

const CATEGORY_COLORS = {
  Freight: "#1565C0",
  Origin: "#1B7A43",
  Destination: "#D4A017",
  Insurance: "#6A1B9A",
  Customs: "#E65100",
  Surcharge: "#C62828",
  Other: "#888",
};

export default function CostBuild({ costBuild, onAdd, onUpdate, onRemove, isDraft, currency, totalBuy, totalSell }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Cost Build {"\u2014"} Buy & Sell Rates</div>
        {isDraft && <button style={S.btn(false)} onClick={onAdd}>+ Add Line</button>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th style={S.th}>Category</th>
          <th style={S.th}>Description</th>
          <th style={S.th}>Unit</th>
          <th style={{ ...S.th, textAlign: "center", width: 50 }}>Qty</th>
          <th style={{ ...S.th, textAlign: "right" }}>Buy Rate</th>
          <th style={{ ...S.th, textAlign: "right" }}>Sell Rate</th>
          <th style={{ ...S.th, textAlign: "right" }}>Buy Total</th>
          <th style={{ ...S.th, textAlign: "right" }}>Sell Total</th>
          {isDraft && <th style={{ ...S.th, width: 30 }}></th>}
        </tr></thead>
        <tbody>
          {costBuild.map((c) => {
            const bT = (parseFloat(c.buy_rate) || 0) * (parseInt(c.qty) || 1);
            const sT = (parseFloat(c.sell_rate) || 0) * (parseInt(c.qty) || 1);
            return (
              <tr key={c.id}>
                <td style={S.td}>
                  {isDraft ? (
                    <select style={{ ...S.select, padding: "4px 6px", fontSize: 12 }} value={c.category} onChange={e => onUpdate(c.id, "category", e.target.value)}>
                      <option>Freight</option><option>Origin</option><option>Destination</option>
                      <option>Insurance</option><option>Customs</option><option>Surcharge</option><option>Other</option>
                    </select>
                  ) : (
                    <span style={S.badge(CATEGORY_COLORS[c.category] || "#888")}>{c.category}</span>
                  )}
                </td>
                <td style={S.td}>
                  {isDraft ? <input style={{ ...S.input, padding: "4px 8px", fontSize: 12 }} value={c.description} onChange={e => onUpdate(c.id, "description", e.target.value)} /> : c.description}
                </td>
                <td style={{ ...S.td, fontSize: 11 }}>
                  {isDraft ? (
                    <select style={{ ...S.select, padding: "4px 6px", fontSize: 11 }} value={c.unit} onChange={e => onUpdate(c.id, "unit", e.target.value)}>
                      <option value="per container">per cntr</option><option value="per shipment">per shpmt</option>
                      <option value="per kg">per kg</option><option value="per cbm">per CBM</option>
                      <option value="lump sum">lump sum</option><option value="per bl">per B/L</option>
                    </select>
                  ) : c.unit}
                </td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  {isDraft ? <input style={{ ...S.input, padding: "4px", fontSize: 12, textAlign: "center", width: 50 }} type="number" min="1" value={c.qty} onChange={e => onUpdate(c.id, "qty", e.target.value)} /> : c.qty}
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  {isDraft ? <input style={{ ...S.input, padding: "4px 8px", fontSize: 12, textAlign: "right", width: 90 }} type="number" step="0.01" value={c.buy_rate} onChange={e => onUpdate(c.id, "buy_rate", e.target.value)} placeholder="0.00" /> : <span style={{ fontFamily: "monospace" }}>{parseFloat(c.buy_rate||0).toFixed(2)}</span>}
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  {isDraft ? <input style={{ ...S.input, padding: "4px 8px", fontSize: 12, textAlign: "right", width: 90 }} type="number" step="0.01" value={c.sell_rate} onChange={e => onUpdate(c.id, "sell_rate", e.target.value)} placeholder="0.00" /> : <span style={{ fontFamily: "monospace" }}>{parseFloat(c.sell_rate||0).toFixed(2)}</span>}
                </td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{bT.toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{sT.toFixed(2)}</td>
                {isDraft && <td style={S.td}><span onClick={() => onRemove(c.id)} style={{ cursor: "pointer", color: "#C62828", fontSize: 14 }}>{"\u00D7"}</span></td>}
              </tr>
            );
          })}
          {/* Totals Row */}
          <tr style={{ background: "#FAFAF8" }}>
            <td colSpan={6} style={{ ...S.td, fontWeight: 700, textAlign: "right", borderTop: "2px solid #E8E4DC" }}>TOTALS ({currency})</td>
            <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 700, borderTop: "2px solid #E8E4DC" }}>{totalBuy.toFixed(2)}</td>
            <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#1B4332", borderTop: "2px solid #E8E4DC" }}>{totalSell.toFixed(2)}</td>
            {isDraft && <td style={{ ...S.td, borderTop: "2px solid #E8E4DC" }}></td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
