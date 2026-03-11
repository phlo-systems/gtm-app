'use client';
import { useState, useEffect } from 'react';
import { WORKFLOW_PRESETS } from '@/lib/workflow-config';

/**
 * WorkflowSettings
 * =================
 * Onboarding + settings screen where tenant admins configure their deal workflow.
 * Select a preset (Enterprise / Mid-Size / Startup) then customise individual toggles.
 */
export default function WorkflowSettings({ S, onConfigChange }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('midsize');

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflow');
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setSelectedPreset(data.config.id || 'midsize');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const selectPreset = async (presetId) => {
    setSelectedPreset(presetId);
    const preset = WORKFLOW_PRESETS[presetId];
    setConfig(preset);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        onConfigChange?.(config);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggleSetting = (phase, key) => {
    setConfig(prev => ({
      ...prev,
      [phase]: { ...prev[phase], [key]: !prev[phase][key] },
    }));
  };

  const s = {
    container: { maxWidth: 800, margin: '0 auto' },
    title: { fontSize: 24, fontWeight: 700, color: '#1B4332', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#888', marginBottom: 24 },
    presetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 },
    presetCard: (selected) => ({
      padding: 20, borderRadius: 12, border: `2px solid ${selected ? '#1B4332' : '#E8E4DE'}`,
      background: selected ? '#F0FFF4' : '#FAF8F5', cursor: 'pointer', transition: 'all 0.2s',
      textAlign: 'center',
    }),
    presetIcon: { fontSize: 36, marginBottom: 8 },
    presetName: { fontSize: 16, fontWeight: 700, color: '#1B4332' },
    presetDesc: { fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.4 },
    section: { background: '#FAF8F5', borderRadius: 12, padding: 20, border: '1px solid #E8E4DE', marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1B4332', marginBottom: 4 },
    sectionDesc: { fontSize: 11, color: '#888', marginBottom: 16 },
    toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0EDE6' },
    toggleLabel: { fontSize: 13, color: '#333' },
    toggleDesc: { fontSize: 10, color: '#AAA', marginTop: 2 },
    toggle: (on) => ({
      width: 40, height: 22, borderRadius: 11, background: on ? '#1B7A43' : '#DDD',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
    }),
    toggleDot: (on) => ({
      width: 18, height: 18, borderRadius: 9, background: '#FFF',
      position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }),
    btn: (primary) => ({
      padding: '10px 24px', borderRadius: 8, border: primary ? 'none' : '1px solid #DDD',
      background: primary ? '#1B4332' : '#FFF', color: primary ? '#FFF' : '#666',
      fontSize: 14, fontWeight: 700, cursor: 'pointer',
    }),
    phaseBadge: (color) => ({
      display: 'inline-block', padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: color, color: '#FFF', marginRight: 8,
    }),
  };

  const Toggle = ({ on, onClick }) => (
    <div style={s.toggle(on)} onClick={onClick}>
      <div style={s.toggleDot(on)} />
    </div>
  );

  if (loading || !config) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;

  return (
    <div style={s.container}>
      <h2 style={s.title}>Workflow Configuration</h2>
      <div style={s.subtitle}>Choose a workflow preset that matches your trading operation, then customise individual settings.</div>

      {/* Preset Selection */}
      <div style={s.presetGrid}>
        {Object.values(WORKFLOW_PRESETS).map(preset => (
          <div key={preset.id} style={s.presetCard(selectedPreset === preset.id)} onClick={() => selectPreset(preset.id)}>
            <div style={s.presetIcon}>{preset.icon}</div>
            <div style={s.presetName}>{preset.name}</div>
            <div style={s.presetDesc}>{preset.description}</div>
          </div>
        ))}
      </div>

      {/* Pre-Deal Settings */}
      <div style={s.section}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span style={s.phaseBadge('#6B2D5B')}>PRE-DEAL</span>
          <span style={s.sectionTitle}>{config.preDeal.label || 'Opportunities'}</span>
        </div>
        <div style={s.sectionDesc}>Structure and evaluate trades before booking. Create scenarios with different incoterms, pricing, and cost assumptions.</div>
        
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Enable Pre-Deal Phase</div>
            <div style={s.toggleDesc}>Show the Opportunities/Feasibility screen</div></div>
          <Toggle on={config.preDeal.enabled} onClick={() => toggleSetting('preDeal', 'enabled')} />
        </div>
        {config.preDeal.enabled && (
          <>
            <div style={s.toggleRow}>
              <div><div style={s.toggleLabel}>Scenario Modelling</div>
                <div style={s.toggleDesc}>Create multiple what-if scenarios per opportunity</div></div>
              <Toggle on={config.preDeal.scenariosEnabled} onClick={() => toggleSetting('preDeal', 'scenariosEnabled')} />
            </div>
            <div style={s.toggleRow}>
              <div><div style={s.toggleLabel}>Scenario Comparison</div>
                <div style={s.toggleDesc}>Side-by-side comparison of scenarios with P&L</div></div>
              <Toggle on={config.preDeal.scenarioComparison} onClick={() => toggleSetting('preDeal', 'scenarioComparison')} />
            </div>
            <div style={s.toggleRow}>
              <div><div style={s.toggleLabel}>Approval Required</div>
                <div style={s.toggleDesc}>Deals must be approved before booking</div></div>
              <Toggle on={config.preDeal.approvalRequired} onClick={() => toggleSetting('preDeal', 'approvalRequired')} />
            </div>
            <div style={s.toggleRow}>
              <div><div style={s.toggleLabel}>Risk Check Required</div>
                <div style={s.toggleDesc}>Mandatory risk assessment before approval</div></div>
              <Toggle on={config.preDeal.riskCheckRequired} onClick={() => toggleSetting('preDeal', 'riskCheckRequired')} />
            </div>
            <div style={s.toggleRow}>
              <div><div style={s.toggleLabel}>Credit Check Required</div>
                <div style={s.toggleDesc}>Counterparty credit check before deal</div></div>
              <Toggle on={config.preDeal.creditCheckRequired} onClick={() => toggleSetting('preDeal', 'creditCheckRequired')} />
            </div>
          </>
        )}
      </div>

      {/* Deal Settings */}
      <div style={s.section}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span style={s.phaseBadge('#1B4332')}>DEAL</span>
          <span style={s.sectionTitle}>Booking & Execution</span>
        </div>
        <div style={s.sectionDesc}>The actual trade record — pricing, contracts, shipment, documents.</div>
        
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Contract Generation</div>
            <div style={s.toggleDesc}>AI-powered contract PDF generation</div></div>
          <Toggle on={config.deal.contractGeneration} onClick={() => toggleSetting('deal', 'contractGeneration')} />
        </div>
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Four-Eye Principle</div>
            <div style={s.toggleDesc}>Require two approvers for deal booking</div></div>
          <Toggle on={config.deal.fourEyePrinciple} onClick={() => toggleSetting('deal', 'fourEyePrinciple')} />
        </div>
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Documents Required</div>
            <div style={s.toggleDesc}>Mandatory document checklist for each deal</div></div>
          <Toggle on={config.deal.documentsRequired} onClick={() => toggleSetting('deal', 'documentsRequired')} />
        </div>
      </div>

      {/* Post-Deal Settings */}
      <div style={s.section}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span style={s.phaseBadge('#D4A017')}>POST-DEAL</span>
          <span style={s.sectionTitle}>{config.postDeal.label || 'Settlement'}</span>
        </div>
        <div style={s.sectionDesc}>Invoice, settle, and close trades. Compare actual costs vs estimates.</div>
        
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Invoicing</div>
            <div style={s.toggleDesc}>Generate and track invoices</div></div>
          <Toggle on={config.postDeal.invoicingRequired} onClick={() => toggleSetting('postDeal', 'invoicingRequired')} />
        </div>
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Quality Inspection</div>
            <div style={s.toggleDesc}>Record quality results and adjustments</div></div>
          <Toggle on={config.postDeal.qualityInspection} onClick={() => toggleSetting('postDeal', 'qualityInspection')} />
        </div>
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Actual vs Estimated</div>
            <div style={s.toggleDesc}>Compare actual costs against pre-deal estimates</div></div>
          <Toggle on={config.postDeal.actualVsEstimated} onClick={() => toggleSetting('postDeal', 'actualVsEstimated')} />
        </div>
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Washout Allowed</div>
            <div style={s.toggleDesc}>Allow deals to be washed out / cancelled</div></div>
          <Toggle on={config.postDeal.washoutAllowed} onClick={() => toggleSetting('postDeal', 'washoutAllowed')} />
        </div>
        <div style={s.toggleRow}>
          <div><div style={s.toggleLabel}>Audit Trail</div>
            <div style={s.toggleDesc}>Full history of all actions on every deal</div></div>
          <Toggle on={config.postDeal.auditTrail} onClick={() => toggleSetting('postDeal', 'auditTrail')} />
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
        <button style={s.btn(false)} onClick={fetchConfig}>Reset</button>
        <button style={s.btn(true)} onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
