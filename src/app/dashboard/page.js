'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { calculateIncotermGap, INCOTERMS_2020 } from "@/lib/incoterms";
import { WORLD_PORTS, getEstimatedVoyages } from "@/lib/ports";
import GuidedTour from "@/components/GuidedTour";
import ContainerCalculator from "@/components/ContainerCalculator";

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

/* ── Port ComboBox: searchable port selector with UN/LOCODE ── */
function PortComboBox({ label, value, onSelect, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.length >= 2
    ? WORLD_PORTS.filter(p => (p.name + " " + p.country + " " + p.code).toLowerCase().includes(search.toLowerCase())).slice(0, 15)
    : [];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        style={{ ...S.input, background: disabled ? "#F0EDE6" : "#FFF", borderColor: open ? "#1B4332" : "#D5D0C6", fontFamily: value ? "monospace" : "inherit" }}
        readOnly={disabled}
        placeholder={placeholder || "Type port name or code..."}
        value={open ? search : value ? (value.code + " - " + value.name) : ""}
        onFocus={() => { if (!disabled) { setOpen(true); setSearch(""); } }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {open && !disabled && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#FFF", border: "1px solid #D5D0C6", borderRadius: "0 0 6px 6px", maxHeight: 220, overflowY: "auto", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {search.length < 2 && <div style={{ padding: "8px 12px", fontSize: 11, color: "#AAA" }}>Type at least 2 characters to search ports...</div>}
          {filtered.map((p) => (
            <div key={p.code} onClick={() => { onSelect(p); setOpen(false); setSearch(""); }}
              style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #F0EDE6" }}
              onMouseOver={(e) => e.target.style.background = "#F0FFF4"}
              onMouseOut={(e) => e.target.style.background = "#FFF"}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1B4332", marginRight: 6 }}>{p.code}</span>
              {p.name} <span style={{ color: "#888", fontSize: 10 }}>({p.country})</span>
            </div>
          ))}
          {search.length >= 2 && filtered.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "#AAA" }}>No ports found for "{search}"</div>}
        </div>
      )}
    </div>
  );
}

/* ── Trade Route Map (Premium Dark Theme + Freight Estimates) ── */
function TradeRouteMap({ buyLocation, sellLocation, buyIncoterm, sellIncoterm, transportMode, onFreightLoaded }) {
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
        if (fRes.ok) { const fData = await fRes.json(); setFreight(fData); if (onFreightLoaded) onFreightLoaded(fData); }
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
function Sidebar({ active, onNav, user, onLogout, role, onRoleToggle }) {
  const traderItems = [
    { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
    { key: "deals", icon: "\u25C8", label: "Deals" },
    { key: "precalc", icon: "\u25A3", label: "Pre-Calc" },
    { key: "container", icon: "\u25A8", label: "Container Calc" },
    { key: "customs", icon: "\u25C6", label: "Customs" },
    { key: "postcalc", icon: "\u25C9", label: "Post-Calc" },
    { key: "master", icon: "\u25A0", label: "Master Data" },
    { key: "settings", icon: "\u2699", label: "Settings" },
  ];
  const forwarderItems = [
    { key: "dashboard", icon: "\u25FB", label: "Dashboard" },
    { key: "deals", icon: "\u25C8", label: "Jobs" },
    { key: "precalc", icon: "\u25A3", label: "Quotation" },
    { key: "container", icon: "\u25A8", label: "Container Calc" },
    { key: "customs", icon: "\u25C6", label: "Customs" },
    { key: "postcalc", icon: "\u25C9", label: "Post-Job P&L" },
    { key: "master", icon: "\u25A0", label: "Master Data" },
    { key: "settings", icon: "\u2699", label: "Settings" },
  ];
  const items = role === "forwarder" ? forwarderItems : traderItems;
  return (
    <div style={S.sidebar} data-tour="sidebar">
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>GTM</div>
        <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "1.5px", marginTop: 2 }}>PHLO SYSTEMS</div>
      </div>
      <div style={{ flex: 1, padding: "12px 0" }}>
        {items.map((i) => (
          <div key={i.key} data-tour={"nav-" + i.key} onClick={() => onNav(i.key)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13,
            fontWeight: active === i.key ? 700 : 400, background: active === i.key ? "rgba(255,255,255,0.1)" : "transparent",
            borderLeft: active === i.key ? "3px solid #FFF" : "3px solid transparent",
          }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>{i.icon}</span>{i.label}
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
          {[{ k: "trader", l: "Trader" }, { k: "forwarder", l: "Forwarder" }].map(r => (
            <div key={r.k} onClick={() => onRoleToggle(r.k)} style={{ flex: 1, padding: "6px 0", textAlign: "center", fontSize: 10, fontWeight: 700, cursor: "pointer", background: role === r.k ? "#A5D6A7" : "rgba(255,255,255,0.08)", color: role === r.k ? "#1B4332" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }}>{r.l}</div>
          ))}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5 }}>{user?.email}</div>
        <div onClick={onLogout} style={{ marginTop: 6, cursor: "pointer", color: "#FF9999", fontWeight: 600, fontSize: 11 }}>Sign Out</div>
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

function DealsList({ deals, onOpenDeal, onNewDeal, onDeleteDeal }) {
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
            <thead><tr><th style={S.th}>Deal ID</th><th style={S.th}>Customer</th><th style={S.th}>Supplier</th><th style={S.th}>Incoterms</th><th style={S.th}>Status</th><th style={{ ...S.th, textAlign: "right" }}>Margin</th><th style={{ ...S.th, width: 40 }}></th></tr></thead>
            <tbody>{deals.map(d => (
              <tr key={d.id} onClick={() => onOpenDeal(d)} style={{ cursor: "pointer" }}>
                <td style={{ ...S.td, fontWeight: 700, color: "#1B4332" }}>{d.deal_number}</td>
                <td style={S.td}>{d.customer?.name || "\u2014"}</td>
                <td style={S.td}>{d.supplier?.name || "\u2014"}</td>
                <td style={{ ...S.td, fontSize: 11 }}><span style={{ color: "#1B7A43" }}>{d.buy_incoterm || "\u2014"}</span> {"\u2192"} <span style={{ color: "#C62828" }}>{d.sell_incoterm || "\u2014"}</span></td>
                <td style={S.td}><span style={S.badge(statusColor[d.status] || "#888")}>{d.status}</span></td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{d.gross_margin_pct > 0 ? d.gross_margin_pct.toFixed(1) + "%" : "\u2014"}</td>
                <td style={S.td}>{d.status === "draft" && <button onClick={(e) => { e.stopPropagation(); onDeleteDeal(d); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#C62828", fontSize: 14 }}>{"\u2715"}</button>}</td>
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
  const [freightData, setFreightData] = useState(null);
  const [customsData, setCustomsData] = useState(null);
  const [customsLoading, setCustomsLoading] = useState(false);
  const [hsSuggestions, setHsSuggestions] = useState(null);
  const [hsLoading, setHsLoading] = useState(false);
  const [voyages, setVoyages] = useState(null);
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
    supplier_payment_terms: deal?.supplier_payment_terms || "Net 30",
    quantity: deal?.quantity || "",
    quantity_unit: deal?.quantity_unit || "MT",
    selling_price: deal?.selling_price || "",
    expected_shipment_date: deal?.expected_shipment_date || "",
    sales_currency: deal?.sales_currency || "USD",
    port_of_origin: deal?.port_of_origin ? WORLD_PORTS.find(p => p.code === deal.port_of_origin) : null,
    port_of_dest: deal?.port_of_dest ? WORLD_PORTS.find(p => p.code === deal.port_of_dest) : null,
    supplier_inland_address: deal?.supplier_inland_address || "",
    customer_inland_address: deal?.customer_inland_address || "",
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
      // Strip UI-only fields that don't exist in DB
      const payload = { ...form };
      delete payload.port_of_origin;
      delete payload.port_of_dest;
      delete payload.supplier_inland_address;
      delete payload.customer_inland_address;
      // Convert empty strings to null for numeric/date fields
      if (payload.unit_price === "") payload.unit_price = null;
      if (payload.selling_price === "") payload.selling_price = null;
      if (payload.quantity === "") payload.quantity = null;
      if (payload.expected_shipment_date === "") payload.expected_shipment_date = null;
      const url = deal?.id ? "/api/deals/" + deal.id : "/api/deals";
      const res = await fetch(url, { method: deal?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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

  const fetchCustomsEstimate = async () => {
    if (!form.sell_location || !form.hs_code) return;
    setCustomsLoading(true);
    try {
      const cargoValue = (parseFloat(form.unit_price) || 100) * 10000; // rough per-container value
      const res = await fetch("/api/customs-estimate?hs_code=" + encodeURIComponent(form.hs_code) + "&destination=" + encodeURIComponent(form.sell_location) + "&cargo_value=" + cargoValue);
      if (res.ok) { const data = await res.json(); setCustomsData(data); }
      else { const err = await res.json(); alert(err.error || "Could not estimate customs"); }
    } catch (err) { alert("Error: " + err.message); }
    setCustomsLoading(false);
  };

  const applyFreightToCostMatrix = () => {
    if (!freightData) return;
    const fe = freightData.estimates;
    const freightLines = [
      { line_item: "Ocean Freight (" + freightData.container_type + ")", amount: fe.ocean_freight, block: "B", responsibility: "Trader" },
      { line_item: "BAF Surcharge", amount: fe.baf_surcharge, block: "B", responsibility: "Trader" },
      { line_item: "Terminal Handling (THC)", amount: fe.thc_handling, block: "B", responsibility: "Trader" },
    ];
    if (fe.origin_inland > 0) freightLines.push({ line_item: "Origin Inland Transport", amount: fe.origin_inland, block: "B", responsibility: "Trader" });
    if (fe.dest_inland > 0) freightLines.push({ line_item: "Destination Inland Transport", amount: fe.dest_inland, block: "B", responsibility: "Trader" });
    if (fe.cargo_insurance > 0) freightLines.push({ line_item: "Cargo Insurance", amount: fe.cargo_insurance, block: "B", responsibility: "Trader" });
    if (fe.documentation > 0) freightLines.push({ line_item: "Freight Documentation", amount: fe.documentation, block: "B", responsibility: "Trader" });

    // Update existing Block B lines by matching names, or replace all Block B
    if (costMatrix && costMatrix.cost_lines) {
      const existingB = costMatrix.cost_lines.filter(l => l.block === "B");
      if (existingB.length > 0) {
        // Update existing Block B amounts to 0 (clear them)
        const updates = {};
        existingB.forEach(l => { updates[l.id] = 0; });
        setEditedAmounts(prev => ({ ...prev, ...updates }));
      }
    }
    // Add freight lines as new (they'll be saved as Block B via the PUT endpoint)
    setNewLines(prev => [...prev, ...freightLines]);
    setCostDirty(true);
    setStep(2);
  };

  const suggestHsCode = async () => {
    if (!form.product_name) return;
    setHsLoading(true);
    try {
      const res = await fetch("/api/suggest-hs-code?product=" + encodeURIComponent(form.product_name));
      if (res.ok) { const data = await res.json(); setHsSuggestions(data.suggestions); }
    } catch {}
    setHsLoading(false);
  };

  const fetchVoyages = () => {
    if (!form.port_of_origin || !form.port_of_dest) return;
    const result = getEstimatedVoyages(form.port_of_origin.code, form.port_of_dest.code);
    setVoyages(result);
  };

  const applyCustomsToCostMatrix = () => {
    if (!customsData) return;
    const ce = customsData.estimates;
    const customsLines = [
      { line_item: "Import Duty (" + ce.import_duty_rate + "% - " + customsData.country.name + ")", amount: ce.import_duty, block: "D", responsibility: "Trader" },
      { line_item: "VAT/GST (" + ce.vat_rate + "% - " + customsData.country.name + ")", amount: ce.vat_amount, block: "D", responsibility: "Trader" },
      { line_item: "Customs Brokerage", amount: ce.customs_brokerage, block: "D", responsibility: "Trader" },
      { line_item: "Inspection Fees", amount: ce.inspection_fees, block: "D", responsibility: "Trader" },
    ];
    setNewLines(prev => [...prev, ...customsLines]);
    setCostDirty(true);
    setStep(2);
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

  const generatePOSO = async () => {
    // Load SheetJS from CDN
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      document.head.appendChild(s);
      await new Promise(r => { s.onload = r; });
    }
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const now = new Date().toISOString().split("T")[0];
    const dn = deal?.deal_number || "DRAFT";
    const cl = costMatrix?.cost_lines || [];
    const totalCost = cl.filter(l => l.is_active !== false).reduce((s, l) => s + (l.amount || 0), 0);

    // ── Purchase Order sheet ──
    const poData = [
      ["PURCHASE ORDER"],
      [""],
      ["PO Reference:", dn + "-PO"],
      ["Date:", now],
      ["Status:", deal?.status || "draft"],
      [""],
      ["SUPPLIER DETAILS"],
      ["Supplier:", form.supplier_name],
      ["Buy Incoterm:", form.buy_incoterm + " " + form.buy_location],
      ["Port of Loading:", form.port_of_origin ? form.port_of_origin.code + " - " + form.port_of_origin.name : form.buy_location],
      ["Payment Terms:", form.supplier_payment_terms],
      [""],
      ["PRODUCT DETAILS"],
      ["Product:", form.product_name],
      ["HS Code:", form.hs_code],
      ["Quantity:", form.quantity + " " + form.quantity_unit],
      ["Unit Price:", form.cost_currency + " " + (form.unit_price || 0)],
      ["Total Value:", form.cost_currency + " " + ((parseFloat(form.unit_price) || 0) * (parseFloat(form.quantity) || 0)).toLocaleString()],
      ["Expected Shipment:", form.expected_shipment_date],
      ["Transport Mode:", form.transport_mode],
      [""],
      ["COST BREAKDOWN"],
      ["Block", "Cost Line", "Type", "Amount (USD)"],
    ];
    cl.sort((a, b) => a.sort_order - b.sort_order).forEach(c => {
      if (c.is_active !== false) poData.push([c.block, c.line_item, c.cost_type, c.amount || 0]);
    });
    poData.push(["", "", "TOTAL COS", totalCost]);
    poData.push([""]);
    poData.push(["Generated by GTM - Phlo Systems | " + now]);

    const poSheet = XLSX.utils.aoa_to_sheet(poData);
    poSheet["!cols"] = [{ wch: 18 }, { wch: 35 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, poSheet, "Purchase Order");

    // ── Sales Order sheet ──
    const soData = [
      ["SALES ORDER"],
      [""],
      ["SO Reference:", dn + "-SO"],
      ["Date:", now],
      ["Status:", deal?.status || "draft"],
      [""],
      ["CUSTOMER DETAILS"],
      ["Customer:", form.customer_name],
      ["Sell Incoterm:", form.sell_incoterm + " " + form.sell_location],
      ["Port of Discharge:", form.port_of_dest ? form.port_of_dest.code + " - " + form.port_of_dest.name : form.sell_location],
      ["Payment Terms:", form.customer_payment_terms],
      form.customer_inland_address ? ["Delivery Address:", form.customer_inland_address] : [],
      [""],
      ["PRODUCT DETAILS"],
      ["Product:", form.product_name],
      ["HS Code:", form.hs_code],
      ["Quantity:", form.quantity + " " + form.quantity_unit],
      ["Selling Price:", form.sales_currency + " " + (form.selling_price || 0) + " per " + form.quantity_unit],
      ["Total Sales Value:", form.sales_currency + " " + ((parseFloat(form.selling_price) || 0) * (parseFloat(form.quantity) || 0)).toLocaleString()],
      [""],
      ["MARGIN SUMMARY"],
      ["Total COS:", "USD " + totalCost.toLocaleString()],
      ["Sales Revenue:", form.sales_currency + " " + ((parseFloat(form.selling_price) || 0) * (parseFloat(form.quantity) || 0)).toLocaleString()],
      ["Gross Margin:", (costMatrix?.gross_margin_pct || 0).toFixed(1) + "%"],
      [""],
      ["SHIPMENT"],
      ["Expected Shipment:", form.expected_shipment_date],
      ["Transport Mode:", form.transport_mode],
      ["Origin:", form.buy_location],
      ["Destination:", form.sell_location],
      [""],
      ["ACTUALS (fill in after execution)"],
      ["Actual Sales Revenue:", ""],
      ["Payment Delay (extra days):", ""],
      [""],
      ["Generated by GTM - Phlo Systems | " + now],
    ].filter(r => r.length > 0);

    const soSheet = XLSX.utils.aoa_to_sheet(soData);
    soSheet["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, soSheet, "Sales Order");

    // ── Cost Matrix sheet ──
    const cmData = [
      ["COST MATRIX - " + dn],
      [""],
      ["Block", "Cost Line", "Type", "Budget (USD)", "Actual (USD)", "Variance", "Responsibility", "Active"],
      ["", "", "", "", "FILL IN ACTUALS", "AUTO-CALC", "", ""],
    ];
    cl.sort((a, b) => a.sort_order - b.sort_order).forEach((c, i) => {
      if (c.is_active !== false) {
        const row = i + 5; // Excel row (1-indexed, after header rows)
        cmData.push([c.block, c.line_item, c.cost_type, c.amount || 0, "", "=E" + row + "-D" + row, c.responsibility, "Yes"]);
      }
    });
    const totalRow = cmData.length + 1;
    cmData.push(["", "", "TOTAL", totalCost, "=SUM(E5:E" + (totalRow - 1) + ")", "=E" + totalRow + "-D" + totalRow]);
    cmData.push([""]);
    cmData.push(["INSTRUCTIONS: Fill in the ACTUAL costs in column E (yellow). Variance is auto-calculated."]);
    cmData.push(["Upload this file back to GTM > Post-Calc to run Budget vs Actual analysis."]);

    const cmSheet = XLSX.utils.aoa_to_sheet(cmData);
    cmSheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, cmSheet, "Cost Matrix");

    XLSX.writeFile(wb, dn + "_PO_SO_" + now + ".xlsx");
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
          {deal?.status === "approved" && <button style={{ ...S.btn(true), background: "#0D47A1" }} onClick={generatePOSO}>Download PO/SO (Excel)</button>}
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
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
                <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Quantity</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} type="number" value={form.quantity} onChange={f("quantity")} placeholder="e.g. 100" /></div>
                <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Unit</label><select style={S.select} disabled={!isDraft} value={form.quantity_unit} onChange={f("quantity_unit")}><option>MT</option><option>KG</option><option>CBM</option><option>Units</option><option>Containers</option><option>Bags</option><option>Drums</option></select></div>
              </div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Expected Shipment Date</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} type="date" value={form.expected_shipment_date} onChange={f("expected_shipment_date")} /></div>
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
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>HS Code</label><div style={{ display: "flex", gap: 4 }}><input style={{ ...S.input, flex: 1, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" />{isDraft && form.product_name && <button style={{ ...S.btn(false), padding: "4px 8px", fontSize: 11, whiteSpace: "nowrap" }} onClick={suggestHsCode} disabled={hsLoading}>{hsLoading ? "..." : "Suggest"}</button>}</div>
              {hsSuggestions && <div style={{ marginTop: 4 }}>{hsSuggestions.map((s,i) => <div key={i} onClick={() => { setForm({...form, hs_code: s.hs_code}); setHsSuggestions(null); }} style={{ fontSize: 10, padding: "3px 6px", cursor: "pointer", background: "#F0F7FF", borderRadius: 4, marginTop: 2, border: "1px solid #B8D4F0" }}><strong>{s.hs_code}</strong> {s.description} <span style={{ color: "#888" }}>({s.confidence})</span></div>)}</div>}
              </div>
              {form.transport_mode === "ocean" && <PortComboBox label="Port of Loading" value={form.port_of_origin} disabled={!isDraft} placeholder="e.g. INNSA, Mumbai..." onSelect={(p) => setForm({ ...form, port_of_origin: p, buy_location: p.name + ", " + p.country })} />}
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Supplier Payment Terms</label><select style={S.select} disabled={!isDraft} value={form.supplier_payment_terms} onChange={f("supplier_payment_terms")}><option>Net 30</option><option>Net 60</option><option>Net 90</option><option>LC at Sight</option><option>LC 30 Days</option><option>LC 60 Days</option><option>TT Advance</option><option>CAD</option></select></div>
              {["EXW", "FCA"].includes(form.buy_incoterm) && <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Supplier Inland Address</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.supplier_inland_address} onChange={f("supplier_inland_address")} placeholder="Factory/warehouse address for pickup" /></div>}
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
              {form.transport_mode === "ocean" && <PortComboBox label="Port of Discharge" value={form.port_of_dest} disabled={!isDraft} placeholder="e.g. ZADUR, Durban..." onSelect={(p) => setForm({ ...form, port_of_dest: p, sell_location: p.name + ", " + p.country })} />}
              {["DAP", "DPU", "DDP"].includes(form.sell_incoterm) && <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Customer Inland Address</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} value={form.customer_inland_address} onChange={f("customer_inland_address")} placeholder="Delivery address for inland transport" /></div>}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
                <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Selling Price (per {form.quantity_unit})</label><input style={{ ...S.input, background: isDraft ? "#FFF" : "#F0EDE6" }} readOnly={!isDraft} type="number" step="0.01" value={form.selling_price} onChange={f("selling_price")} placeholder="0.00" /></div>
                <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Currency</label><select style={S.select} disabled={!isDraft} value={form.sales_currency} onChange={f("sales_currency")}><option>USD</option><option>ZAR</option><option>GBP</option><option>EUR</option><option>AED</option></select></div>
              </div>
              <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Cost Currency</label><select style={S.select} disabled={!isDraft} value={form.cost_currency} onChange={f("cost_currency")}><option>USD</option><option>ZAR</option><option>GBP</option><option>EUR</option><option>AED</option></select></div>
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
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Deal P&L / Feasibility</div>
            {costMatrix ? (() => {
              // Helper: payment terms to days
              const termsToDays = (t) => {
                if (!t) return 30;
                const m = { "TT Advance": 0, "CAD": 0, "LC at Sight": 7, "Net 30": 30, "LC 30 Days": 30, "Net 60": 60, "LC 60 Days": 60, "Net 90": 90 };
                return m[t] !== undefined ? m[t] : 30;
              };

              const qty = parseFloat(form.quantity) || 0;
              const sellPx = parseFloat(form.selling_price) || 0;
              const salesRevenue = sellPx * qty;

              const blockA = (costMatrix.cost_lines||[]).filter(l=>l.block==="A").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount||0),0);
              const blockB = (costMatrix.cost_lines||[]).filter(l=>l.block==="B").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount||0),0);
              const blockC = (costMatrix.cost_lines||[]).filter(l=>l.block==="C").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount||0),0);
              const blockD = (costMatrix.cost_lines||[]).filter(l=>l.block==="D").reduce((s,l)=>s+(editedAmounts[l.id]!==undefined?parseFloat(editedAmounts[l.id])||0:l.amount||0),0) + newLines.reduce((s,l)=>s+(parseFloat(l.amount)||0),0);
              const totalCOS = blockA + blockB + blockC + blockD;
              const grossProfit = salesRevenue - totalCOS;
              const grossMarginPct = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

              // Finance cost: based on payment terms gap
              const supplierDays = termsToDays(form.supplier_payment_terms);
              const customerDays = termsToDays(form.customer_payment_terms);
              const financingDays = Math.max(0, customerDays - supplierDays);
              const annualRate = 0.12; // 12% p.a.
              const financeCost = financingDays > 0 ? Math.round(totalCOS * annualRate * financingDays / 365) : 0;

              const netProfit = grossProfit - financeCost;
              const netMarginPct = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
                  <div>
                    {/* Revenue */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Revenue</div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "2px solid #1B4332" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Sales Revenue ({qty} {form.quantity_unit} x {form.sales_currency} {sellPx})</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#1B7A43" }}>{form.sales_currency} {salesRevenue.toLocaleString()}</span>
                    </div>

                    {/* Cost of Sales */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 12, marginBottom: 6 }}>Cost of Sales</div>
                    {[
                      { l: "Supplier Cost (A)", v: blockA },
                      { l: "Freight & Logistics (B)", v: blockB },
                      { l: "Business Charges (C)", v: blockC },
                      { l: "Customs & Additional (D)", v: blockD },
                    ].filter(r => r.v > 0).map((r,i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #F0EDE6" }}>
                        <span style={{ fontSize: 13 }}>{r.l}</span>
                        <span style={{ fontFamily: "monospace", color: "#C62828" }}>({r.v.toLocaleString()})</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "2px solid #333", marginTop: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Total COS</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#C62828" }}>({totalCOS.toLocaleString()})</span>
                    </div>

                    {/* Gross Profit */}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", background: grossProfit >= 0 ? "#F0FFF4" : "#FFF5F5", margin: "4px -8px", paddingLeft: 8, paddingRight: 8, borderRadius: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Gross Profit</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: grossProfit >= 0 ? "#1B7A43" : "#C62828" }}>{form.sales_currency} {grossProfit.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 600 }}>({grossMarginPct.toFixed(1)}%)</span></span>
                    </div>

                    {/* Finance Cost */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 12, marginBottom: 6 }}>Finance Cost</div>
                    <div style={{ padding: "8px 10px", background: "#F5F5F5", borderRadius: 6, fontSize: 12, marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#666" }}>Supplier terms: <strong>{form.supplier_payment_terms}</strong> ({supplierDays} days)</span>
                        <span style={{ color: "#666" }}>Customer terms: <strong>{form.customer_payment_terms}</strong> ({customerDays} days)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#666" }}>Financing period: <strong>{financingDays} days</strong> {financingDays > 0 ? "(trader funds the gap)" : "(no financing needed)"}</span>
                        <span style={{ color: "#666" }}>Rate: <strong>12% p.a.</strong> = {(annualRate * financingDays / 365 * 100).toFixed(2)}% for {financingDays}d</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #F0EDE6" }}>
                      <span style={{ fontSize: 13 }}>Finance Cost ({financingDays}d @ 12% p.a. on {form.cost_currency} {totalCOS.toLocaleString()})</span>
                      <span style={{ fontFamily: "monospace", color: financeCost > 0 ? "#C62828" : "#888" }}>{financeCost > 0 ? "(" + financeCost.toLocaleString() + ")" : "\u2014"}</span>
                    </div>

                    {/* Net Profit */}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: 4, borderTop: "3px double #1B4332" }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>Net Profit</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: netProfit >= 0 ? "#1B7A43" : "#C62828" }}>{form.sales_currency} {netProfit.toLocaleString()} <span style={{ fontSize: 12 }}>({netMarginPct.toFixed(1)}%)</span></span>
                    </div>
                  </div>

                  {/* Right side: Summary cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ padding: 16, background: netProfit >= 0 ? "#F0FFF4" : "#FFF5F5", borderRadius: 8, border: "1px solid " + (netProfit >= 0 ? "#C6E6D0" : "#E6C6C6"), textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Net Margin</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: netMarginPct >= 5 ? "#1B7A43" : netMarginPct >= 0 ? "#D4A017" : "#C62828" }}>{netMarginPct.toFixed(1)}%</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{netMarginPct >= 8 ? "\u2713 Strong margin" : netMarginPct >= 5 ? "\u26A0 Acceptable" : netMarginPct >= 0 ? "\u26A0 Thin margin" : "\u2717 Loss-making"}</div>
                    </div>
                    <div style={{ padding: 12, background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC" }}>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Gross Margin</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#1B4332" }}>{grossMarginPct.toFixed(1)}%</div>
                    </div>
                    <div style={{ padding: 12, background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC" }}>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Finance Cost</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: financeCost > 0 ? "#D4A017" : "#888" }}>{form.cost_currency} {financeCost.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "#AAA" }}>{financingDays}d financing @ 12% p.a.</div>
                    </div>
                    <div style={{ padding: 12, background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC" }}>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Revenue vs Cost</div>
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ flex: 1, background: "#E8E4DC", borderRadius: 3, height: 8, overflow: "hidden" }}><div style={{ width: "100%", height: "100%", background: "#1B7A43", borderRadius: 3 }} /></div>
                          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#1B7A43" }}>{form.sales_currency} {salesRevenue.toLocaleString()}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, background: "#E8E4DC", borderRadius: 3, height: 8, overflow: "hidden" }}><div style={{ width: salesRevenue > 0 ? Math.min(100, (totalCOS + financeCost) / salesRevenue * 100) + "%" : "0%", height: "100%", background: "#C62828", borderRadius: 3 }} /></div>
                          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#C62828" }}>{form.cost_currency} {(totalCOS + financeCost).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {!salesRevenue && <div style={{ padding: 12, background: "#FFF8E1", borderRadius: 8, border: "1px solid #FFD54F", fontSize: 12, color: "#666" }}>{"\u26A0"} Enter selling price and quantity in the Deal Sheet to see the full P&L.</div>}
                  </div>
                </div>
              );
            })() : (
              <div style={{ textAlign: "center", padding: 32, color: "#888" }}>Generate a cost matrix first.</div>
            )}
          </div>

          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Trade Route & Freight</div>
              {freightData && costMatrix && isDraft && (
                <button style={{ ...S.btn(true), background: "#1565C0", fontSize: 12 }} onClick={applyFreightToCostMatrix}>
                  Apply Freight to Cost Matrix
                </button>
              )}
            </div>
            <TradeRouteMap
              buyLocation={form.buy_location}
              sellLocation={form.sell_location}
              buyIncoterm={form.buy_incoterm}
              sellIncoterm={form.sell_incoterm}
              transportMode={form.transport_mode}
              onFreightLoaded={setFreightData}
            />
          </div>

          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Customs & Import Duties</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btn(false)} onClick={fetchCustomsEstimate} disabled={customsLoading || !form.hs_code || !form.sell_location}>
                  {customsLoading ? "Fetching..." : "Fetch Customs Estimate"}
                </button>
                {customsData && costMatrix && isDraft && (
                  <button style={{ ...S.btn(true), background: "#6A1B9A", fontSize: 12 }} onClick={applyCustomsToCostMatrix}>
                    Apply Customs to Cost Matrix
                  </button>
                )}
              </div>
            </div>
            {!form.hs_code || !form.sell_location ? (
              <div style={{ padding: 24, textAlign: "center", color: "#AAA", fontSize: 13 }}>Enter an HS Code and destination location in the Deal Sheet to estimate customs costs.</div>
            ) : customsData ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#888" }}>Destination: <strong style={{ color: "#1A1A1A" }}>{customsData.country.name}</strong> | HS: <strong style={{ color: "#1A1A1A" }}>{customsData.hs_code}</strong> (Chapter {customsData.hs_chapter})</div>
                  <div style={{ fontSize: 10, color: "#AAA" }}>{customsData.source}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Import Duty (" + customsData.estimates.import_duty_rate + "%)", value: customsData.estimates.import_duty, color: "#6A1B9A" },
                    { label: "VAT/GST (" + customsData.estimates.vat_rate + "%)", value: customsData.estimates.vat_amount, color: "#4A148C" },
                    { label: "Customs Brokerage", value: customsData.estimates.customs_brokerage, color: "#7B1FA2" },
                    { label: "Inspection Fees", value: customsData.estimates.inspection_fees, color: "#8E24AA" },
                    { label: "Total Customs", value: customsData.estimates.total, color: "#1B4332", bold: true },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: "8px 10px", background: item.bold ? "#1B4332" : "#FFF", borderRadius: 6, border: item.bold ? "none" : "1px solid #E8E4DC" }}>
                      <div style={{ fontSize: 10, color: item.bold ? "#CE93D8" : "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>{item.label}</div>
                      <div style={{ fontSize: item.bold ? 18 : 14, fontWeight: item.bold ? 800 : 600, color: item.bold ? "#FFF" : item.color, fontFamily: "monospace", marginTop: 2 }}>${item.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: "#BBB", marginTop: 8, fontStyle: "italic" }}>{customsData.disclaimer}</div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "#AAA", fontSize: 13 }}>Click "Fetch Customs Estimate" to get duty and tax rates for {form.sell_location}.</div>
            )}
          </div>

          {form.transport_mode === "ocean" && form.port_of_origin && form.port_of_dest && (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Estimated Sailing Schedules</div>
                <button style={S.btn(false)} onClick={fetchVoyages}>Refresh Schedules</button>
              </div>
              {!voyages ? (
                <div style={{ padding: 24, textAlign: "center", color: "#AAA", fontSize: 13 }}>Select ports of loading and discharge, then click Refresh.</div>
              ) : !voyages.found ? (
                <div style={{ padding: 16, background: "#FFF8E1", borderRadius: 6, fontSize: 12, color: "#666" }}>{voyages.message}</div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Sailings every ~{voyages.frequency_days} days on this route</div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={S.th}>Carrier</th><th style={S.th}>Departure</th><th style={S.th}>Arrival</th><th style={S.th}>Transit</th></tr></thead>
                    <tbody>{voyages.voyages.map((v, i) => (
                      <tr key={i}>
                        <td style={{ ...S.td, fontWeight: 700, color: "#1B4332" }}>{v.carrier}</td>
                        <td style={S.td}>{v.departure}</td>
                        <td style={S.td}>{v.arrival}</td>
                        <td style={S.td}>{v.transit_days} days</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  <div style={{ fontSize: 9, color: "#BBB", marginTop: 8, fontStyle: "italic" }}>Estimated schedules based on typical sailing patterns. Actual schedules vary by carrier.</div>
                </div>
              )}
            </div>
          )}
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

/* ── Post-Calc: Budget vs Actual Variance Analysis ── */
function PostCalcScreen({ deals }) {
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [actualData, setActualData] = useState(null);
  const [loading, setLoading] = useState(false);

  const approvedDeals = deals.filter(d => d.status === "approved");

  const loadBudget = async (deal) => {
    setSelectedDeal(deal);
    setActualData(null);
    try {
      const res = await fetch("/api/deals/" + deal.id + "/cost-matrix");
      const data = await res.json();
      if (data && data.length > 0) setBudgetData(data[0]);
    } catch {}
    // Load saved actuals if any
    try {
      const res = await fetch("/api/deals/" + deal.id + "/actuals");
      const saved = await res.json();
      if (saved && saved.actual_cost_lines) {
        setActualData({ lines: JSON.parse(saved.actual_cost_lines), total: saved.actual_total_cost || 0, sales: saved.actual_sales_revenue || 0, payment_delay: saved.actual_payment_delay_days || 0, saved: true, saved_by: saved.uploaded_by, saved_at: saved.created_at });
      }
    } catch {}
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    // Load SheetJS
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      document.head.appendChild(s);
      await new Promise(r => { s.onload = r; });
    }

    try {
      const data = await file.arrayBuffer();
      const wb = window.XLSX.read(data);

      // Parse Cost Matrix sheet (or first sheet)
      const cmSheet = wb.Sheets["Cost Matrix"] || wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(cmSheet, { header: 1 });

      // Find cost lines - new format has Budget in col D (index 3) and Actual in col E (index 4)
      const actualLines = [];
      let totalActual = 0;
      for (const row of rows) {
        if (row[0] && ["A", "B", "C", "D"].includes(String(row[0]).trim()) && row[1]) {
          // Try column E (Actual) first, fall back to column D (Budget) if E is empty
          const actualAmt = row[4] !== undefined && row[4] !== "" && row[4] !== "FILL IN ACTUALS" ? parseFloat(row[4]) || 0 : parseFloat(row[3]) || 0;
          actualLines.push({ block: String(row[0]).trim(), line_item: String(row[1]).trim(), cost_type: String(row[2] || "").trim(), amount: actualAmt });
          totalActual += actualAmt;
        }
      }

      // Try to get actual sales from Sales Order sheet
      let actualSales = 0;
      let actualPaymentDelay = 0;
      const soSheet = wb.Sheets["Sales Order"];
      if (soSheet) {
        const soRows = window.XLSX.utils.sheet_to_json(soSheet, { header: 1 });
        for (const row of soRows) {
          if (String(row[0] || "").includes("Actual Sales Revenue")) actualSales = parseFloat(String(row[1] || "0").replace(/[^0-9.-]/g, "")) || 0;
          if (String(row[0] || "").includes("Payment Delay")) actualPaymentDelay = parseFloat(row[1]) || 0;
        }
      }

      setActualData({ lines: actualLines, total: totalActual, sales: actualSales, payment_delay: actualPaymentDelay, saved: false });
    } catch (err) { alert("Error parsing file: " + err.message); }
    setLoading(false);
  };

  const saveActuals = async () => {
    if (!selectedDeal || !actualData) return;
    setLoading(true);
    try {
      const res = await fetch("/api/deals/" + selectedDeal.id + "/actuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_cost_lines: JSON.stringify(actualData.lines),
          actual_total_cost: actualData.total,
          actual_sales_revenue: actualData.sales,
          actual_payment_delay_days: actualData.payment_delay,
          budget_total_cost: budgetTotal,
          variance_total: actualData.total - budgetTotal,
          variance_pct: budgetTotal > 0 ? ((actualData.total - budgetTotal) / budgetTotal * 100) : 0,
        }),
      });
      if (res.ok) {
        setActualData(prev => ({ ...prev, saved: true }));
        alert("Actuals saved successfully!");
      } else { const d = await res.json(); alert(d.error || "Failed to save"); }
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  };

  const budgetLines = budgetData?.cost_lines || [];
  const budgetTotal = budgetLines.filter(l => l.is_active !== false).reduce((s, l) => s + (l.amount || 0), 0);

  // Match budget to actual lines
  const getVariance = () => {
    if (!actualData || !budgetData) return [];
    const variance = [];
    const matchedActual = new Set();

    for (const bl of budgetLines.sort((a, b) => a.sort_order - b.sort_order)) {
      const al = actualData.lines.find((a, i) => !matchedActual.has(i) && (a.line_item.toLowerCase().includes(bl.line_item.toLowerCase().split("(")[0].trim().substring(0, 15)) || (a.block === bl.block && Math.abs(a.amount - bl.amount) < bl.amount * 0.5)));
      const alIdx = al ? actualData.lines.indexOf(al) : -1;
      if (alIdx >= 0) matchedActual.add(alIdx);
      variance.push({
        block: bl.block,
        line_item: bl.line_item,
        budget: bl.amount || 0,
        actual: al ? al.amount : 0,
        diff: (al ? al.amount : 0) - (bl.amount || 0),
        pct: bl.amount > 0 ? (((al ? al.amount : 0) - bl.amount) / bl.amount * 100) : 0,
      });
    }

    // Unmatched actual lines
    actualData.lines.forEach((al, i) => {
      if (!matchedActual.has(i)) {
        variance.push({ block: al.block, line_item: al.line_item + " (unbudgeted)", budget: 0, actual: al.amount, diff: al.amount, pct: 100 });
      }
    });

    return variance;
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Post-Trade Analytics</h2>

      {/* Deal Selector */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Select Approved Deal</div>
        {approvedDeals.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#AAA" }}>No approved deals yet. Approve a deal first to run post-trade analysis.</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {approvedDeals.map(d => (
              <button key={d.id} onClick={() => loadBudget(d)} style={{ ...S.btn(selectedDeal?.id === d.id), padding: "6px 14px", fontSize: 12 }}>
                {d.deal_number} {"\u2014"} {d.customer?.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedDeal && budgetData && (
        <>
          {/* Upload Section */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Upload Actuals from ERP</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Upload the PO/SO Excel with actual costs filled in (same format as downloaded). The Cost Matrix sheet should contain actual cost amounts.</div>
              </div>
              <label style={{ ...S.btn(true), cursor: "pointer" }}>
                {loading ? "Processing..." : "Upload Excel"} <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} style={{ display: "none" }} />
              </label>
              {actualData && !actualData.saved && <button style={{ ...S.btn(true), background: "#2E7D32" }} onClick={saveActuals} disabled={loading}>Save to System</button>}
              {actualData?.saved && <span style={{ fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>{"\u2713"} Saved{actualData.saved_by ? " by " + actualData.saved_by : ""}</span>}
            </div>
          </div>

          {/* Budget Summary (always shown when deal selected) */}
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Budgeted Cost Matrix ({selectedDeal.deal_number})</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={S.th}>Blk</th><th style={S.th}>Cost Line</th><th style={{ ...S.th, textAlign: "right" }}>Budget</th>{actualData && <th style={{ ...S.th, textAlign: "right" }}>Actual</th>}{actualData && <th style={{ ...S.th, textAlign: "right" }}>Variance</th>}{actualData && <th style={{ ...S.th, textAlign: "right" }}>%</th>}</tr></thead>
              <tbody>
                {actualData ? getVariance().map((v, i) => (
                  <tr key={i} style={{ background: Math.abs(v.pct) > 10 ? (v.diff > 0 ? "#FFF5F5" : "#F0FFF4") : "transparent" }}>
                    <td style={{ ...S.td, fontWeight: 700, color: v.block === "A" ? "#1B7A43" : v.block === "B" ? "#D4A017" : "#6B2D5B" }}>{v.block}</td>
                    <td style={S.td}>{v.line_item}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${v.budget.toLocaleString()}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${v.actual.toLocaleString()}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: v.diff > 0 ? "#C62828" : v.diff < 0 ? "#1B7A43" : "#888" }}>{v.diff > 0 ? "+" : ""}{v.diff.toLocaleString()}</td>
                    <td style={{ ...S.td, textAlign: "right", fontSize: 11, fontWeight: 600, color: v.diff > 0 ? "#C62828" : v.diff < 0 ? "#1B7A43" : "#888" }}>{v.pct > 0 ? "+" : ""}{v.pct.toFixed(1)}%</td>
                  </tr>
                )) : budgetLines.sort((a, b) => a.sort_order - b.sort_order).map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, fontWeight: 700, color: c.block === "A" ? "#1B7A43" : c.block === "B" ? "#D4A017" : "#6B2D5B" }}>{c.block}</td>
                    <td style={S.td}>{c.line_item}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>${(c.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #1B4332" }}>
                  <td style={S.td}></td><td style={{ ...S.td, fontWeight: 700 }}>Total</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>${budgetTotal.toLocaleString()}</td>
                  {actualData && <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 800 }}>${actualData.total.toLocaleString()}</td>}
                  {actualData && <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: (actualData.total - budgetTotal) > 0 ? "#C62828" : "#1B7A43" }}>{(actualData.total - budgetTotal) > 0 ? "+" : ""}{(actualData.total - budgetTotal).toLocaleString()}</td>}
                  {actualData && <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: (actualData.total - budgetTotal) > 0 ? "#C62828" : "#1B7A43" }}>{budgetTotal > 0 ? ((actualData.total - budgetTotal) / budgetTotal * 100).toFixed(1) : 0}%</td>}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Variance Attribution */}
          {actualData && (
            <div style={S.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Variance Attribution</div>
              {(() => {
                const v = getVariance();
                const totalVariance = actualData.total - budgetTotal;
                const sorted = [...v].filter(x => x.diff !== 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
                const maxAbs = sorted.length > 0 ? Math.abs(sorted[0].diff) : 1;

                return (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div style={{ padding: 14, background: totalVariance <= 0 ? "#F0FFF4" : "#FFF5F5", borderRadius: 8, border: "1px solid " + (totalVariance <= 0 ? "#C6E6D0" : "#E6C6C6"), textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Total Cost Variance</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: totalVariance > 0 ? "#C62828" : "#1B7A43" }}>{totalVariance > 0 ? "+" : ""}${totalVariance.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{budgetTotal > 0 ? (totalVariance / budgetTotal * 100).toFixed(1) : 0}% {totalVariance > 0 ? "over budget" : "under budget"}</div>
                      </div>
                      <div style={{ padding: 14, background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Budget Margin</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#1B4332" }}>{budgetData.gross_margin_pct ? budgetData.gross_margin_pct.toFixed(1) : "0"}%</div>
                      </div>
                      <div style={{ padding: 14, background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Actual Margin</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: (actualData.sales > 0 ? ((actualData.sales - actualData.total) / actualData.sales * 100) : 0) >= 5 ? "#1B7A43" : "#C62828" }}>{actualData.sales > 0 ? ((actualData.sales - actualData.total) / actualData.sales * 100).toFixed(1) : "\u2014"}%</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 8 }}>Top Variance Drivers</div>
                    {sorted.slice(0, 8).map((item, i) => {
                      const pctOfTotal = totalVariance !== 0 ? (item.diff / totalVariance * 100) : 0;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #F0EDE6" }}>
                          <span style={{ width: 24, fontWeight: 700, fontSize: 11, color: item.block === "A" ? "#1B7A43" : item.block === "B" ? "#D4A017" : "#6B2D5B" }}>{item.block}</span>
                          <span style={{ flex: 1, fontSize: 12 }}>{item.line_item}</span>
                          <div style={{ width: 120, height: 8, background: "#E8E4DC", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: Math.min(100, Math.abs(item.diff) / maxAbs * 100) + "%", height: "100%", background: item.diff > 0 ? "#C62828" : "#1B7A43", borderRadius: 4 }} />
                          </div>
                          <span style={{ width: 80, textAlign: "right", fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: item.diff > 0 ? "#C62828" : "#1B7A43" }}>{item.diff > 0 ? "+" : ""}${item.diff.toLocaleString()}</span>
                          <span style={{ width: 50, textAlign: "right", fontSize: 10, color: "#888" }}>{Math.abs(pctOfTotal).toFixed(0)}% of var</span>
                        </div>
                      );
                    })}

                    {sorted.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "#888" }}>No material variances detected.</div>}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Master Data Management ── */
function MasterDataScreen() {
  const [tab, setTab] = useState("customers");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/counterparties?type=customer").then(r => r.ok ? r.json() : []).then(setCustomers).catch(() => {});
    fetch("/api/counterparties?type=supplier").then(r => r.ok ? r.json() : []).then(setSuppliers).catch(() => {});
    fetch("/api/products").then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

  const data = tab === "customers" ? customers : tab === "suppliers" ? suppliers : products;
  const isCounterparty = tab === "customers" || tab === "suppliers";

  const startNew = () => {
    setEditingId("new");
    setForm(isCounterparty ? { name: "", country: "", payment_terms: "Net 30", currency: "USD", contact_email: "", contact_phone: "", type: tab === "customers" ? "customer" : "supplier" } : { name: "", hs_code: "" });
  };

  const startEdit = (item) => { setEditingId(item.id); setForm({ ...item }); };
  const cancel = () => { setEditingId(null); setForm({}); };

  const save = async () => {
    setSaving(true);
    try {
      const url = isCounterparty ? "/api/counterparties" : "/api/products";
      const method = editingId === "new" ? "POST" : "PUT";
      const body = editingId === "new" ? form : { ...form, id: editingId };
      // For PUT on counterparties, we need a different approach - use POST for now
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        // Refresh
        if (tab === "customers") fetch("/api/counterparties?type=customer").then(r => r.ok ? r.json() : []).then(setCustomers);
        if (tab === "suppliers") fetch("/api/counterparties?type=supplier").then(r => r.ok ? r.json() : []).then(setSuppliers);
        if (tab === "products") fetch("/api/products").then(r => r.ok ? r.json() : []).then(setProducts);
        setEditingId(null); setForm({});
      } else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Master Data</h2>
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[{ k: "customers", l: "Customers" }, { k: "suppliers", l: "Suppliers" }, { k: "products", l: "Products" }].map(t => (
          <div key={t.k} onClick={() => { setTab(t.k); setEditingId(null); }} style={{ padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.k ? 700 : 400, background: tab === t.k ? "#1B4332" : "#E8E4DC", color: tab === t.k ? "#FFF" : "#666", borderRadius: t.k === "customers" ? "6px 0 0 6px" : t.k === "products" ? "0 6px 6px 0" : 0 }}>{t.l} ({(tab === t.k ? data : []).length || 0})</div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{tab === "customers" ? "Customers" : tab === "suppliers" ? "Suppliers" : "Products"}</div>
          <button style={S.btn(true)} onClick={startNew}>+ New</button>
        </div>

        {editingId && (
          <div style={{ background: "#F0F7FF", border: "1px solid #B8D4F0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 8 }}>{editingId === "new" ? "New" : "Edit"} {isCounterparty ? (tab === "customers" ? "Customer" : "Supplier") : "Product"}</div>
            <div style={{ display: "grid", gridTemplateColumns: isCounterparty ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888" }}>Name *</label><input style={S.input} value={form.name || ""} onChange={f("name")} /></div>
              {isCounterparty && <div><label style={{ fontSize: 11, color: "#888" }}>Country</label><input style={S.input} value={form.country || ""} onChange={f("country")} /></div>}
              {isCounterparty && <div><label style={{ fontSize: 11, color: "#888" }}>Payment Terms</label><select style={S.select} value={form.payment_terms || "Net 30"} onChange={f("payment_terms")}><option>Net 30</option><option>Net 60</option><option>Net 90</option><option>LC at Sight</option><option>LC 30 Days</option><option>TT Advance</option><option>CAD</option></select></div>}
              {isCounterparty && <div><label style={{ fontSize: 11, color: "#888" }}>Currency</label><select style={S.select} value={form.currency || "USD"} onChange={f("currency")}><option>USD</option><option>GBP</option><option>EUR</option><option>ZAR</option><option>AED</option></select></div>}
              {isCounterparty && <div><label style={{ fontSize: 11, color: "#888" }}>Email</label><input style={S.input} value={form.contact_email || ""} onChange={f("contact_email")} /></div>}
              {isCounterparty && <div><label style={{ fontSize: 11, color: "#888" }}>Phone</label><input style={S.input} value={form.contact_phone || ""} onChange={f("contact_phone")} /></div>}
              {!isCounterparty && <div><label style={{ fontSize: 11, color: "#888" }}>HS Code</label><input style={S.input} value={form.hs_code || ""} onChange={f("hs_code")} /></div>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
              <button style={S.btn(false)} onClick={cancel}>Cancel</button>
              <button style={S.btn(true)} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={S.th}>Name</th>
            {isCounterparty && <th style={S.th}>Country</th>}
            {isCounterparty && <th style={S.th}>Payment Terms</th>}
            {isCounterparty && <th style={S.th}>Currency</th>}
            {!isCounterparty && <th style={S.th}>HS Code</th>}
            <th style={{ ...S.th, width: 60 }}></th>
          </tr></thead>
          <tbody>{data.map(item => (
            <tr key={item.id}>
              <td style={{ ...S.td, fontWeight: 600 }}>{item.name}</td>
              {isCounterparty && <td style={S.td}>{item.country || "\u2014"}</td>}
              {isCounterparty && <td style={S.td}>{item.payment_terms || "\u2014"}</td>}
              {isCounterparty && <td style={S.td}>{item.currency || "USD"}</td>}
              {!isCounterparty && <td style={S.td}>{item.hs_code || "\u2014"}</td>}
              <td style={S.td}><button style={{ ...S.btn(false), padding: "3px 8px", fontSize: 10 }} onClick={() => startEdit(item)}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
        {data.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#AAA" }}>No {tab} yet. Click "+ New" to add one.</div>}
      </div>
    </div>
  );
}

/* ── Settings / Cost Configurations ── */
function SettingsScreen() {
  const [charges, setCharges] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/settings").then(r => r.ok ? r.json() : []).then(setCharges).catch(() => {}); }, []);

  const startNew = () => { setEditingId("new"); setForm({ name: "", calc_type: "percentage", default_value: 0, sort_order: charges.length + 1 }); };
  const startEdit = (item) => { setEditingId(item.id); setForm({ ...item }); };
  const cancel = () => { setEditingId(null); };

  const save = async () => {
    setSaving(true);
    try {
      const method = editingId === "new" ? "POST" : "PUT";
      const body = editingId === "new" ? form : { ...form, id: editingId };
      const res = await fetch("/api/settings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { fetch("/api/settings").then(r => r.ok ? r.json() : []).then(setCharges); setEditingId(null); }
      else { const d = await res.json(); alert(d.error); }
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const toggleActive = async (item) => {
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, name: item.name, calc_type: item.calc_type, default_value: item.default_value, is_active: !item.is_active }) });
    fetch("/api/settings").then(r => r.ok ? r.json() : []).then(setCharges);
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Settings</h2>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div><div style={{ fontSize: 14, fontWeight: 700 }}>Business Charge Templates</div><div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>These charges are automatically added as Block C when generating a cost matrix. Configure insurance %, commission, handling fees, etc.</div></div>
          <button style={S.btn(true)} onClick={startNew}>+ Add Charge</button>
        </div>

        {editingId && (
          <div style={{ background: "#F0F7FF", border: "1px solid #B8D4F0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "#888" }}>Name</label><input style={S.input} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cargo Insurance" /></div>
              <div><label style={{ fontSize: 11, color: "#888" }}>Type</label><select style={S.select} value={form.calc_type || "percentage"} onChange={e => setForm({ ...form, calc_type: e.target.value })}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount ($)</option></select></div>
              <div><label style={{ fontSize: 11, color: "#888" }}>{form.calc_type === "percentage" ? "Rate (%)" : "Amount ($)"}</label><input style={S.input} type="number" step="0.01" value={form.default_value || ""} onChange={e => setForm({ ...form, default_value: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={{ fontSize: 11, color: "#888" }}>Order</label><input style={S.input} type="number" value={form.sort_order || ""} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
              <button style={S.btn(false)} onClick={cancel}>Cancel</button>
              <button style={S.btn(true)} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>Charge Name</th><th style={S.th}>Type</th><th style={{ ...S.th, textAlign: "right" }}>Value</th><th style={S.th}>Active</th><th style={{ ...S.th, width: 80 }}></th></tr></thead>
          <tbody>{charges.map(c => (
            <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.4 }}>
              <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
              <td style={S.td}>{c.calc_type === "percentage" ? "Percentage" : "Fixed"}</td>
              <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>{c.calc_type === "percentage" ? c.default_value + "%" : "$" + c.default_value}</td>
              <td style={S.td}><button onClick={() => toggleActive(c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>{c.is_active ? "\u2705" : "\u274C"}</button></td>
              <td style={S.td}><button style={{ ...S.btn(false), padding: "3px 8px", fontSize: 10 }} onClick={() => startEdit(c)}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
        {charges.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#AAA" }}>
            <div style={{ marginBottom: 8 }}>No charge templates yet.</div>
            <div style={{ fontSize: 12 }}>Common charges to add: Cargo Insurance (0.5%), Commission (2%), Bank Charges ($150), Fumigation ($200), Quality Inspection ($300)</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GTMApp() {
  const [page, setPage] = useState("dashboard");
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [role, setRole] = useState("trader");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await loadDeals();
      setLoading(false);
      // Show tour for first-time users
      if (!localStorage.getItem("gtm_tour_done")) setShowTour(true);
      setRole(localStorage.getItem("gtm_role") || "trader");
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
  const toggleRole = (r) => { setRole(r); localStorage.setItem("gtm_role", r); };
  const deleteDeal = async (deal) => {
    if (!confirm("Delete deal " + deal.deal_number + "? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/deals/" + deal.id, { method: "DELETE" });
      if (res.ok) loadDeals();
      else { const d = await res.json(); alert(d.error || "Failed to delete"); }
    } catch (err) { alert("Error: " + err.message); }
  };

  if (loading) return <div style={S.page}><Loading text="Loading GTM..." /></div>;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openDeal(d) : setPage(p)} />;
      case "deals": return <DealsList deals={deals} onOpenDeal={openDeal} onNewDeal={newDeal} onDeleteDeal={deleteDeal} />;
      case "precalc": return <PreCalcScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
      case "customs": return <div style={S.card}><div style={{ textAlign: "center", padding: 40, color: "#888" }}>Customs Intelligence - Coming Soon</div></div>;
      case "postcalc": return <PostCalcScreen deals={deals} />;
      case "container": return <div><h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Container Stuffing Calculator</h2><ContainerCalculator /></div>;
      case "master": return <MasterDataScreen />;
      case "settings": return <SettingsScreen />;
      default: return <DashboardView deals={deals} onNav={setPage} />;
    }
  };

  return (
    <div style={S.page}>
      <Sidebar active={page} onNav={setPage} user={user} onLogout={handleLogout} role={role} onRoleToggle={toggleRole} />
      <div style={S.main}>{renderPage()}</div>
      {/* Help / Restart Tour button */}
      <button onClick={() => { localStorage.removeItem("gtm_tour_done"); setShowTour(true); }} style={{ position: "fixed", bottom: 20, right: 20, width: 44, height: 44, borderRadius: 22, background: "#1B4332", color: "#FFF", border: "none", fontSize: 18, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} title="Restart guided tour">?</button>
      {showTour && <GuidedTour onComplete={() => setShowTour(false)} />}
    </div>
  );
}
