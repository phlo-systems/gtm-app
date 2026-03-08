'use client'
import { useState } from 'react'
import Link from 'next/link'

const features = [
  { icon: '▣', title: 'Pre-Trade Feasibility', desc: 'Model the full cost and margin of any trade before committing capital. Configurable cost matrix with approval workflows.' },
  { icon: '◈', title: 'Incoterm Gap Engine', desc: 'Automatically determine cost obligations based on buying and selling incoterms. Supports all 11 Incoterms 2020 rules.' },
  { icon: '◆', title: 'Customs Intelligence', desc: 'HS code lookup, import duty calculation, VAT rates, and preferential tariffs across 17 jurisdictions.' },
  { icon: '◉', title: 'Post-Trade Analytics', desc: 'Compare estimated vs actual margin at every cost line. Deal-level P&L and variance analysis.' },
  { icon: '⚙', title: 'ERP Integration', desc: 'Works standalone or syncs with Xero, Sage, Acumatica. Draft POs pushed on deal approval.' },
  { icon: '◇', title: 'Governed & Auditable', desc: 'Approval workflows, cost locking, full audit trails. Every field change logged with user and timestamp.' },
]

const personas = [
  'Commodity Traders', 'Trading Houses', 'Buyers & Procurement',
  'Export Desks', 'Commission Agents', 'Freight Forwarders', 'Finance Teams'
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', borderBottom: '1px solid #E8E4DC', background: '#FFF',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#1B4332' }}>GTM</span>
          <span style={{ fontSize: 11, color: '#888', letterSpacing: '1.5px' }}>by Phlo Systems</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: 14, color: '#666' }}>Features</a>
          <a href="#who" style={{ fontSize: 14, color: '#666' }}>Who It's For</a>
          <Link href="/dashboard" style={{
            padding: '8px 20px', background: '#1B4332', color: '#FFF',
            borderRadius: 6, fontSize: 13, fontWeight: 600,
          }}>
            Launch App →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: '80px 40px', maxWidth: 1000, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', padding: '4px 14px', background: '#1B433218',
          borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#1B4332', marginBottom: 20,
        }}>
          FREE BETA — Now Open
        </div>
        <h1 style={{
          fontSize: 52, fontWeight: 800, lineHeight: 1.15, color: '#1A1A1A',
          letterSpacing: '-1px', marginBottom: 20,
        }}>
          Trade intelligence for<br />
          <span style={{ color: '#1B4332' }}>physical commodity trading</span>
        </h1>
        <p style={{
          fontSize: 18, color: '#666', maxWidth: 640, margin: '0 auto 32px',
          lineHeight: 1.6,
        }}>
          Model costs before you commit. Validate incoterm obligations automatically.
          Calculate customs duty across jurisdictions. Track deal profitability from
          feasibility to settlement.
        </p>

        {!submitted ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', maxWidth: 440, margin: '0 auto' }}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1, padding: '12px 16px', border: '1px solid #D5D0C6',
                borderRadius: 6, fontSize: 14, outline: 'none', background: '#FFF',
              }}
            />
            <button
              onClick={() => { if (email) setSubmitted(true) }}
              style={{
                padding: '12px 28px', background: '#1B4332', color: '#FFF',
                borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Start Free Beta
            </button>
          </div>
        ) : (
          <div style={{
            padding: '12px 24px', background: '#F0FFF4', borderRadius: 6,
            border: '1px solid #C6E6D0', display: 'inline-block',
          }}>
            <span style={{ fontSize: 14, color: '#1B7A43', fontWeight: 600 }}>
              ✓ Welcome! You can now access the app.
            </span>
            <Link href="/dashboard" style={{
              marginLeft: 12, padding: '6px 16px', background: '#1B4332', color: '#FFF',
              borderRadius: 4, fontSize: 13, fontWeight: 600,
            }}>
              Open GTM →
            </Link>
          </div>
        )}

        <p style={{ fontSize: 12, color: '#AAA', marginTop: 12 }}>
          No credit card required. Works standalone — no ERP needed.
        </p>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section style={{
        padding: '24px 40px', background: '#1A1A1A', color: '#FFF',
        display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap',
      }}>
        {[
          { stat: 'Standalone', desc: 'No ERP required' },
          { stat: 'All 11 Incoterms', desc: '2020 rules supported' },
          { stat: '17 Countries', desc: 'Customs coverage' },
          { stat: 'API-First', desc: 'Every feature via REST' },
          { stat: 'ERP Ready', desc: 'Xero, Sage, Acumatica' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.stat}</div>
            <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.5px' }}>{s.desc}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>
          Everything you need for trade intelligence
        </h2>
        <p style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 48 }}>
          From pre-trade feasibility to post-trade settlement — one platform.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: 24, background: '#FFF', borderRadius: 8,
              border: '1px solid #E8E4DC',
            }}>
              <div style={{
                width: 40, height: 40, background: '#1B433215', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: '#1B4332', marginBottom: 14,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '60px 40px', background: '#1A1A1A', color: '#FFF' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
            How GTM works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {[
              { step: '01', title: 'Enter Deal', desc: 'Supplier quote, product, buying and selling incoterms. GTM detects the responsibility gap.' },
              { step: '02', title: 'Review Costs', desc: 'Full cost matrix generated automatically. Business charges applied. Margin calculated.' },
              { step: '03', title: 'Approve & Execute', desc: 'Submit for approval. On approval, push draft POs to your ERP with one click.' },
              { step: '04', title: 'Track Actuals', desc: 'After settlement, compare estimated vs actual margin. Full deal P&L with variance.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: 24, background: '#222' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1B4332', marginBottom: 8 }}>{s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          Built for the entire trading supply chain
        </h2>
        <p style={{ fontSize: 16, color: '#888', marginBottom: 32 }}>
          GTM adapts to your role — whether you're buying, selling, brokering, or shipping.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {personas.map((p, i) => (
            <span key={i} style={{
              padding: '8px 18px', background: '#FFF', border: '1px solid #E8E4DC',
              borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#1B4332',
            }}>
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '60px 40px', background: '#1B4332', textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
          Start modelling your trades today
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
          Free beta — no credit card, no ERP connection required.
        </p>
        <Link href="/dashboard" style={{
          display: 'inline-block', padding: '14px 32px', background: '#FFF',
          color: '#1B4332', borderRadius: 6, fontSize: 15, fontWeight: 700,
        }}>
          Launch GTM →
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '24px 40px', borderTop: '1px solid #E8E4DC',
        display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#AAA',
      }}>
        <span>© 2026 Phlo Systems Limited. London, UK.</span>
        <span>GTM — Global Trade Management</span>
      </footer>
    </div>
  )
}
