'use client';
import { useState } from 'react';

// ── All Countries (ISO 3166-1) ──
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (DRC)","Congo (Republic)",
  "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
  "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal",
  "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
  "Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia",
  "Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan",
  "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan",
  "Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

const CURRENCIES = ["USD","EUR","GBP","ZAR","CNY","INR","AED","BRL","JPY","AUD","CAD","CHF","SGD","KES","NGN","EGP","TZS","MZN","BWP"];
const INCOTERMS = ["Not specified","EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"];

export default function CustomsIntelligence({ S }) {
  const [product, setProduct] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [importCountry, setImportCountry] = useState('');
  const [exportCountry, setExportCountry] = useState('');
  const [cifValue, setCifValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterm, setIncoterm] = useState('Not specified');

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState('');
  const [result, setResult] = useState(null);
  const [hsSuggestions, setHsSuggestions] = useState(null);
  const [hsDescription, setHsDescription] = useState(null);
  const [error, setError] = useState('');

  const callAI = async (action, extraBody = {}) => {
    setError('');
    setLoadingAction(action);
    setLoading(true);
    try {
      const res = await fetch('/api/customs/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          product,
          hsCode,
          importCountry,
          exportCountry,
          cifValue: cifValue ? parseFloat(cifValue) : undefined,
          currency,
          ...extraBody,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
      setLoadingAction('');
    }
  };

  const suggestHsCode = async () => {
    if (!product) return;
    const res = await callAI('suggest_hs_code');
    if (res?.suggestions) {
      setHsSuggestions(res.suggestions);
      if (res.suggestions[0]) setHsCode(res.suggestions[0].hsCode);
    }
  };

  const describeHsCode = async () => {
    if (!hsCode) return;
    const res = await callAI('describe_hs_code');
    if (res) {
      setHsDescription(res);
      if (res.description && !product) setProduct(res.description);
    }
  };

  const calculateDuties = async () => {
    if (!product && !hsCode) { setError('Enter a product description or HS code'); return; }
    if (!importCountry) { setError('Select a country of import'); return; }
    const res = await callAI('calculate_duties');
    if (res) {
      setResult(res);
      if (res.hsCode && !hsCode) setHsCode(res.hsCode);
    }
  };

  const selectHsSuggestion = (suggestion) => {
    setHsCode(suggestion.hsCode);
    if (suggestion.description) setProduct(suggestion.description);
    setHsSuggestions(null);
  };

  // ── Styles (matches GTM green theme) ──
  const s = {
    page: { padding: 0 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
    card: { background: '#FAF8F5', borderRadius: 12, padding: 24, border: '1px solid #E8E4DE' },
    resultCard: { background: '#FAF8F5', borderRadius: 12, padding: 24, border: '1px solid #E8E4DE', minHeight: 400 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    label: { fontSize: 11, color: '#888', display: 'block', marginBottom: 4 },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #DDD', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
    select: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #DDD', fontSize: 14, boxSizing: 'border-box', background: '#FFF' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
    aiBtn: { padding: '8px 14px', borderRadius: 6, border: 'none', background: '#1B4332', color: '#FFF', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 0.5 },
    aiBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
    mainBtn: { width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none', background: '#1B4332', color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, letterSpacing: 0.3 },
    fieldWithBtn: { display: 'flex', gap: 8, alignItems: 'flex-end' },
    inputWrap: { flex: 1 },
    suggestion: { padding: '10px 14px', borderBottom: '1px solid #EEE', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    suggestionBox: { background: '#FFF', border: '1px solid #DDD', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'auto' },
    badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: color === 'green' ? '#D4EDDA' : color === 'amber' ? '#FFF3CD' : color === 'red' ? '#F8D7DA' : '#E2E3E5', color: color === 'green' ? '#155724' : color === 'amber' ? '#856404' : color === 'red' ? '#721C24' : '#383D41' }),
    resultSection: { marginBottom: 20 },
    resultLabel: { fontSize: 10, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    resultRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0EDE6', fontSize: 13 },
    resultKey: { color: '#666' },
    resultVal: { fontWeight: 600, color: '#1B4332' },
    spinner: { display: 'inline-block', width: 14, height: 14, border: '2px solid #FFF', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 6, verticalAlign: 'middle' },
    disclaimer: { fontSize: 10, color: '#999', fontStyle: 'italic', marginTop: 16, lineHeight: 1.4 },
    error: { color: '#D32F2F', fontSize: 12, marginTop: 8, padding: '8px 12px', background: '#FFEBEE', borderRadius: 6 },
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700, color: '#1B4332' }}>Customs Intelligence</h2>

      <div style={s.grid}>
        {/* ── LEFT: Input Form ── */}
        <div>
          {/* Product Classification */}
          <div style={{ ...s.card, marginBottom: 20 }}>
            <div style={s.sectionTitle}>Product Classification</div>

            <div style={s.fieldWithBtn}>
              <div style={s.inputWrap}>
                <label style={s.label}>Product Description</label>
                <input style={s.input} value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Frozen chicken breast, Roasted coffee beans, Cotton t-shirts" />
              </div>
              <button style={{ ...s.aiBtn, ...(loading ? s.aiBtnDisabled : {}) }} disabled={loading || !product} onClick={suggestHsCode} title="AI will suggest HS codes for this product">
                {loadingAction === 'suggest_hs_code' ? '...' : 'Suggest HS'}
              </button>
            </div>

            {hsSuggestions && (
              <div style={s.suggestionBox}>
                {hsSuggestions.map((sg, i) => (
                  <div key={i} style={s.suggestion} onClick={() => selectHsSuggestion(sg)} onMouseOver={e => e.currentTarget.style.background = '#F5F5F5'} onMouseOut={e => e.currentTarget.style.background = '#FFF'}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1B4332' }}>{sg.hsCode}</span>
                      <span style={{ marginLeft: 8, color: '#666' }}>{sg.description}</span>
                    </div>
                    <span style={s.badge(sg.confidence === 'high' ? 'green' : sg.confidence === 'medium' ? 'amber' : 'grey')}>{sg.confidence}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...s.fieldWithBtn, marginTop: 16 }}>
              <div style={s.inputWrap}>
                <label style={s.label}>HS Code (auto-suggested or enter manually)</label>
                <input style={s.input} value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="e.g. 0207.14.11 or leave blank for AI suggestion" />
              </div>
              <button style={{ ...s.aiBtn, ...(loading ? s.aiBtnDisabled : {}) }} disabled={loading || !hsCode} onClick={describeHsCode} title="AI will describe what this HS code covers">
                {loadingAction === 'describe_hs_code' ? '...' : 'Describe'}
              </button>
            </div>

            {hsDescription && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: '#E8F5E9', borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#1B4332', marginBottom: 4 }}>{hsDescription.hsCode}: {hsDescription.description}</div>
                {hsDescription.hierarchy?.map((h, i) => (
                  <div key={i} style={{ color: '#555', paddingLeft: i * 12 }}>{h.level}: {h.code} - {h.description}</div>
                ))}
                {hsDescription.commonProducts?.length > 0 && (
                  <div style={{ marginTop: 6, color: '#666' }}>Common products: {hsDescription.commonProducts.join(', ')}</div>
                )}
              </div>
            )}
          </div>

          {/* Trade Route */}
          <div style={{ ...s.card, marginBottom: 20 }}>
            <div style={s.sectionTitle}>Trade Route</div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Country of Origin</label>
                <input list="countries-origin" style={s.input} value={exportCountry} onChange={e => setExportCountry(e.target.value)} placeholder="Type to search..." />
                <datalist id="countries-origin">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label style={s.label}>Country of Import *</label>
                <input list="countries-import" style={s.input} value={importCountry} onChange={e => setImportCountry(e.target.value)} placeholder="Type to search..." />
                <datalist id="countries-import">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
          </div>

          {/* Cargo Value */}
          <div style={{ ...s.card, marginBottom: 20 }}>
            <div style={s.sectionTitle}>Cargo Value & Terms</div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Cargo Value</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...s.input, flex: 1 }} type="number" value={cifValue} onChange={e => setCifValue(e.target.value)} placeholder="e.g. 50000" />
                  <select style={{ ...s.select, width: 90, flex: 'none' }} value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={s.label}>Sell Incoterm (optional)</label>
                <select style={s.select} value={incoterm} onChange={e => setIncoterm(e.target.value)}>
                  {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <button style={{ ...s.mainBtn, ...(loading ? { opacity: 0.7 } : {}) }} disabled={loading} onClick={calculateDuties}>
            {loadingAction === 'calculate_duties' ? (<><span style={s.spinner} /> Analysing with AI...</>) : 'Calculate Duties & Taxes'}
          </button>

          {error && <div style={s.error}>{error}</div>}
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <div style={s.resultCard}>
          {!result && !loading && (
            <div style={{ textAlign: 'center', padding: 60, color: '#AAA' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏛</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#888' }}>Enter product details and calculate</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Duty rates, VAT, and restrictions will appear here</div>
              <div style={{ fontSize: 11, marginTop: 12, color: '#BBB' }}>Powered by AI — works for any country worldwide</div>
            </div>
          )}

          {loading && loadingAction === 'calculate_duties' && (
            <div style={{ textAlign: 'center', padding: 60, color: '#1B4332' }}>
              <div style={{ ...s.spinner, width: 32, height: 32, borderWidth: 3, borderColor: '#1B4332', borderTopColor: 'transparent', margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Analysing customs requirements...</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Checking duties, taxes, and restrictions for {importCountry || 'your destination'}</div>
            </div>
          )}

          {result && !loading && (
            <div>
              {/* Confidence Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1B4332' }}>{result.importCountry}</div>
                <span style={s.badge(result.confidence === 'high' ? 'green' : result.confidence === 'medium' ? 'amber' : 'red')}>
                  {result.confidence} confidence
                </span>
              </div>

              {/* HS Classification */}
              <div style={s.resultSection}>
                <div style={s.resultLabel}>HS Classification</div>
                <div style={{ ...s.resultRow, fontWeight: 700, fontSize: 15, borderBottom: '2px solid #1B4332' }}>
                  <span>{result.hsCode}</span>
                  <span style={{ fontWeight: 400, fontSize: 12, color: '#666', maxWidth: '60%', textAlign: 'right' }}>{result.hsDescription}</span>
                </div>
              </div>

              {/* Duties */}
              <div style={s.resultSection}>
                <div style={s.resultLabel}>Import Duties</div>
                <div style={s.resultRow}>
                  <span style={s.resultKey}>MFN Rate</span>
                  <span style={s.resultVal}>{result.duties?.mfnRate || 'N/A'}</span>
                </div>
                <div style={s.resultRow}>
                  <span style={s.resultKey}>Applicable Rate</span>
                  <span style={{ ...s.resultVal, color: '#2E7D32', fontSize: 15 }}>{result.duties?.applicableRate || result.duties?.mfnRate || 'N/A'}</span>
                </div>
                {result.duties?.preferentialRates?.map((pr, i) => (
                  <div key={i} style={s.resultRow}>
                    <span style={s.resultKey}>{pr.agreement}</span>
                    <span style={s.resultVal}>{pr.rate}</span>
                  </div>
                ))}
                <div style={s.resultRow}>
                  <span style={s.resultKey}>Duty Type</span>
                  <span style={s.resultVal}>{result.duties?.dutyType || 'N/A'}</span>
                </div>
              </div>

              {/* Taxes */}
              <div style={s.resultSection}>
                <div style={s.resultLabel}>Taxes & Levies</div>
                {result.taxes?.vat && (
                  <div style={s.resultRow}>
                    <span style={s.resultKey}>{result.taxes.vat.name || 'VAT/GST'}</span>
                    <span style={s.resultVal}>{result.taxes.vat.rate} (on {result.taxes.vat.appliedOn})</span>
                  </div>
                )}
                {result.taxes?.excise?.applicable && (
                  <div style={s.resultRow}>
                    <span style={s.resultKey}>Excise</span>
                    <span style={s.resultVal}>{result.taxes.excise.rate}</span>
                  </div>
                )}
                {result.taxes?.otherLevies?.map((lv, i) => (
                  <div key={i} style={s.resultRow}>
                    <span style={s.resultKey}>{lv.name}</span>
                    <span style={s.resultVal}>{lv.rate}</span>
                  </div>
                ))}
              </div>

              {/* Landed Cost */}
              {result.landedCost && (
                <div style={s.resultSection}>
                  <div style={s.resultLabel}>Landed Cost Calculation</div>
                  <div style={s.resultRow}>
                    <span style={s.resultKey}>CIF Value</span>
                    <span style={s.resultVal}>{result.landedCost.currency} {Number(result.landedCost.cifValue).toLocaleString()}</span>
                  </div>
                  <div style={s.resultRow}>
                    <span style={s.resultKey}>Duty</span>
                    <span style={s.resultVal}>{result.landedCost.currency} {Number(result.landedCost.dutyAmount).toLocaleString()}</span>
                  </div>
                  <div style={s.resultRow}>
                    <span style={s.resultKey}>VAT/GST</span>
                    <span style={s.resultVal}>{result.landedCost.currency} {Number(result.landedCost.vatAmount).toLocaleString()}</span>
                  </div>
                  {result.landedCost.otherCharges > 0 && (
                    <div style={s.resultRow}>
                      <span style={s.resultKey}>Other Charges</span>
                      <span style={s.resultVal}>{result.landedCost.currency} {Number(result.landedCost.otherCharges).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ ...s.resultRow, borderBottom: '2px solid #1B4332', paddingTop: 8, paddingBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Total Landed Cost</span>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#1B4332' }}>
                      {result.landedCost.currency} {Number(result.landedCost.totalLandedCost).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ ...s.resultRow, borderBottom: 'none' }}>
                    <span style={s.resultKey}>Effective Total Rate</span>
                    <span style={{ ...s.resultVal, color: '#E65100' }}>{result.landedCost.effectiveRate}</span>
                  </div>
                </div>
              )}

              {/* Restrictions */}
              {result.restrictions && (
                <div style={s.resultSection}>
                  <div style={s.resultLabel}>Import Restrictions & Requirements</div>
                  {result.restrictions.importPermitRequired && (
                    <div style={{ ...s.resultRow, color: '#D32F2F' }}>
                      <span>⚠ Import Permit Required</span>
                    </div>
                  )}
                  {result.restrictions.sanitaryPhytosanitary && (
                    <div style={{ ...s.resultRow, color: '#E65100' }}>
                      <span>🔬 Sanitary/Phytosanitary Certificate Required</span>
                    </div>
                  )}
                  {result.restrictions.labellingRequirements && result.restrictions.labellingRequirements !== 'none' && (
                    <div style={s.resultRow}>
                      <span style={s.resultKey}>Labelling</span>
                      <span style={{ ...s.resultVal, maxWidth: '60%', textAlign: 'right', fontSize: 11 }}>{result.restrictions.labellingRequirements}</span>
                    </div>
                  )}
                  {result.restrictions.standards && result.restrictions.standards !== 'none' && (
                    <div style={s.resultRow}>
                      <span style={s.resultKey}>Standards</span>
                      <span style={s.resultVal}>{result.restrictions.standards}</span>
                    </div>
                  )}
                  {result.restrictions.quotas && result.restrictions.quotas !== 'none' && (
                    <div style={s.resultRow}>
                      <span style={s.resultKey}>Quotas</span>
                      <span style={s.resultVal}>{result.restrictions.quotas}</span>
                    </div>
                  )}
                  {result.restrictions.regulatoryBody && (
                    <div style={s.resultRow}>
                      <span style={s.resultKey}>Authority</span>
                      <span style={{ ...s.resultVal, fontSize: 11 }}>{result.restrictions.regulatoryBody}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Trade Agreements */}
              {result.tradeAgreements && result.tradeAgreements !== 'None' && (
                <div style={s.resultSection}>
                  <div style={s.resultLabel}>Trade Agreements</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{result.tradeAgreements}</div>
                </div>
              )}

              {/* Notes */}
              {result.notes && (
                <div style={{ padding: '10px 14px', background: '#FFF8E1', borderRadius: 8, fontSize: 12, color: '#6D4C00', lineHeight: 1.5 }}>
                  <strong>Notes:</strong> {result.notes}
                </div>
              )}

              <div style={s.disclaimer}>
                AI-generated estimate based on publicly available tariff data. Always verify with the official customs authority ({result.restrictions?.regulatoryBody || 'local customs'}) before making commercial decisions. Rates may change without notice.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
