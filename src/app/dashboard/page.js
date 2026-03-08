'use client'
import { useState, useEffect, useRef } from "react";
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

/* ── ComboBox: searchable dropdown with "create new" option ── */
function ComboBox({ label, value, options, onSelect, onCreate, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.some(o => o.name.toLowerCase() === search.toLowerCase());

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        style={{ ...S.input, background: disabled ? "#F0EDE6" : "#FFF", borderColor: open ? "#1B4332" : "#D5D0C6" }}
        readOnly={disabled}
        placeholder={placeholder || "Search or type new..."}
        value={open ? search : value || ""}
        onFocus={() => { if (!disabled) { setOpen(true); setSearch(value || ""); } }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {open && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#FFF", border: "1px solid #D5D0C6", borderRadius: "0 0 6px 6px", maxHeight: 180, overflowY: "auto", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {filtered.map((o) => (
            <div key={o.id} onClick={() => { onSelect(o); setOpen(false); setSearch(""); }}
              style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #F0EDE6" }}
              onMouseOver={(e) => e.target.style.background = "#F0FFF4"}
              onMouseOut={(e) => e.target.style.background = "#FFF"}>
              <div style={{ fontWeight: 600 }}>{o.name}</div>
              {o.country && <div style={{ fontSize: 10, color: "#888" }}>{o.country}{o.hs_code ? " \u2022 HS " + o.hs_code : ""}</div>}
              {o.hs_code && !o.country && <div style={{ fontSize: 10, color: "#888" }}>HS {o.hs_code}</div>}
            </div>
          ))}
          {search.trim() && !exactMatch && (
            <div onClick={() => { onCreate(search.trim()); setOpen(false); setSearch(""); }}
              style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", background: "#F0F7FF", color: "#1B4332", fontWeight: 600, borderTop: "1px solid #B8D4F0" }}>
              + Create new: “{search.trim()}”
            </div>
          )}
          {filtered.length === 0 && !search.trim() && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "#AAA" }}>No items yet. Type to create.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Trade Route Map (Premium Dark Theme + Freight Estimates) ── */
function TradeRouteMap({ buyLocation, sellLocation, buyIncoterm, sellIncoterm, transportMode }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [status, setStatus] = useState("loading");
  const [freight, setFreight] = useState(null);

  useEffect(() => {
    if (!buyLocation || !sellLocation) { setStatus("no-locations"); return; }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link"); link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    }

    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) return resolve(window.L);
      const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = () => resolve(window.L); document.head.appendChild(s);
    });

    const geocode = async (place) => {
      try {
        const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(place) + "&limit=1");
        const d = await r.json(); if (d.length > 0) return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      } catch {} return null;
    };

    const bezierCurve = (p1, p2, numPoints) => {
      const pts = [];
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;
      const dist = Math.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2);
      const offset = dist * 0.15;
      const ctrl = [midLat + offset, midLng];
      for (let i = 0; i <= (numPoints || 50); i++) {
        const t = i / (numPoints || 50);
        const lat = (1-t)*(1-t)*p1[0] + 2*(1-t)*t*ctrl[0] + t*t*p2[0];
        const lng = (1-t)*(1-t)*p1[1] + 2*(1-t)*t*ctrl[1] + t*t*p2[1];
        pts.push([lat, lng]);
      }
      return pts;
    };

    const init = async () => {
      setStatus("loading"); setFreight(null);
      const L = await loadLeaflet();
      const [buyCoords, sellCoords] = await Promise.all([geocode(buyLocation), geocode(sellLocation)]);
      if (!buyCoords || !sellCoords) { setStatus("geo-fail"); return; }
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, { scrollWheelZoom: false, attributionControl: false, zoomControl: false });
      mapInstance.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Dark premium tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd", maxZoom: 19
      }).addTo(map);

      // Curved ocean route with glow effect
      const isOcean = transportMode === "ocean" || !transportMode;
      const curvePoints = bezierCurve(buyCoords, sellCoords, 60);

      // Glow layer (wide, transparent)
      L.polyline(curvePoints, { color: isOcean ? "#00BCD4" : "#FF6D00", weight: 10, opacity: 0.15, lineCap: "round" }).addTo(map);
      // Main route line
      L.polyline(curvePoints, { color: isOcean ? "#00E5FF" : "#FF9100", weight: 3, opacity: 0.9, dashArray: isOcean ? "12 8" : "8 5", lineCap: "round" }).addTo(map);
      // Bright core
      L.polyline(curvePoints, { color: "#FFFFFF", weight: 1, opacity: 0.3, dashArray: "4 12", lineCap: "round" }).addTo(map);

      // Origin marker (supplier)
      const mkOrigin = (coords, label, inco, color) => {
        L.circleMarker(coords, { radius: 8, fillColor: color, fillOpacity: 0.9, color: "#FFF", weight: 2 }).addTo(map);
        L.circleMarker(coords, { radius: 14, fillColor: color, fillOpacity: 0.15, color: color, weight: 1 }).addTo(map);
        L.marker(coords, { icon: L.divIcon({ className: "", html: '<div style="background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);color:#FFF;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid ' + color + '40;box-shadow:0 4px 16px rgba(0,0,0,0.4)"><span style="color:' + color + '">' + inco + '</span> ' + label + '</div>', iconSize: [0, 0], iconAnchor: [-12, 20] }) }).addTo(map);
      };
      mkOrigin(buyCoords, buyLocation, buyIncoterm || "FOB", "#4CAF50");
      mkOrigin(sellCoords, sellLocation, sellIncoterm || "CIF", "#FF5252");

      // Transport mode label at midpoint of curve
      const mid = curvePoints[Math.floor(curvePoints.length / 2)];
      const modeEmoji = isOcean ? "\u26F5" : transportMode === "road" ? "\uD83D\uDE9A" : "\u2708\uFE0F";
      const modeText = isOcean ? "Ocean" : transportMode === "road" ? "Road" : "Air";
      const modeCol = isOcean ? "#00E5FF" : "#FF9100";
      L.marker(mid, { icon: L.divIcon({ className: "", html: '<div style="background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);color:' + modeCol + ';padding:4px 10px;border-radius:16px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid ' + modeCol + '50;letter-spacing:0.5px">' + modeEmoji + ' ' + modeText + '</div>', iconSize: [0,0], iconAnchor: [30, 12] }) }).addTo(map);

      // Inland legs (if incoterms require)
      const buyLevel = { EXW:0,FCA:1,FAS:2,FOB:3,CFR:5,CIF:6,CPT:5,CIP:6,DAP:8,DPU:9,DDP:10 }[buyIncoterm] || 0;
      const sellLevel = { EXW:0,FCA:1,FAS:2,FOB:3,CFR:5,CIF:6,CPT:5,CIP:6,DAP:8,DPU:9,DDP:10 }[sellIncoterm] || 0;

      if (buyLevel < 3 && isOcean) {
        const off = [buyCoords[0] + 0.4, buyCoords[1] + 0.6];
        L.polyline([buyCoords, off], { color: "#FF9100", weight: 2.5, opacity: 0.7, dashArray: "6 4" }).addTo(map);
        L.marker(off, { icon: L.divIcon({ className: "", html: '<div style="background:rgba(255,145,0,0.85);color:#FFF;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600">\uD83D\uDE9A Inland</div>', iconSize: [0,0], iconAnchor: [20, -4] }) }).addTo(map);
      }
      if (sellLevel >= 8 && isOcean) {
        const off = [sellCoords[0] - 0.4, sellCoords[1] - 0.6];
        L.polyline([off, sellCoords], { color: "#FF9100", weight: 2.5, opacity: 0.7, dashArray: "6 4" }).addTo(map);
        L.marker(off, { icon: L.divIcon({ className: "", html: '<div style="background:rgba(255,145,0,0.85);color:#FFF;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600">\uD83D\uDE9A Inland</div>', iconSize: [0,0], iconAnchor: [20, -4] }) }).addTo(map);
      }

      map.fitBounds([buyCoords, sellCoords], { padding: [80, 80] });
      setStatus("ready");

      // Fetch freight estimate
      try {
        const fRes = await fetch("/api/freight-estimate?olat=" + buyCoords[0] + "&olng=" + buyCoords[1] + "&dlat=" + sellCoords[0] + "&dlng=" + sellCoords[1] + "&origin=" + encodeURIComponent(buyLocation) + "&dest=" + encodeURIComponent(sellLocation) + "&mode=" + (transportMode || "ocean"));
        if (fRes.ok) { const fData = await fRes.json(); setFreight(fData); }
      } catch {}
    };

    init();
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [buyLocation, sellLocation, buyIncoterm, sellIncoterm, transportMode]);

  if (!buyLocation || !sellLocation) {
    return <div style={{ background: "#1A1A2E", borderRadius: 12, padding: 48, textAlign: "center", color: "#555", fontSize: 13 }}>Enter supplier and customer locations in the Deal Sheet to see the trade route map.</div>;
  }

  return (
    <div>
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #2A2A3E" }}>
        <div ref={mapRef} style={{ height: 380, background: "#1A1A2E" }} />
        {status === "loading" && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", padding: "12px 24px", borderRadius: 12, fontSize: 13, color: "#00E5FF", border: "1px solid #00E5FF30" }}>Loading route...</div>}
        {status === "geo-fail" && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.8)", padding: "12px 24px", borderRadius: 12, fontSize: 12, color: "#FF5252", border: "1px solid #FF525230" }}>Could not geocode locations. Try more specific place names.</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: "#888", display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 16, height: 2, background: "#00E5FF", borderRadius: 1 }} /> Ocean</span>
        <span style={{ fontSize: 10, color: "#888", display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 16, height: 2, background: "#FF9100", borderRadius: 1 }} /> Inland</span>
        <span style={{ fontSize: 10, color: "#888" }}><span style={{ color: "#4CAF50" }}>{"\u25CF"}</span> Supplier</span>
        <span style={{ fontSize: 10, color: "#888" }}><span style={{ color: "#FF5252" }}>{"\u25CF"}</span> Customer</span>
      </div>

      {freight && (
        <div style={{ marginTop: 16, background: "#FAFAF8", borderRadius: 8, border: "1px solid #E8E4DC", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1B4332" }}>Freight Cost Estimate ({freight.container_type})</div>
            <div style={{ fontSize: 10, color: "#AAA" }}>{freight.route.distance_km.toLocaleString()} km \u2022 ~{freight.transit_days} days \u2022 {freight.source}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Ocean Freight", value: freight.estimates.ocean_freight, color: "#1565C0" },
              { label: "BAF Surcharge", value: freight.estimates.baf_surcharge, color: "#0D47A1" },
              { label: "THC Handling", value: freight.estimates.thc_handling, color: "#4527A0" },
              { label: "Origin Inland", value: freight.estimates.origin_inland, color: "#E65100" },
              { label: "Dest Inland", value: freight.estimates.dest_inland, color: "#BF360C" },
              { label: "Insurance", value: freight.estimates.cargo_insurance, color: "#2E7D32" },
              { label: "Documentation", value: freight.estimates.documentation, color: "#546E7A" },
              { label: "Total Estimate", value: freight.estimates.total, color: "#1B4332", bold: true },
            ].map((item, i) => (
              <div key={i} style={{ padding: "8px 10px", background: item.bold ? "#1B4332" : "#FFF", borderRadius: 6, border: item.bold ? "none" : "1px solid #E8E4DC" }}>
                <div style={{ fontSize: 10, color: item.bold ? "#A5D6A7" : "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>{item.label}</div>
                <div style={{ fontSize: item.bold ? 18 : 14, fontWeight: item.bold ? 800 : 600, color: item.bold ? "#FFF" : item.color, fontFamily: "monospace", marginTop: 2 }}>${item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#BBB", marginTop: 8, fontStyle: "italic" }}>{freight.disclaimer}</div>
        </div>
      )}
    </div>
  );
}


/* ── Sidebar ── */
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
  const [editedAmounts, setEditedAmounts] = useState({});
  const [newLines, setNewLines] = useState([]);
  const [costDirty, setCostDirty] = useState(false);
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    trade_type: deal?.trade_type || "cross_border_direct",
    transport_mode: deal?.transport_mode || "ocean",
    customer_id: deal?.customer_id || null,
    customer_name: deal?.customer?.name || "",
    supplier_id: deal?.supplier_id || null,
    supplier_name: deal?.supplier?.name || "",
    product_id: deal?.product_id || null,
    product_name: deal?.product?.name || "",
    buy_incoterm: deal?.buy_incoterm || "FOB",
    buy_location: deal?.buy_location || "",
    sell_incoterm: deal?.sell_incoterm || "CIF",
    sell_location: deal?.sell_location || "",
    unit_price: deal?.unit_price || "",
    hs_code: deal?.hs_code || deal?.product?.hs_code || "",
    cost_currency: deal?.cost_currency || "USD",
    customer_payment_terms: deal?.customer_payment_terms || "Net 60",
  });
  const gap = calculateIncotermGap(form.buy_incoterm, form.sell_incoterm);
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Fetch master data
  useEffect(() => {
    fetch("/api/counterparties?type=customer").then(r => r.ok ? r.json() : []).then(setCustomers).catch(() => {});
    fetch("/api/counterparties?type=supplier").then(r => r.ok ? r.json() : []).then(setSuppliers).catch(() => {});
    fetch("/api/products").then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

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
      if (res.ok) {
        onSaved(saved);
        // Refresh master data lists after save (new counterparties may have been created)
        fetch("/api/counterparties?type=customer").then(r => r.ok ? r.json() : []).then(setCustomers).catch(() => {});
        fetch("/api/counterparties?type=supplier").then(r => r.ok ? r.json() : []).then(setSuppliers).catch(() => {});
      } else alert(saved.error || "Failed to save");
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  const genMatrix = async () => {
    if (!deal?.id) { alert("Save the deal first."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/deals/" + deal.id + "/cost-matrix", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setCostMatrix({ ...data.matrix, cost_lines: data.cost_lines }); setEditedAmounts({}); setNewLines([]); setCostDirty(false); setStep(2); }
      else alert(data.error || "Failed");
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  const saveCostMatrix = async () => {
    if (!deal?.id || !costMatrix?.id) return;
    setSaving(true);
    try {
      const updates = Object.entries(editedAmounts).map(([id, amount]) => ({ id, amount }));
      const res = await fetch("/api/deals/" + deal.id + "/cost-matrix", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix_id: costMatrix.id, updates, new_lines: newLines }),
      });
      if (res.ok) { const updated = await res.json(); setCostMatrix(updated); setEditedAmounts({}); setNewLines([]); setCostDirty(false); }
      else { const d = await res.json(); alert(d.error || "Failed to save"); }
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  const updateLineAmount = (lineId, value) => { setEditedAmounts(prev => ({ ...prev, [lineId]: value })); setCostDirty(true); };
  const addNewLine = () => { setNewLines(prev => [...prev, { line_item: "", amount: 0, block: "D", responsibility: "Trader" }]); setCostDirty(true); };
  const updateNewLine = (index, field, value) => { setNewLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l)); setCostDirty(true); };
  const removeNewLine = (index) => { setNewLines(prev => prev.filter((_, i) => i !== index)); setCostDirty(newLines.length > 1 || Object.keys(editedAmounts).length > 0); };

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
              <ComboBox
                label="Product"
                value={form.product_name}
                options={products}
                disabled={!isDraft}
                placeholder="Search products..."
                onSelect={(p) => setForm({ ...form, product_id: p.id, product_name: p.name, hs_code: p.hs_code || form.hs_code })}
                onCreate={(name) => setForm({ ...form, product_id: null, product_name: name })}
              />
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Supplier / Origin</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ComboBox
                label="Supplier"
                value={form.supplier_name}
                options={suppliers}
                disabled={!isDraft}
                placeholder="Search suppliers..."
                onSelect={(s) => setForm({ ...form, supplier_id: s.id, supplier_name: s.name, buy_location: s.country || form.buy_location })}
                onCreate={(name) => setForm({ ...form, supplier_id: null, supplier_name: name })}
              />
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Buy Incoterm</label><select style={S.select} disabled={!isDraft} value={form.buy_incoterm} onChange={f("buy_incoterm")}>{INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Location</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.buy_location} onChange={f("buy_location")} placeholder="e.g. Mumbai" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Unit Price ({form.cost_currency})</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.unit_price} onChange={f("unit_price")} type="number" step="0.01" placeholder="0.00" /></div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>HS Code</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" /></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer / Destination</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ComboBox
                label="Customer"
                value={form.customer_name}
                options={customers}
                disabled={!isDraft}
                placeholder="Search customers..."
                onSelect={(c) => setForm({ ...form, customer_id: c.id, customer_name: c.name, sell_location: c.country || form.sell_location })}
                onCreate={(name) => setForm({ ...form, customer_id: null, customer_name: name })}
              />
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
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Select existing customers, suppliers and products from the dropdowns, or type a new name to create one.</div>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Cost Matrix {costDirty && <span style={{ fontSize: 11, color: "#D4A017", marginLeft: 8 }}>{"\u25CF"} unsaved changes</span>}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {isDraft && costDirty && <button style={{ ...S.btn(true), background: "#D4A017" }} onClick={saveCostMatrix} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>}
                  {isDraft && <button style={S.btn(false)} onClick={addNewLine}>+ Add Cost</button>}
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#888" }}>Total COS</div><div style={{ fontSize: 20, fontWeight: 800, color: "#1B4332" }}>${(() => {
                    const existingTotal = (costMatrix.cost_lines || []).reduce((s, l) => s + (l.is_active ? (editedAmounts[l.id] !== undefined ? parseFloat(editedAmounts[l.id]) || 0 : l.amount || 0) : 0), 0);
                    const newTotal = newLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
                    return (existingTotal + newTotal).toLocaleString();
                  })()}</div></div>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...S.th, width: 40 }}>Blk</th><th style={S.th}>Cost Line</th><th style={S.th}>Type</th><th style={{ ...S.th, textAlign: "right", width: 140 }}>Amount</th><th style={S.th}>Resp.</th></tr></thead>
                <tbody>
                  {(costMatrix.cost_lines || []).sort((a, b) => a.sort_order - b.sort_order).map((c, i) => {
                    const blockColor = c.block === "A" ? "#1B7A43" : c.block === "B" ? "#D4A017" : c.block === "D" ? "#13B5EA" : "#6B2D5B";
                    const typeColor = c.cost_type === "base" ? "#1B7A43" : c.cost_type === "incoterm_gap" ? "#D4A017" : c.cost_type === "additional" ? "#13B5EA" : "#6B2D5B";
                    return (
                      <tr key={c.id || i} style={{ opacity: c.is_active === false ? 0.4 : 1 }}>
                        <td style={{ ...S.td, fontWeight: 700, color: blockColor }}>{c.block}</td>
                        <td style={{ ...S.td, fontWeight: c.block === "A" ? 700 : 400 }}>{c.line_item}</td>
                        <td style={S.td}><span style={S.badge(typeColor)}>{(c.cost_type || "").replace("_", " ")}</span></td>
                        <td style={{ ...S.td, textAlign: "right" }}>
                          {isDraft ? (
                            <input type="number" step="0.01"
                              style={{ width: 110, padding: "4px 8px", border: editedAmounts[c.id] !== undefined ? "2px solid #D4A017" : "1px solid #D5D0C6", borderRadius: 4, fontSize: 13, fontFamily: "monospace", textAlign: "right", outline: "none", background: editedAmounts[c.id] !== undefined ? "#FFFDE7" : "#FAFAF8" }}
                              value={editedAmounts[c.id] !== undefined ? editedAmounts[c.id] : c.amount || 0}
                              onChange={(e) => updateLineAmount(c.id, e.target.value)}
                            />
                          ) : (
                            <span style={{ fontFamily: "monospace" }}>${(c.amount || 0).toLocaleString()}</span>
                          )}
                        </td>
                        <td style={S.td}>{c.responsibility}</td>
                      </tr>
                    );
                  })}
                  {newLines.map((nl, i) => (
                    <tr key={"new-" + i} style={{ background: "#F0FFF4" }}>
                      <td style={{ ...S.td, fontWeight: 700, color: "#13B5EA" }}>D</td>
                      <td style={S.td}><input style={{ ...S.input, padding: "4px 8px", fontSize: 13, border: "1px solid #B8D4F0", background: "#F0F7FF" }} placeholder="Cost description..." value={nl.line_item} onChange={(e) => updateNewLine(i, "line_item", e.target.value)} /></td>
                      <td style={S.td}><span style={S.badge("#13B5EA")}>additional</span></td>
                      <td style={{ ...S.td, textAlign: "right" }}><input type="number" step="0.01" style={{ width: 110, padding: "4px 8px", border: "1px solid #B8D4F0", borderRadius: 4, fontSize: 13, fontFamily: "monospace", textAlign: "right", outline: "none", background: "#F0F7FF" }} placeholder="0.00" value={nl.amount || ""} onChange={(e) => updateNewLine(i, "amount", e.target.value)} /></td>
                      <td style={{ ...S.td, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12 }}>Trader</span><button onClick={() => removeNewLine(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#C62828", padding: 2 }}>{"\u2715"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isDraft && <div style={{ marginTop: 12, fontSize: 11, color: "#AAA" }}>Click any amount to edit. Use "+ Add Cost" for additional line items.</div>}
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Feasibility</div>
            {costMatrix ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  {[{ l: "Supplier (A)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="A").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount),0) },
                    { l: "Incoterm Gap (B)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="B").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount),0) },
                    { l: "Business Charges (C)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="C").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount),0) },
                    { l: "Additional Costs (D)", v: (costMatrix.cost_lines||[]).filter(l=>l.block==="D").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount),0) + newLines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0) },
                    { l: "Total COS", v: (costMatrix.cost_lines||[]).filter(l=>l.is_active!==false).reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount||0),0) + newLines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0), bold: true }
                  ].filter(r => r.v > 0 || r.bold).map((r,i) => (
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

          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Trade Route</div>
            <TradeRouteMap
              buyLocation={form.buy_location}
              sellLocation={form.sell_location}
              buyIncoterm={form.buy_incoterm}
              sellIncoterm={form.sell_incoterm}
              transportMode={form.transport_mode}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "none" }}>
          {/* customs and postcalc placeholders */}
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
