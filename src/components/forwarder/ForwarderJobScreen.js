/**
 * FORWARDER: JOB SCREEN (Orchestrator)
 * 
 * Main forwarding job screen with three-step workflow:
 *   Step 1 - Job Details (JobDetails component)
 *   Step 2 - Cost Build  (CostBuild component)
 *   Step 3 - Quote Summary (QuoteSummary component)
 * 
 * Manages form state, cost build state, API calls for save/submit.
 * Reads forwarder_metadata JSONB from deal for data persistence.
 * 
 * Props:
 *   deal    - existing deal/job object (null for new)
 *   onBack  - callback to return to jobs list
 *   onSaved - callback(savedDeal) after successful save
 */
'use client'

import { useState } from 'react';
import { S, statusColor } from '@/components/shared/styles';
import JobDetails from './JobDetails';
import CostBuild from './CostBuild';
import QuoteSummary from './QuoteSummary';

// Default cost lines template for new jobs
const DEFAULT_COST_LINES = (numContainers) => [
  { id: 1, category: "Freight", description: "Ocean freight rate", buy_rate: "", sell_rate: "", unit: "per container", qty: numContainers || 1 },
  { id: 2, category: "Origin", description: "Origin THC", buy_rate: "", sell_rate: "", unit: "per container", qty: numContainers || 1 },
  { id: 3, category: "Origin", description: "Documentation / BL fee", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 },
  { id: 4, category: "Origin", description: "Customs clearance (origin)", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 },
  { id: 5, category: "Destination", description: "Destination THC", buy_rate: "", sell_rate: "", unit: "per container", qty: numContainers || 1 },
  { id: 6, category: "Destination", description: "Customs clearance (dest)", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 },
  { id: 7, category: "Destination", description: "Delivery / haulage", buy_rate: "", sell_rate: "", unit: "per container", qty: numContainers || 1 },
  { id: 8, category: "Insurance", description: "Cargo insurance", buy_rate: "", sell_rate: "", unit: "lump sum", qty: 1 },
];

export default function ForwarderJobScreen({ deal, onBack, onSaved }) {
  const isNew = !deal;
  const isDraft = isNew || deal?.status === "draft";
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  // Read forwarder-specific metadata from persisted JSONB
  const fm = deal?.forwarder_metadata || null;

  const [form, setForm] = useState({
    transport_mode: deal?.transport_mode || "ocean_fcl",
    trade_type: deal?.trade_type || "import",
    supplier_name: deal?.supplier?.name || "",
    buy_location: deal?.buy_location || "",
    customer_name: deal?.customer?.name || "",
    sell_location: deal?.sell_location || "",
    port_of_loading: fm?.port_of_loading || "",
    port_of_discharge: fm?.port_of_discharge || "",
    incoterm: deal?.sell_incoterm || deal?.buy_incoterm || "FOB",
    commodity_desc: fm?.commodity_desc || "",
    hs_code: deal?.hs_code || "",
    num_packages: fm?.num_packages || "",
    package_type: fm?.package_type || "cartons",
    gross_weight_kg: fm?.gross_weight_kg || "",
    volume_cbm: fm?.volume_cbm || "",
    container_type: fm?.container_type || "20GP",
    num_containers: fm?.num_containers || 1,
    is_hazardous: fm?.is_hazardous || false,
    un_number: fm?.un_number || "",
    is_temperature_controlled: fm?.is_temperature_controlled || false,
    temp_range: fm?.temp_range || "",
    cargo_value: fm?.cargo_value || "",
    service_scope: fm?.service_scope || "port_to_port",
    insurance_required: fm?.insurance_required || false,
    customer_ref: fm?.customer_ref || "",
    cost_currency: deal?.cost_currency || "USD",
    notify_party: fm?.notify_party || "",
    required_etd: fm?.required_etd || "",
    required_eta: fm?.required_eta || "",
    customer_payment_terms: deal?.customer_payment_terms || "Net 30",
  });

  const handleChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const handleCheck = (key) => (e) => setForm({ ...form, [key]: e.target.checked });

  // Cost build state - restore from saved data or use defaults
  const [costBuild, setCostBuild] = useState(
    fm?.cost_build && fm.cost_build.length > 0 ? fm.cost_build : DEFAULT_COST_LINES(form.num_containers)
  );

  const addCostLine = () => setCostBuild([...costBuild, { id: Date.now(), category: "Other", description: "", buy_rate: "", sell_rate: "", unit: "per shipment", qty: 1 }]);
  const updateCostLine = (id, field, value) => setCostBuild(costBuild.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCostLine = (id) => setCostBuild(costBuild.filter(c => c.id !== id));

  // Calculated totals
  const totalBuy = costBuild.reduce((s, c) => s + (parseFloat(c.buy_rate) || 0) * (parseInt(c.qty) || 1), 0);
  const totalSell = costBuild.reduce((s, c) => s + (parseFloat(c.sell_rate) || 0) * (parseInt(c.qty) || 1), 0);
  const margin = totalSell > 0 ? ((totalSell - totalBuy) / totalSell * 100) : 0;

  // Save deal to API
  const saveDeal = async () => {
    setSaving(true);
    try {
      const payload = {
        trade_type: form.trade_type, transport_mode: form.transport_mode,
        customer_name: form.customer_name, supplier_name: form.supplier_name,
        buy_incoterm: form.incoterm, sell_incoterm: form.incoterm,
        buy_location: form.buy_location, sell_location: form.sell_location,
        unit_price: form.gross_weight_kg, hs_code: form.hs_code,
        cost_currency: form.cost_currency, customer_payment_terms: form.customer_payment_terms,
        _forwarder_data: {
          port_of_loading: form.port_of_loading, port_of_discharge: form.port_of_discharge,
          commodity_desc: form.commodity_desc, num_packages: form.num_packages,
          package_type: form.package_type, gross_weight_kg: form.gross_weight_kg,
          volume_cbm: form.volume_cbm, container_type: form.container_type,
          num_containers: form.num_containers, is_hazardous: form.is_hazardous,
          un_number: form.un_number, is_temperature_controlled: form.is_temperature_controlled,
          temp_range: form.temp_range, cargo_value: form.cargo_value,
          service_scope: form.service_scope, insurance_required: form.insurance_required,
          customer_ref: form.customer_ref, notify_party: form.notify_party,
          required_etd: form.required_etd, required_eta: form.required_eta,
          cost_build: costBuild,
        }
      };
      const url = deal?.id ? "/api/deals/" + deal.id : "/api/deals";
      const res = await fetch(url, { method: deal?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const saved = await res.json();
      if (res.ok) onSaved(saved); else alert(saved.error || "Failed to save");
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  // Workflow actions (submit quote, confirm booking)
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>{"\u2190"}</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isNew ? "New Forwarding Job" : deal.deal_number}</h2>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {form.supplier_name || "Shipper"} {"\u2192"} {form.customer_name || "Consignee"}
              {form.buy_location && form.sell_location && <span style={{ marginLeft: 8, color: "#AAA" }}>({form.buy_location} {"\u2192"} {form.sell_location})</span>}
              {deal?.status && <span style={{ marginLeft: 8, ...S.badge(statusColor[deal.status] || "#888") }}>{deal.status}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDraft && <button style={S.btn(false)} onClick={saveDeal} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</button>}
          {isDraft && deal?.id && <button style={S.btn(true)} onClick={() => doAction("submit")} disabled={saving}>Send Quote</button>}
          {deal?.status === "submitted" && <button style={{ ...S.btn(true), background: "#1B7A43" }} onClick={() => doAction("approve")} disabled={saving}>Confirm Booking</button>}
        </div>
      </div>

      {/* Step Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[{ n: 1, l: "Job Details" }, { n: 2, l: "Cost Build" }, { n: 3, l: "Quote Summary" }].map(s => (
          <div key={s.n} onClick={() => setStep(s.n)} style={{
            padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: step === s.n ? 700 : 400,
            background: step === s.n ? "#1B4332" : "#E8E4DC", color: step === s.n ? "#FFF" : "#666",
            borderRadius: s.n === 1 ? "6px 0 0 6px" : s.n === 3 ? "0 6px 6px 0" : 0,
          }}>{s.l}</div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && <JobDetails form={form} onChange={handleChange} onCheck={handleCheck} isDraft={isDraft} isNew={isNew} />}
      {step === 2 && <CostBuild costBuild={costBuild} onAdd={addCostLine} onUpdate={updateCostLine} onRemove={removeCostLine} isDraft={isDraft} currency={form.cost_currency} totalBuy={totalBuy} totalSell={totalSell} />}
      {step === 3 && <QuoteSummary form={form} costBuild={costBuild} totalBuy={totalBuy} totalSell={totalSell} margin={margin} />}
    </div>
  );
}
