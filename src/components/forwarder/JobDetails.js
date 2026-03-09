/**
 * FORWARDER: JOB DETAILS (Step 1)
 * 
 * Form for capturing shipment details:
 *   - Shipment type (direction, mode, service scope, incoterm)
 *   - Routing (origin, destination, POL, POD, ETD/ETA)
 *   - Shipper & consignee
 *   - Cargo details (commodity, packages, weight, volume, containers)
 *   - Special requirements (DG, temp controlled, insurance)
 * 
 * Props:
 *   form       - form state object
 *   onChange   - callback(key)(event) for input changes
 *   onCheck    - callback(key)(event) for checkbox changes
 *   isDraft    - whether the job is editable
 *   isNew      - whether this is a new job (no ID yet)
 */
'use client'

import { S } from '@/components/shared/styles';
import { INCOTERMS_2020 } from '@/lib/incoterms';

export default function JobDetails({ form, onChange, onCheck, isDraft, isNew }) {
  const f = onChange;
  const fCheck = onCheck;
  const inputStyle = (ed) => ({ ...S.input, background: ed ? "#FFF" : "#F0EDE6" });

  // Chargeable weight calculation
  const volWeight = (parseFloat(form.volume_cbm) || 0) * 1000;
  const grossW = parseFloat(form.gross_weight_kg) || 0;
  const chargeableWeight = Math.max(volWeight, grossW);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      {/* Shipment Type */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Shipment Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={S.label}>Direction</label>
            <select style={S.select} disabled={!isDraft} value={form.trade_type} onChange={f("trade_type")}>
              <option value="import">Import</option><option value="export">Export</option>
              <option value="cross_trade">Cross-Trade</option><option value="domestic">Domestic</option>
            </select></div>
          <div><label style={S.label}>Transport Mode</label>
            <select style={S.select} disabled={!isDraft} value={form.transport_mode} onChange={f("transport_mode")}>
              <option value="ocean_fcl">Ocean FCL</option><option value="ocean_lcl">Ocean LCL</option>
              <option value="air">Air Freight</option><option value="road_ftl">Road FTL</option>
              <option value="road_ltl">Road LTL / Groupage</option><option value="rail">Rail</option>
              <option value="multimodal">Multimodal</option>
            </select></div>
          <div><label style={S.label}>Service Scope</label>
            <select style={S.select} disabled={!isDraft} value={form.service_scope} onChange={f("service_scope")}>
              <option value="door_to_door">Door-to-Door</option><option value="port_to_port">Port-to-Port</option>
              <option value="door_to_port">Door-to-Port</option><option value="port_to_door">Port-to-Door</option>
            </select></div>
          <div><label style={S.label}>Incoterm</label>
            <select style={S.select} disabled={!isDraft} value={form.incoterm} onChange={f("incoterm")}>
              {INCOTERMS_2020.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
            </select></div>
        </div>
      </div>

      {/* Routing */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Routing</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={S.label}>Origin / Pickup</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.buy_location} onChange={f("buy_location")} placeholder="e.g. Shanghai, China" /></div>
          <div><label style={S.label}>Destination / Delivery</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.sell_location} onChange={f("sell_location")} placeholder="e.g. Felixstowe, UK" /></div>
          <div><label style={S.label}>Port of Loading (POL)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.port_of_loading} onChange={f("port_of_loading")} placeholder="e.g. Shanghai" /></div>
          <div><label style={S.label}>Port of Discharge (POD)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.port_of_discharge} onChange={f("port_of_discharge")} placeholder="e.g. Felixstowe" /></div>
          <div><label style={S.label}>Required ETD</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="date" value={form.required_etd} onChange={f("required_etd")} /></div>
          <div><label style={S.label}>Required ETA</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="date" value={form.required_eta} onChange={f("required_eta")} /></div>
        </div>
      </div>

      {/* Shipper & Consignee */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Shipper & Consignee</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div><label style={S.label}>Shipper (Consignor)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.supplier_name} onChange={f("supplier_name")} placeholder="Company shipping the goods" /></div>
          <div><label style={S.label}>Consignee (Receiver)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.customer_name} onChange={f("customer_name")} placeholder="Company receiving the goods" /></div>
          <div><label style={S.label}>Notify Party</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.notify_party} onChange={f("notify_party")} placeholder="Optional notify party" /></div>
          <div><label style={S.label}>Customer Reference</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.customer_ref} onChange={f("customer_ref")} placeholder="PO / booking ref" /></div>
        </div>
      </div>

      {/* Cargo Details */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Cargo Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={S.label}>Commodity Description</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.commodity_desc} onChange={f("commodity_desc")} placeholder="e.g. Electronic components" /></div>
          <div><label style={S.label}>HS Code</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.hs_code} onChange={f("hs_code")} placeholder="0000.00.00" /></div>
          <div><label style={S.label}>Number of Packages</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" value={form.num_packages} onChange={f("num_packages")} placeholder="e.g. 150" /></div>
          <div><label style={S.label}>Package Type</label>
            <select style={S.select} disabled={!isDraft} value={form.package_type} onChange={f("package_type")}>
              <option value="cartons">Cartons</option><option value="pallets">Pallets</option>
              <option value="drums">Drums</option><option value="bags">Bags</option>
              <option value="crates">Crates</option><option value="rolls">Rolls</option>
              <option value="bundles">Bundles</option><option value="bulk">Bulk (loose)</option>
              <option value="other">Other</option>
            </select></div>
          <div><label style={S.label}>Gross Weight (kg)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" step="0.1" value={form.gross_weight_kg} onChange={f("gross_weight_kg")} placeholder="e.g. 18500" /></div>
          <div><label style={S.label}>Volume (CBM)</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" step="0.01" value={form.volume_cbm} onChange={f("volume_cbm")} placeholder="e.g. 28.5" /></div>
          {(form.transport_mode === "ocean_fcl" || form.transport_mode === "multimodal") && (<>
            <div><label style={S.label}>Container Type</label>
              <select style={S.select} disabled={!isDraft} value={form.container_type} onChange={f("container_type")}>
                <option value="20GP">20' GP</option><option value="40GP">40' GP</option><option value="40HC">40' HC</option>
                <option value="20RF">20' Reefer</option><option value="40RF">40' Reefer</option>
                <option value="20OT">20' Open Top</option><option value="40OT">40' Open Top</option>
                <option value="20FR">20' Flat Rack</option><option value="40FR">40' Flat Rack</option>
              </select></div>
            <div><label style={S.label}>Number of Containers</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" min="1" value={form.num_containers} onChange={f("num_containers")} /></div>
          </>)}
        </div>
        {chargeableWeight > 0 && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#F0F7FF", borderRadius: 6, border: "1px solid #B8D4F0", fontSize: 12 }}>
            <strong>Chargeable weight:</strong> {chargeableWeight.toLocaleString()} kg
            {volWeight !== grossW && <span style={{ color: "#888", marginLeft: 8 }}>(gross: {grossW.toLocaleString()} kg, vol: {volWeight.toLocaleString()} kg)</span>}
          </div>
        )}
      </div>

      {/* Special Requirements */}
      <div style={{ ...S.card, gridColumn: "1 / -1" }}>
        <div style={S.sectionTitle}>Special Requirements & Commercial</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.is_hazardous} onChange={fCheck("is_hazardous")} disabled={!isDraft} /><label style={{ fontSize: 12 }}>Hazardous (DG)</label></div>
          {form.is_hazardous && <div><label style={S.label}>UN Number / Class</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.un_number} onChange={f("un_number")} placeholder="UN1234 / Class 3" /></div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.is_temperature_controlled} onChange={fCheck("is_temperature_controlled")} disabled={!isDraft} /><label style={{ fontSize: 12 }}>Temp Controlled</label></div>
          {form.is_temperature_controlled && <div><label style={S.label}>Temp Range</label><input style={inputStyle(isDraft)} readOnly={!isDraft} value={form.temp_range} onChange={f("temp_range")} placeholder="e.g. 2-8°C" /></div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={form.insurance_required} onChange={fCheck("insurance_required")} disabled={!isDraft} /><label style={{ fontSize: 12 }}>Insurance Required</label></div>
          {form.insurance_required && <div><label style={S.label}>Cargo Value ({form.cost_currency})</label><input style={inputStyle(isDraft)} readOnly={!isDraft} type="number" value={form.cargo_value} onChange={f("cargo_value")} placeholder="Declared value" /></div>}
          <div><label style={S.label}>Quote Currency</label>
            <select style={S.select} disabled={!isDraft} value={form.cost_currency} onChange={f("cost_currency")}>
              <option>USD</option><option>GBP</option><option>EUR</option><option>ZAR</option><option>AED</option><option>CNY</option><option>INR</option>
            </select></div>
          <div><label style={S.label}>Payment Terms</label>
            <select style={S.select} disabled={!isDraft} value={form.customer_payment_terms} onChange={f("customer_payment_terms")}>
              <option>Net 30</option><option>Net 14</option><option>Net 60</option><option>Prepaid</option><option>Collect</option>
            </select></div>
        </div>
      </div>

      {isNew && !form.supplier_name && (
        <div style={{ gridColumn: "1 / -1", background: "#F0F7FF", border: "1px solid #B8D4F0", borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{"\u2139"} Fill in the shipment details, then click Save Draft</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>After saving, move to Cost Build to enter buy/sell rates and generate the quote.</div>
        </div>
      )}
    </div>
  );
}
