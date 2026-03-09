/**
 * VOYAGE SEARCH
 * 
 * Fetches scheduled voyages based on origin, destination, and date.
 * Displays results in a selectable card layout.
 * When user selects a voyage, calls onApply with cost breakdown to populate the cost matrix.
 * 
 * Props:
 *   origin       - origin port/city name (from deal form)
 *   destination  - destination port/city name (from deal form)
 *   onApply      - callback({ costs, voyage }) when user selects a voyage
 *   currency     - deal currency (default "USD")
 */
'use client'

import { useState } from 'react';
import { S } from '@/components/shared/styles';

const CONTAINER_TYPES = ["20GP", "40GP", "40HC"];

export default function VoyageSearch({ origin, destination, onApply, currency = "USD" }) {
  const [sailDate, setSailDate] = useState("");
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [selectedVoyage, setSelectedVoyage] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState("40GP");
  const [source, setSource] = useState("");

  const searchVoyages = async () => {
    if (!origin || !destination) { setError("Origin and destination are required (set them on the Deal Sheet tab)"); return; }
    setLoading(true);
    setError("");
    setSearched(false);
    try {
      const params = new URLSearchParams({ origin, destination });
      if (sailDate) params.set("date", sailDate);
      const res = await fetch(`/api/voyage-search?${params}`);
      const data = await res.json();
      if (res.ok) {
        setVoyages(data.voyages || []);
        setSource(data.source || "estimate");
        setSearched(true);
      } else {
        setError(data.error || "Failed to fetch voyages");
      }
    } catch (err) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleApply = () => {
    if (!selectedVoyage) return;
    const v = selectedVoyage;
    const c = v.costs;

    // Build cost lines to inject into cost matrix
    const costLines = [
      { line_item: `Ocean Freight (${v.carrier.name} - ${v.vessel})`, amount: c[`ocean_freight_${selectedContainer === "20GP" ? "20" : selectedContainer === "40GP" ? "40" : "40hc"}`], block: "B", cost_type: "incoterm_gap", source: "voyage" },
      { line_item: "BAF (Bunker Adjustment)", amount: c.baf, block: "B", cost_type: "incoterm_gap", source: "voyage" },
      { line_item: "THC Origin", amount: c.thc_origin, block: "B", cost_type: "incoterm_gap", source: "voyage" },
      { line_item: "THC Destination", amount: c.thc_destination, block: "B", cost_type: "incoterm_gap", source: "voyage" },
      { line_item: "Documentation Fee", amount: c.documentation_fee, block: "B", cost_type: "incoterm_gap", source: "voyage" },
      { line_item: "Seal Fee", amount: c.seal_fee, block: "B", cost_type: "incoterm_gap", source: "voyage" },
      { line_item: "ISPS Surcharge", amount: c.isps_surcharge, block: "B", cost_type: "incoterm_gap", source: "voyage" },
    ];

    onApply({
      costs: costLines,
      voyage: {
        carrier: v.carrier.name,
        vessel: v.vessel,
        voyage_number: v.voyage_number,
        etd: v.etd,
        eta: v.eta,
        transit_days: v.transit_days,
        container_type: selectedContainer,
        total: v[`total_${selectedContainer === "20GP" ? "20" : selectedContainer === "40GP" ? "40" : "40hc"}`],
      }
    });
  };

  const tierColor = (tier) => tier === 1 ? "#1B7A43" : "#D4A017";
  const reliabilityColor = (r) => r >= 0.9 ? "#1B7A43" : r >= 0.85 ? "#D4A017" : "#C62828";

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Search Bar */}
      <div style={{ ...S.card, border: "2px solid #1B4332" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1B4332" }}>
              {"\u{1F6A2}"} Voyage Search
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              Fetch scheduled sailings and freight rates for {origin || "___"} {"\u2192"} {destination || "___"}
            </div>
          </div>
          {source && <span style={S.badge(source === "estimate" ? "#D4A017" : "#1B7A43")}>
            {source === "estimate" ? "Estimated rates" : `Live (${source})`}
          </span>}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Origin Port</label>
            <input style={{ ...S.input, background: "#F0EDE6" }} readOnly value={origin || ""} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Destination Port</label>
            <input style={{ ...S.input, background: "#F0EDE6" }} readOnly value={destination || ""} />
          </div>
          <div style={{ width: 160 }}>
            <label style={S.label}>Preferred Sailing Date</label>
            <input style={S.input} type="date" value={sailDate} onChange={e => setSailDate(e.target.value)} />
          </div>
          <div style={{ width: 140 }}>
            <label style={S.label}>Container</label>
            <select style={S.select} value={selectedContainer} onChange={e => setSelectedContainer(e.target.value)}>
              {CONTAINER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button style={{ ...S.btn(true), whiteSpace: "nowrap", padding: "8px 24px" }} onClick={searchVoyages} disabled={loading}>
            {loading ? "Searching..." : "Search Voyages"}
          </button>
        </div>

        {error && <div style={{ color: "#C62828", fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {/* Results */}
      {searched && voyages.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: 32, color: "#888" }}>
          No voyages found for this route. Try different ports or dates.
        </div>
      )}

      {voyages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {voyages.map((v) => {
            const isSelected = selectedVoyage?.id === v.id;
            const totalKey = `total_${selectedContainer === "20GP" ? "20" : selectedContainer === "40GP" ? "40" : "40hc"}`;
            const rateKey = selectedContainer;
            return (
              <div key={v.id} onClick={() => setSelectedVoyage(v)} style={{
                ...S.card, marginBottom: 0, cursor: "pointer",
                border: isSelected ? "2px solid #1B4332" : "1px solid #E8E4DC",
                background: isSelected ? "#F0FFF4" : "#FFF",
                transition: "all 0.15s ease",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                  {/* Carrier & Vessel */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{v.carrier.name}</span>
                      <span style={S.badge(tierColor(v.carrier.tier))}>Tier {v.carrier.tier}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                      {v.vessel} {"\u2022"} {v.voyage_number}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      Reliability: <span style={{ color: reliabilityColor(v.carrier.reliability), fontWeight: 600 }}>
                        {(v.carrier.reliability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* ETD */}
                  <div>
                    <div style={{ fontSize: 11, color: "#888" }}>ETD</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(v.etd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>

                  {/* ETA */}
                  <div>
                    <div style={{ fontSize: 11, color: "#888" }}>ETA</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(v.eta).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{v.transit_days} days</div>
                  </div>

                  {/* Rate */}
                  <div>
                    <div style={{ fontSize: 11, color: "#888" }}>Freight ({rateKey})</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1B4332", fontFamily: "monospace" }}>
                      ${v.rates[rateKey]?.toLocaleString()}
                    </div>
                  </div>

                  {/* All-in Total */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#888" }}>All-in Total</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isSelected ? "#1B4332" : "#1A1A1A", fontFamily: "monospace" }}>
                      ${v[totalKey]?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: "#AAA" }}>valid until {v.valid_until}</div>
                  </div>
                </div>

                {/* Expanded cost breakdown when selected */}
                {isSelected && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #C6E6D0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#1B4332" }}>Cost Breakdown ({currency})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {Object.entries(v.costs).map(([key, val]) => {
                        if (key.includes("ocean_freight") && !key.includes(selectedContainer === "20GP" ? "20" : selectedContainer === "40GP" ? "40" : "40hc")) return null;
                        const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()).replace("20", "20'").replace("40", "40'").replace("Hc", "HC");
                        return (
                          <div key={key} style={{ padding: "6px 8px", background: "#FAFAF8", borderRadius: 4, fontSize: 11 }}>
                            <div style={{ color: "#888" }}>{label}</div>
                            <div style={{ fontWeight: 600, fontFamily: "monospace" }}>${val.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button style={{ ...S.btn(true), padding: "8px 24px" }} onClick={(e) => { e.stopPropagation(); handleApply(); }}>
                        Apply to Cost Matrix
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
