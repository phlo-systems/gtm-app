/**
 * TRADER: DEALS LIST
 * 
 * Table view of all deals for the trader role.
 * Shows deal number, customer, supplier, incoterms, status, margin.
 * 
 * Props:
 *   deals      - array of deal objects
 *   onOpenDeal - callback(deal) when a row is clicked
 *   onNewDeal  - callback() for the "+ New Deal" button
 */
'use client'

import { S, statusColor } from '@/components/shared/styles';

export default function DealsList({ deals, onOpenDeal, onNewDeal }) {
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
            <thead><tr>
              <th style={S.th}>Deal ID</th>
              <th style={S.th}>Customer</th>
              <th style={S.th}>Supplier</th>
              <th style={S.th}>Incoterms</th>
              <th style={S.th}>Status</th>
              <th style={{ ...S.th, textAlign: "right" }}>Margin</th>
            </tr></thead>
            <tbody>{deals.map(d => (
              <tr key={d.id} onClick={() => onOpenDeal(d)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 700, color: "#1B4332" }}>{d.deal_number}</td>
                <td style={S.td}>{d.customer?.name || "\u2014"}</td>
                <td style={S.td}>{d.supplier?.name || "\u2014"}</td>
                <td style={{ ...S.td, fontSize: 11 }}>
                  <span style={{ color: "#1B7A43" }}>{d.buy_incoterm || "\u2014"}</span>
                  {" \u2192 "}
                  <span style={{ color: "#C62828" }}>{d.sell_incoterm || "\u2014"}</span>
                </td>
                <td style={S.td}><span style={S.badge(statusColor[d.status] || "#888")}>{d.status}</span></td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>
                  {d.gross_margin_pct > 0 ? d.gross_margin_pct.toFixed(1) + "%" : "\u2014"}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
