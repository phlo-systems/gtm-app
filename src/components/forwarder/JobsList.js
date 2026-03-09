/**
 * FORWARDER: JOBS LIST
 * 
 * Table view of all forwarding jobs.
 * Shows job number, shipper, consignee, route, transport mode, status.
 * 
 * Props:
 *   deals     - array of job objects (stored as deals in DB)
 *   onOpenJob - callback(deal) when a row is clicked
 *   onNewJob  - callback() for the "+ New Job" button
 */
'use client'

import { S, statusColor } from '@/components/shared/styles';

export default function ForwarderJobsList({ deals, onOpenJob, onNewJob }) {
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
              <th style={S.th}>Job #</th>
              <th style={S.th}>Shipper</th>
              <th style={S.th}>Consignee</th>
              <th style={S.th}>Route</th>
              <th style={S.th}>Mode</th>
              <th style={S.th}>Status</th>
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
