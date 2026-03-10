'use client';
import { useState } from 'react';

/**
 * CollapsibleSection
 * Wrapper for progressive disclosure in the deal sheet.
 * Shows a header with field count badge; content is hidden until expanded.
 */
function CollapsibleSection({ title, icon, children, fieldCount = 0, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const s = {
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', cursor: 'pointer', userSelect: 'none',
      background: open ? '#F5F7F0' : 'transparent', borderRadius: 8,
      border: `1px solid ${open ? '#D4DBC8' : '#E8E4DE'}`,
      transition: 'all 0.2s',
    },
    title: { fontSize: 11, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1 },
    badge: {
      fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
      background: fieldCount > 0 ? '#D4EDDA' : '#E8E4DE',
      color: fieldCount > 0 ? '#155724' : '#888',
    },
    chevron: { fontSize: 12, color: '#888', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' },
    body: {
      overflow: 'hidden', maxHeight: open ? '2000px' : '0',
      opacity: open ? 1 : 0, transition: 'all 0.3s ease',
      padding: open ? '16px 0 0 0' : '0',
    },
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={s.header} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icon}</span>
          <span style={s.title}>{title}</span>
          {fieldCount > 0 && <span style={s.badge}>{fieldCount} filled</span>}
        </div>
        <span style={s.chevron}>▼</span>
      </div>
      <div style={s.body}>{children}</div>
    </div>
  );
}

/**
 * DealExtendedFields
 * All the additional fields from the customer's trade sheet,
 * organized into collapsible sections with progressive disclosure.
 *
 * Props:
 *   ext       - extended fields object
 *   onChange  - (fieldName, value) callback
 *   disabled  - read-only mode
 */
export default function DealExtendedFields({ ext = {}, onChange, disabled = false }) {
  const f = (key) => (e) => onChange?.(key, e.target?.type === 'checkbox' ? e.target.checked : e.target.value);
  const v = (key) => ext[key] || '';
  const checked = (key) => ext[key] === true;

  const countFilled = (keys) => keys.filter(k => ext[k] && ext[k] !== '' && ext[k] !== false).length;

  const s = {
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
    label: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13,
      boxSizing: 'border-box', outline: 'none', background: disabled ? '#F0EDE6' : '#FFF',
    },
    select: {
      width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13,
      boxSizing: 'border-box', background: disabled ? '#F0EDE6' : '#FFF',
    },
    checkbox: { marginRight: 6, accentColor: '#1B4332' },
    textarea: {
      width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13,
      boxSizing: 'border-box', outline: 'none', resize: 'vertical', minHeight: 60,
      background: disabled ? '#F0EDE6' : '#FFF',
    },
  };

  const partiesFields = ['consignee', 'notify_party'];
  const shippingFields = ['brand_marking', 'packaging', 'container_type', 'pol', 'pod', 'shipping_start', 'shipping_end', 'transhipment_allowed', 'partial_shipment_allowed'];
  const paymentFields = ['down_payment_pct', 'payment_terms', 'other_terms', 'detention_days', 'demurrage_days'];
  const complianceFields = ['import_permit_needed', 'import_permit_number', 'gafta_late_discount', 'gafta_discount_pct', 'refraction', 'refraction_method', 'full_specifications'];
  const executionFields = ['bl_number', 'container_number', 'shipment_status', 'remarks'];

  return (
    <div style={{ marginTop: 16 }}>
      {/* ── Parties ── */}
      <CollapsibleSection title="Parties" icon="👥" fieldCount={countFilled(partiesFields)}>
        <div style={s.row}>
          <div>
            <label style={s.label}>Consignee</label>
            <input style={s.input} value={v('consignee')} onChange={f('consignee')} readOnly={disabled} placeholder="e.g. PT. XYZ or 'To Order'" />
          </div>
          <div>
            <label style={s.label}>Notify Party</label>
            <input style={s.input} value={v('notify_party')} onChange={f('notify_party')} readOnly={disabled} placeholder="Usually the buyer" />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Shipping & Logistics ── */}
      <CollapsibleSection title="Shipping & Logistics" icon="🚢" fieldCount={countFilled(shippingFields)}>
        <div style={s.row3}>
          <div>
            <label style={s.label}>Brand / Marking</label>
            <input style={s.input} value={v('brand_marking')} onChange={f('brand_marking')} readOnly={disabled} placeholder="e.g. ML" />
          </div>
          <div>
            <label style={s.label}>Packaging</label>
            <input style={s.input} value={v('packaging')} onChange={f('packaging')} readOnly={disabled} placeholder="e.g. 25 Kg PP Bag, Bulk" />
          </div>
          <div>
            <label style={s.label}>Container Type</label>
            <select style={s.select} value={v('container_type')} onChange={f('container_type')} disabled={disabled}>
              <option value="">Select...</option>
              <option value="20GP">20' GP</option>
              <option value="40GP">40' GP</option>
              <option value="40HC">40' HC</option>
              <option value="20RF">20' Reefer</option>
              <option value="40RF">40' Reefer</option>
              <option value="20OT">20' Open Top</option>
              <option value="40OT">40' Open Top</option>
              <option value="bulk">Bulk Vessel</option>
            </select>
          </div>
        </div>

        <div style={s.row}>
          <div>
            <label style={s.label}>Port of Loading (POL)</label>
            <input style={s.input} value={v('pol')} onChange={f('pol')} readOnly={disabled} placeholder="e.g. Santos, Brazil" />
          </div>
          <div>
            <label style={s.label}>Port of Discharge (POD)</label>
            <input style={s.input} value={v('pod')} onChange={f('pod')} readOnly={disabled} placeholder="e.g. Jakarta, Indonesia" />
          </div>
        </div>

        <div style={s.row}>
          <div>
            <label style={s.label}>Shipping Start Date</label>
            <input style={s.input} type="date" value={v('shipping_start')} onChange={f('shipping_start')} readOnly={disabled} />
          </div>
          <div>
            <label style={s.label}>Shipping End Date</label>
            <input style={s.input} type="date" value={v('shipping_end')} onChange={f('shipping_end')} readOnly={disabled} />
          </div>
        </div>

        <div style={s.row}>
          <label style={{ fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" style={s.checkbox} checked={checked('transhipment_allowed')} onChange={f('transhipment_allowed')} disabled={disabled} />
            Transhipment Allowed
          </label>
          <label style={{ fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" style={s.checkbox} checked={checked('partial_shipment_allowed')} onChange={f('partial_shipment_allowed')} disabled={disabled} />
            Partial Shipment Allowed
          </label>
        </div>
      </CollapsibleSection>

      {/* ── Payment & Terms ── */}
      <CollapsibleSection title="Payment & Terms" icon="💰" fieldCount={countFilled(paymentFields)}>
        <div style={s.row3}>
          <div>
            <label style={s.label}>Down Payment %</label>
            <input style={s.input} type="number" step="1" value={v('down_payment_pct')} onChange={f('down_payment_pct')} readOnly={disabled} placeholder="e.g. 10" />
          </div>
          <div>
            <label style={s.label}>Detention (days)</label>
            <input style={s.input} type="number" value={v('detention_days')} onChange={f('detention_days')} readOnly={disabled} placeholder="e.g. 14" />
          </div>
          <div>
            <label style={s.label}>Demurrage (days)</label>
            <input style={s.input} type="number" value={v('demurrage_days')} onChange={f('demurrage_days')} readOnly={disabled} placeholder="e.g. 5" />
          </div>
        </div>
        <div style={s.row}>
          <div>
            <label style={s.label}>Payment Terms</label>
            <input style={s.input} value={v('payment_terms')} onChange={f('payment_terms')} readOnly={disabled} placeholder="e.g. 10% DP; 90% TT" />
          </div>
          <div>
            <label style={s.label}>Other Terms</label>
            <input style={s.input} value={v('other_terms')} onChange={f('other_terms')} readOnly={disabled} placeholder="e.g. Detention 14 Days" />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Compliance & Quality ── */}
      <CollapsibleSection title="Compliance & Quality" icon="📋" fieldCount={countFilled(complianceFields)}>
        <div style={s.row}>
          <div>
            <label style={{ fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" style={s.checkbox} checked={checked('import_permit_needed')} onChange={f('import_permit_needed')} disabled={disabled} />
              Import Permit Required
            </label>
          </div>
          {checked('import_permit_needed') && (
            <div>
              <label style={s.label}>Import Permit Number</label>
              <input style={s.input} value={v('import_permit_number')} onChange={f('import_permit_number')} readOnly={disabled} />
            </div>
          )}
        </div>

        <div style={s.row}>
          <div>
            <label style={{ fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" style={s.checkbox} checked={checked('gafta_late_discount')} onChange={f('gafta_late_discount')} disabled={disabled} />
              GAFTA Late Discount Applies
            </label>
          </div>
          {checked('gafta_late_discount') && (
            <div>
              <label style={s.label}>GAFTA Discount %</label>
              <input style={s.input} type="number" step="0.0001" value={v('gafta_discount_pct')} onChange={f('gafta_discount_pct')} readOnly={disabled} placeholder="e.g. 0.0025" />
            </div>
          )}
        </div>

        <div style={s.row}>
          <div>
            <label style={{ fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" style={s.checkbox} checked={checked('refraction')} onChange={f('refraction')} disabled={disabled} />
              Refraction Applies
            </label>
          </div>
          {checked('refraction') && (
            <div>
              <label style={s.label}>Refraction Method</label>
              <input style={s.input} value={v('refraction_method')} onChange={f('refraction_method')} readOnly={disabled} placeholder="e.g. Protein 1:1 to min 46%" />
            </div>
          )}
        </div>

        <div>
          <label style={s.label}>Full Specifications</label>
          <textarea style={s.textarea} value={v('full_specifications')} onChange={f('full_specifications')} readOnly={disabled} placeholder="Detailed product specifications..." />
        </div>
      </CollapsibleSection>

      {/* ── Documents ── */}
      <CollapsibleSection title="Documents Checklist" icon="📄" fieldCount={countDocsFilled(ext)}>
        <DocumentChecklist docs={ext.documents || {}} onChange={(docs) => onChange?.('documents', docs)} disabled={disabled} />
      </CollapsibleSection>

      {/* ── Execution / Tracking ── */}
      <CollapsibleSection title="Execution & Tracking" icon="📍" fieldCount={countFilled(executionFields)}>
        <div style={s.row}>
          <div>
            <label style={s.label}>BL Number</label>
            <input style={s.input} value={v('bl_number')} onChange={f('bl_number')} readOnly={disabled} placeholder="Bill of Lading number" />
          </div>
          <div>
            <label style={s.label}>Container Number</label>
            <input style={s.input} value={v('container_number')} onChange={f('container_number')} readOnly={disabled} placeholder="e.g. MSKU1234567" />
          </div>
        </div>
        <div style={s.row}>
          <div>
            <label style={s.label}>Shipment Status</label>
            <select style={s.select} value={v('shipment_status')} onChange={f('shipment_status')} disabled={disabled}>
              <option value="">Select...</option>
              <option value="pending">Pending</option>
              <option value="booked">Booked</option>
              <option value="loaded">Loaded</option>
              <option value="in_transit">In Transit</option>
              <option value="arrived">Arrived</option>
              <option value="cleared">Customs Cleared</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Remarks</label>
            <input style={s.input} value={v('remarks')} onChange={f('remarks')} readOnly={disabled} placeholder="Any notes..." />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ── Document Checklist ──
const DOC_TYPES = [
  { key: 'ocean_bl',           label: 'Ocean B/L (3 originals + 3 copies)' },
  { key: 'commercial_invoice', label: 'Commercial Invoice (2 originals)' },
  { key: 'packing_list',       label: 'Packing List (2 originals)' },
  { key: 'phytosanitary_cert', label: 'Phytosanitary Certificate' },
  { key: 'fta_cert',           label: 'Free Trade Agreement Certificate of Origin' },
  { key: 'fumigation_cert',    label: 'Fumigation Certificate' },
  { key: 'non_gmo_cert',       label: 'Non-GMO Certificate' },
  { key: 'weight_quality_cert',label: 'Certificate of Weight & Quality' },
  { key: 'health_cert',        label: 'Health Certificate' },
  { key: 'halal_cert',         label: 'Halal Certificate' },
  { key: 'product_label',      label: '3P Label (min 11cm x 7cm)' },
  { key: 'tech_specs',         label: 'Product Technical Specifications / MSDS' },
  { key: 'food_quality_cert',  label: 'Food Quality Certificate' },
  { key: 'import_permit',      label: 'Import Permit' },
  { key: 'prior_notice',       label: 'Prior Notice (Government Portal)' },
];

const DOC_STATUSES = [
  { value: 'not_required', label: 'Not Required', color: '#E8E4DE' },
  { value: 'required',     label: 'Required',     color: '#FFF3CD' },
  { value: 'requested',    label: 'Requested',    color: '#CCE5FF' },
  { value: 'received',     label: 'Received',     color: '#D4EDDA' },
  { value: 'submitted',    label: 'Submitted',    color: '#C3E6CB' },
];

function DocumentChecklist({ docs = {}, onChange, disabled }) {
  const updateDoc = (key, status) => {
    const updated = { ...docs, [key]: status };
    onChange?.(updated);
  };

  return (
    <div style={{ fontSize: 12 }}>
      {DOC_TYPES.map(doc => {
        const status = docs[doc.key] || 'not_required';
        const statusObj = DOC_STATUSES.find(s => s.value === status) || DOC_STATUSES[0];

        return (
          <div key={doc.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', borderBottom: '1px solid #F0EDE6',
          }}>
            <span style={{ color: '#444', flex: 1 }}>{doc.label}</span>
            <select
              value={status}
              onChange={e => updateDoc(doc.key, e.target.value)}
              disabled={disabled}
              style={{
                padding: '3px 8px', borderRadius: 4, border: '1px solid #DDD',
                fontSize: 10, fontWeight: 600, background: statusObj.color,
                color: '#333', cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {DOC_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function countDocsFilled(ext) {
  if (!ext.documents) return 0;
  return Object.values(ext.documents).filter(v => v && v !== 'not_required').length;
}
