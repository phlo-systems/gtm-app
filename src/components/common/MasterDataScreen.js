/**
 * MASTER DATA CONFIGURATION
 * 
 * CRUD screen for managing reference data:
 *   - Counterparties (customers, suppliers, agents, forwarders)
 *   - Products (with HS codes, weights, container specs)
 * 
 * Used by both trader and forwarder roles.
 * 
 * Props:
 *   role - "trader" | "forwarder" (adjusts labels/defaults)
 */
'use client'

import { useState, useEffect } from 'react';
import { S, statusColor } from '@/components/shared/styles';

const TABS = [
  { key: "counterparties", label: "Counterparties" },
  { key: "products", label: "Products" },
];

const COUNTERPARTY_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "supplier", label: "Supplier" },
  { value: "agent", label: "Agent" },
  { value: "forwarder", label: "Forwarder" },
  { value: "both", label: "Both (Buy & Sell)" },
];

export default function MasterDataScreen({ role }) {
  const [tab, setTab] = useState("counterparties");
  const [counterparties, setCounterparties] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  // ── Load data ──
  useEffect(() => {
    loadCounterparties();
    loadProducts();
  }, []);

  const loadCounterparties = async () => {
    try {
      const res = await fetch("/api/counterparties");
      if (res.ok) setCounterparties(await res.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  // ── Counterparty form ──
  const [cpForm, setCpForm] = useState({
    name: "", type: "customer", country: "", region: "",
    contact_email: "", contact_phone: "", payment_terms: "",
    credit_limit: "", currency: "USD",
  });

  const resetCpForm = () => {
    setCpForm({ name: "", type: "customer", country: "", region: "", contact_email: "", contact_phone: "", payment_terms: "", credit_limit: "", currency: "USD" });
    setEditItem(null);
    setShowForm(false);
  };

  const editCounterparty = (cp) => {
    setCpForm({
      name: cp.name || "", type: cp.type || "customer", country: cp.country || "",
      region: cp.region || "", contact_email: cp.contact_email || "",
      contact_phone: cp.contact_phone || "", payment_terms: cp.payment_terms || "",
      credit_limit: cp.credit_limit || "", currency: cp.currency || "USD",
    });
    setEditItem(cp);
    setShowForm(true);
    setTab("counterparties");
  };

  const saveCounterparty = async () => {
    if (!cpForm.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const url = editItem ? `/api/counterparties?id=${editItem.id}` : "/api/counterparties";
      const res = await fetch(url, {
        method: editItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cpForm),
      });
      if (res.ok) { await loadCounterparties(); resetCpForm(); }
      else { const d = await res.json(); alert(d.error || "Failed to save"); }
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  // ── Product form ──
  const [prodForm, setProdForm] = useState({
    name: "", hs_code: "", unit_weight: "", units_per_case: "",
    cases_per_container: "", shelf_life_days: "", temperature_class: "",
  });

  const resetProdForm = () => {
    setProdForm({ name: "", hs_code: "", unit_weight: "", units_per_case: "", cases_per_container: "", shelf_life_days: "", temperature_class: "" });
    setEditItem(null);
    setShowForm(false);
  };

  const editProduct = (p) => {
    setProdForm({
      name: p.name || "", hs_code: p.hs_code || "", unit_weight: p.unit_weight || "",
      units_per_case: p.units_per_case || "", cases_per_container: p.cases_per_container || "",
      shelf_life_days: p.shelf_life_days || "", temperature_class: p.temperature_class || "",
    });
    setEditItem(p);
    setShowForm(true);
    setTab("products");
  };

  const saveProduct = async () => {
    if (!prodForm.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const url = editItem ? `/api/products?id=${editItem.id}` : "/api/products";
      const res = await fetch(url, {
        method: editItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prodForm),
      });
      if (res.ok) { await loadProducts(); resetProdForm(); }
      else { const d = await res.json(); alert(d.error || "Failed to save"); }
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  // ── Filter counterparties ──
  const filteredCPs = filter === "all" ? counterparties : counterparties.filter(c => c.type === filter);

  const cpf = (key) => (e) => setCpForm({ ...cpForm, [key]: e.target.value });
  const pf = (key) => (e) => setProdForm({ ...prodForm, [key]: e.target.value });
  const inputStyle = { ...S.input, background: "#FFF" };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>Master Data</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {TABS.map((t, i) => (
          <div key={t.key} onClick={() => { setTab(t.key); setShowForm(false); }} style={{
            padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            background: tab === t.key ? "#1B4332" : "#E8E4DC", color: tab === t.key ? "#FFF" : "#666",
            borderRadius: i === 0 ? "6px 0 0 6px" : i === TABS.length - 1 ? "0 6px 6px 0" : 0,
          }}>{t.label}</div>
        ))}
      </div>

      {/* ── COUNTERPARTIES TAB ── */}
      {tab === "counterparties" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {["all", "customer", "supplier", "forwarder", "agent"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  ...S.btn(filter === f), fontSize: 11, padding: "5px 12px",
                  textTransform: "capitalize",
                }}>{f}</button>
              ))}
            </div>
            <button style={S.btn(true)} onClick={() => { resetCpForm(); setShowForm(true); }}>+ Add Counterparty</button>
          </div>

          {/* Form */}
          {showForm && !editItem?.hs_code && (
            <div style={{ ...S.card, border: "2px solid #1B4332", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{editItem ? "Edit" : "New"} Counterparty</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={S.label}>Name *</label><input style={inputStyle} value={cpForm.name} onChange={cpf("name")} placeholder="Company name" /></div>
                <div><label style={S.label}>Type</label><select style={S.select} value={cpForm.type} onChange={cpf("type")}>{COUNTERPARTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label style={S.label}>Country</label><input style={inputStyle} value={cpForm.country} onChange={cpf("country")} placeholder="e.g. United Kingdom" /></div>
                <div><label style={S.label}>Region</label><input style={inputStyle} value={cpForm.region} onChange={cpf("region")} placeholder="e.g. Europe" /></div>
                <div><label style={S.label}>Email</label><input style={inputStyle} type="email" value={cpForm.contact_email} onChange={cpf("contact_email")} placeholder="contact@company.com" /></div>
                <div><label style={S.label}>Phone</label><input style={inputStyle} value={cpForm.contact_phone} onChange={cpf("contact_phone")} placeholder="+44 ..." /></div>
                <div><label style={S.label}>Payment Terms</label><input style={inputStyle} value={cpForm.payment_terms} onChange={cpf("payment_terms")} placeholder="e.g. Net 30" /></div>
                <div><label style={S.label}>Credit Limit</label><input style={inputStyle} type="number" value={cpForm.credit_limit} onChange={cpf("credit_limit")} placeholder="0.00" /></div>
                <div><label style={S.label}>Currency</label><select style={S.select} value={cpForm.currency} onChange={cpf("currency")}><option>USD</option><option>GBP</option><option>EUR</option><option>ZAR</option><option>AED</option></select></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                <button style={S.btn(false)} onClick={resetCpForm}>Cancel</button>
                <button style={S.btn(true)} onClick={saveCounterparty} disabled={saving}>{saving ? "Saving..." : editItem ? "Update" : "Save"}</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={S.card}>
            {loading ? <div style={{ textAlign: "center", padding: 32, color: "#888" }}>Loading...</div> : filteredCPs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#888" }}>No counterparties found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={S.th}>Name</th><th style={S.th}>Type</th><th style={S.th}>Country</th>
                  <th style={S.th}>Email</th><th style={S.th}>Payment Terms</th><th style={S.th}>Actions</th>
                </tr></thead>
                <tbody>{filteredCPs.map(cp => (
                  <tr key={cp.id}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{cp.name}</td>
                    <td style={S.td}><span style={S.badge(cp.type === "customer" ? "#1B7A43" : cp.type === "supplier" ? "#1565C0" : "#D4A017")}>{cp.type}</span></td>
                    <td style={S.td}>{cp.country || "\u2014"}</td>
                    <td style={{ ...S.td, fontSize: 12 }}>{cp.contact_email || "\u2014"}</td>
                    <td style={S.td}>{cp.payment_terms || "\u2014"}</td>
                    <td style={S.td}><span onClick={() => editCounterparty(cp)} style={{ cursor: "pointer", color: "#1B4332", fontWeight: 600, fontSize: 12 }}>Edit</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button style={S.btn(true)} onClick={() => { resetProdForm(); setShowForm(true); }}>+ Add Product</button>
          </div>

          {/* Form */}
          {showForm && (
            <div style={{ ...S.card, border: "2px solid #1B4332", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{editItem ? "Edit" : "New"} Product</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={S.label}>Product Name *</label><input style={inputStyle} value={prodForm.name} onChange={pf("name")} placeholder="e.g. Arabica Coffee Beans" /></div>
                <div><label style={S.label}>HS Code</label><input style={inputStyle} value={prodForm.hs_code} onChange={pf("hs_code")} placeholder="0901.11.00" /></div>
                <div><label style={S.label}>Unit Weight (kg)</label><input style={inputStyle} type="number" step="0.01" value={prodForm.unit_weight} onChange={pf("unit_weight")} placeholder="e.g. 0.5" /></div>
                <div><label style={S.label}>Units per Case</label><input style={inputStyle} type="number" value={prodForm.units_per_case} onChange={pf("units_per_case")} placeholder="e.g. 24" /></div>
                <div><label style={S.label}>Cases per Container</label><input style={inputStyle} type="number" value={prodForm.cases_per_container} onChange={pf("cases_per_container")} placeholder="e.g. 1200" /></div>
                <div><label style={S.label}>Shelf Life (days)</label><input style={inputStyle} type="number" value={prodForm.shelf_life_days} onChange={pf("shelf_life_days")} placeholder="e.g. 365" /></div>
                <div><label style={S.label}>Temperature Class</label><select style={S.select} value={prodForm.temperature_class} onChange={pf("temperature_class")}><option value="">None</option><option value="ambient">Ambient</option><option value="chilled">Chilled (2-8°C)</option><option value="frozen">Frozen (-18°C)</option><option value="controlled">Controlled</option></select></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                <button style={S.btn(false)} onClick={resetProdForm}>Cancel</button>
                <button style={S.btn(true)} onClick={saveProduct} disabled={saving}>{saving ? "Saving..." : editItem ? "Update" : "Save"}</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={S.card}>
            {products.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#888" }}>No products configured yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={S.th}>Product</th><th style={S.th}>HS Code</th><th style={S.th}>Unit Weight</th>
                  <th style={S.th}>Units/Case</th><th style={S.th}>Cases/Container</th><th style={S.th}>Temp Class</th>
                  <th style={S.th}>Actions</th>
                </tr></thead>
                <tbody>{products.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.hs_code || "\u2014"}</td>
                    <td style={S.td}>{p.unit_weight ? p.unit_weight + " kg" : "\u2014"}</td>
                    <td style={S.td}>{p.units_per_case || "\u2014"}</td>
                    <td style={S.td}>{p.cases_per_container || "\u2014"}</td>
                    <td style={S.td}>{p.temperature_class ? <span style={S.badge("#1565C0")}>{p.temperature_class}</span> : "\u2014"}</td>
                    <td style={S.td}><span onClick={() => editProduct(p)} style={{ cursor: "pointer", color: "#1B4332", fontWeight: 600, fontSize: 12 }}>Edit</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
