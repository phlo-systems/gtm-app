/**
 * ADMIN: Management Fees Settings
 *
 * Lets admin users view and edit the tenant-level management fee policy
 * that drives the COS engine. Changes take effect on the next matrix generation.
 *
 * Props: S — shared styles object
 */
'use client';
import { useState, useEffect } from 'react';

const FIELDS = [
  {
    key: 'global_supply_chain_fee',
    label: 'Global Supply Chain Fee',
    type: 'fixed',
    unit: '$ / container',
    desc: 'Fixed administrative fee applied to each container.',
  },
  {
    key: 'finance_rate',
    label: 'Finance Rate (p.a.)',
    type: 'pct',
    unit: '% per annum',
    desc: 'Annual funding rate applied to financed capital.',
  },
  {
    key: 'financing_gap_days',
    label: 'Financing Gap Days',
    type: 'days',
    unit: 'days',
    desc: 'Customer payment days minus supplier payment days (default; overridable per deal).',
  },
  {
    key: 'gl_product_liability_rate',
    label: 'GL & Product Liability Rate',
    type: 'pct',
    unit: '% of supplier cost',
    desc: 'Risk provision on the cost base.',
  },
  {
    key: 'provision_delays',
    label: 'Provision for Delays / Penalties',
    type: 'fixed',
    unit: '$ / container',
    desc: 'Flat buffer for delays, penalties, or forwarding costs.',
  },
  {
    key: 'merchandising_rate',
    label: 'Merchandising Rate',
    type: 'pct',
    unit: '% of supplier cost',
    desc: 'Commercial markup for trading activities.',
  },
  {
    key: 'finance_insurance_rate',
    label: 'Finance Insurance Rate',
    type: 'pct',
    unit: '% of (cost + freight)',
    desc: 'Insurance on financed capital.',
  },
  {
    key: 'marine_insurance_rate',
    label: 'Marine / Cargo Insurance Rate',
    type: 'pct',
    unit: '% of (cost + freight)',
    desc: 'Auto-applied when marine insurance is in the Incoterm gap.',
  },
  {
    key: 'management_fee_rate',
    label: 'Management Fee Rate',
    type: 'pct',
    unit: '% of subtotal before mgmt',
    desc: 'Target trading margin — applied to the subtotal before management fees.',
  },
  {
    key: 'recovery_fund_rate',
    label: 'Under / Over Recovery Fund Rate',
    type: 'pct',
    unit: '% of subtotal before mgmt',
    desc: 'Contingency reserve for cost recovery fluctuations.',
  },
  {
    key: 'buying_trader_split',
    label: 'Buying Trader Margin Split',
    type: 'pct',
    unit: '% of trading margin',
    desc: 'Portion of trading margin allocated to the buying trader.',
  },
  {
    key: 'selling_trader_split',
    label: 'Selling Trader Margin Split',
    type: 'pct',
    unit: '% of trading margin',
    desc: 'Portion of trading margin allocated to the selling trader.',
  },
];

// Display value: percentages stored as decimals (0.12 → shown as 12.00)
const toDisplay = (key, val) => {
  const f = FIELDS.find((f) => f.key === key);
  if (!f) return val;
  return f.type === 'pct' ? parseFloat((val * 100).toFixed(4)) : val;
};
const fromDisplay = (key, val) => {
  const f = FIELDS.find((f) => f.key === key);
  if (!f) return parseFloat(val);
  return f.type === 'pct' ? parseFloat(val) / 100 : parseFloat(val);
};

export default function ManagementFeesSettings({ S }) {
  const [fees, setFees] = useState(null);
  const [display, setDisplay] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/settings/management-fees')
      .then((r) => r.json())
      .then((data) => {
        setFees(data);
        const d = {};
        FIELDS.forEach((f) => { d[f.key] = toDisplay(f.key, data[f.key]); });
        setDisplay(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleChange = (key, val) => {
    setDisplay((p) => ({ ...p, [key]: val }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      FIELDS.forEach((f) => { payload[f.key] = fromDisplay(f.key, display[f.key]); });
      const res = await fetch('/api/settings/management-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setFees(payload);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const inp = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #DDD',
    fontSize: 13,
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    textAlign: 'right',
  };

  if (!fees)
    return (
      <div style={S.card}>
        <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>
          {error ? `Error: ${error}` : 'Loading settings…'}
        </div>
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Management Fee Policy</h2>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            Tenant-level defaults used by the COS engine. Changes apply to new matrix generations.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && (
            <span style={{ fontSize: 12, color: '#1B7A43', fontWeight: 600 }}>✓ Saved</span>
          )}
          {error && (
            <span style={{ fontSize: 12, color: '#C62828' }}>⚠ {error}</span>
          )}
          <button style={S.btn(true)} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Fixed fees */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Fixed Fees (per container)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
          {FIELDS.filter((f) => f.type === 'fixed').map((f) => (
            <FieldRow key={f.key} field={f} value={display[f.key]} onChange={handleChange} inp={inp} />
          ))}
          <FieldRow key="financing_gap_days" field={FIELDS.find(f => f.key === 'financing_gap_days')} value={display.financing_gap_days} onChange={handleChange} inp={inp} />
        </div>
      </div>

      {/* Rate-based fees */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.sectionTitle}>Rate-Based Fees</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign: 'left' }}>Fee</th>
              <th style={{ ...S.th, textAlign: 'left', color: '#888' }}>Description</th>
              <th style={{ ...S.th, width: 130 }}>Rate</th>
              <th style={{ ...S.th, width: 180 }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.filter((f) => f.type === 'pct').map((f) => (
              <tr key={f.key}>
                <td style={{ ...S.td, fontWeight: 600 }}>{f.label}</td>
                <td style={{ ...S.td, fontSize: 11, color: '#888' }}>{f.desc}</td>
                <td style={S.td}>
                  <input
                    style={inp}
                    type="number"
                    step="0.01"
                    value={display[f.key] ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                  />
                </td>
                <td style={{ ...S.td, fontSize: 11, color: '#888' }}>{f.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live preview */}
      <div style={{ ...S.card, marginTop: 16, background: '#F5F7F0', border: '1px solid #D4DBC8' }}>
        <div style={S.sectionTitle}>Preview — Example Trade</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4, marginBottom: 12 }}>
          Buying FOB, Selling CIF · Cost price: $11.50/case · 2,520 cases/container · Ocean freight: $2,350
        </div>
        <PreviewTable display={display} />
      </div>
    </div>
  );
}

function FieldRow({ field, value, onChange, inp }) {
  if (!field) return null;
  return (
    <div>
      <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {field.label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          style={{ ...inp, flex: 1 }}
          type="number"
          step="0.01"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
        <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>{field.unit}</span>
      </div>
      <div style={{ fontSize: 10, color: '#AAA', marginTop: 2 }}>{field.desc}</div>
    </div>
  );
}

function PreviewTable({ display }) {
  const costPerCase = 11.50;
  const cases = 2520;
  const freight = 2350;
  const A = costPerCase * cases;
  const AB = A + freight;

  const fr = (key) => parseFloat(display[key]) / 100 || 0;
  const fv = (key) => parseFloat(display[key]) || 0;

  const marineIns = round2(AB * fr('marine_insurance_rate'));
  const finCharge = round2(AB * fr('finance_rate') * (fv('financing_gap_days') / 365));
  const gl = round2(A * fr('gl_product_liability_rate'));
  const sscFee = fv('global_supply_chain_fee');
  const prov = fv('provision_delays');
  const merch = round2(A * fr('merchandising_rate'));
  const finIns = round2(AB * fr('finance_insurance_rate'));
  const subBefore = AB + marineIns + finCharge + gl + sscFee + prov + merch + finIns;
  const mgmtFee = round2(subBefore * fr('management_fee_rate'));
  const recovery = round2(subBefore * fr('recovery_fund_rate'));
  const tradingMargin = mgmtFee + recovery;
  const sellingPrice = round2(subBefore + tradingMargin);

  const rows = [
    { label: 'Cost from Factory (FOB)', amount: A, bold: false, indent: false },
    { label: 'Ocean Freight', amount: freight, bold: false, indent: true },
    { label: 'Marine Insurance', amount: marineIns, bold: false, indent: true },
    { label: 'Finance Charge', amount: finCharge, bold: false, indent: true },
    { label: 'GL & Product Liability', amount: gl, bold: false, indent: true },
    { label: 'Global Supply Chain Fee', amount: sscFee, bold: false, indent: true },
    { label: 'Provision for Delays', amount: prov, bold: false, indent: true },
    { label: 'Merchandising', amount: merch, bold: false, indent: true },
    { label: 'Finance Insurance', amount: finIns, bold: false, indent: true },
    { label: 'Subtotal before management', amount: subBefore, bold: true, indent: false },
    { label: 'Management Fee', amount: mgmtFee, bold: false, indent: true },
    { label: 'Recovery Fund', amount: recovery, bold: false, indent: true },
    { label: 'Trading Margin', amount: tradingMargin, bold: true, indent: false },
    { label: 'OCapital Selling Price (CIF)', amount: sellingPrice, bold: true, indent: false, highlight: true },
    { label: 'Per case', amount: cases > 0 ? round2(sellingPrice / cases) : 0, bold: false, indent: false, italic: true },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: r.highlight ? '#E8F4EF' : 'transparent' }}>
            <td style={{ padding: '4px 8px', color: r.italic ? '#888' : '#333', fontStyle: r.italic ? 'italic' : 'normal', fontWeight: r.bold ? 700 : 400, paddingLeft: r.indent ? 24 : 8 }}>{r.label}</td>
            <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: r.bold ? 700 : 400, color: r.highlight ? '#1B7A43' : '#333' }}>
              ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function round2(n) { return Math.round((n || 0) * 100) / 100; }
