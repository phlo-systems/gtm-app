import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

const DEFAULTS = [
  { section_key:"overview", title:"1. System Overview", sort_order:1, content:"GTM (Global Trade Management) is a web-based trade intelligence platform for **physical commodity traders**.\n\nBuilt by **Phlo Systems Ltd** (London, UK).\n\n### Key Capabilities\n- Pre-Trade Feasibility with incoterm gap analysis, freight, customs, P&L\n- Incoterm Gap Engine (all 11 Incoterms 2020)\n- Freight Intelligence (ocean rates by trade lane, voyage schedules)\n- Customs Duty Estimation (19 countries by HS code)\n- Deal Lifecycle: Draft > Submit > Approve > Execute > Post-Trade\n- PO/SO Excel download\n- Budget vs Actual variance analysis\n- Multi-Tenant isolation" },
  { section_key:"features_auth", title:"2.1 Auth & Multi-Tenancy", sort_order:10, content:"- [x] Email/password signup (Supabase Auth)\n- [x] Cookie-based sessions (@supabase/ssr)\n- [x] Multi-tenant isolation (tenant_id on all tables)\n- [ ] Role-based access (planned)" },
  { section_key:"features_master", title:"2.2 Master Data", sort_order:11, content:"- [x] Customers — searchable ComboBox with create-new\n- [x] Suppliers — same, filtered by type\n- [x] Products — ComboBox with HS code auto-fill\n- [x] HS Code Suggestion — 40+ built-in + Claude AI\n- [x] Port Database — 90+ ports with UN/LOCODE" },
  { section_key:"features_deals", title:"2.3 Deal Management", sort_order:12, content:"- [x] Create deal (auto GTM-YYYY-NNN)\n- [x] Edit draft deals\n- [x] Delete draft deals (cascades)\n- [x] Fields: trade type, transport, qty, prices, payment terms, incoterms, ports, HS code, shipment date\n- [x] Conditional fields (inland address for EXW/FCA/DAP/DPU/DDP)\n- [x] Approval workflow: Draft > Submitted > Approved/Rejected" },
  { section_key:"features_precalc", title:"2.4 Pre-Calc / Cost Matrix", sort_order:13, content:"- [x] Auto-generate via Incoterm Gap Engine (Blocks A/B/C)\n- [x] Supplier cost = qty x unit price\n- [x] Editable cost lines with yellow highlight\n- [x] Add new lines (Block D)\n- [x] Apply freight estimates to Block B\n- [x] Apply customs estimates to Block D" },
  { section_key:"features_feasibility", title:"2.5 Feasibility / Deal P&L", sort_order:14, content:"- [x] Revenue = selling price x quantity\n- [x] Cost breakdown by blocks A/B/C/D\n- [x] Gross & net profit/margin\n- [x] Finance cost: 12% p.a. prorated for payment terms gap\n- [x] Dark-themed trade route map (Leaflet)\n- [x] Freight estimates (ocean, BAF, THC, inland, insurance)\n- [x] Customs estimates (duty, VAT, brokerage — 19 countries)\n- [x] Voyage schedules by carrier" },
  { section_key:"features_postcalc", title:"2.6 Post-Trade Analytics", sort_order:15, content:"- [x] Select approved deal\n- [x] Upload actuals Excel (same PO/SO format)\n- [x] Budget vs Actual with variance %\n- [x] Variance attribution waterfall\n- [x] Margin comparison cards" },
  { section_key:"features_poso", title:"2.7 PO/SO Generation", sort_order:16, content:"- [x] Excel download on approved deals\n- [x] Purchase Order sheet\n- [x] Sales Order sheet\n- [x] Cost Matrix sheet" },
  { section_key:"screens", title:"3. Screens & Workflows", sort_order:20, content:"### Pages\n- **/** — Landing page\n- **/login, /signup** — Auth\n- **/dashboard** — KPIs, deals list, Pre-Calc, Post-Calc\n- **/docs** — This wiki\n\n### Pre-Calc Wizard\n1. Deal Sheet (3-column: Trade Structure | Supplier | Customer)\n2. Cost Matrix (editable table)\n3. Feasibility (P&L + map + freight + customs + voyages)\n\n### Approval Flow\n```\nDraft > Submit > Approved/Rejected\nApproved > Download PO/SO > Upload Actuals > Variance Analysis\n```" },
  { section_key:"data_model", title:"4. Data Model", sort_order:30, content:"### Tables\n- **deals** — core trade record\n- **counterparties** — customers & suppliers\n- **products** — with HS codes\n- **cost_matrices** — per deal, versioned\n- **cost_lines** — Block A/B/C/D items\n- **approvals** — audit trail\n- **wiki_sections** — this wiki content\n- **defects** — bug/change tracker\n\n### Relationships\n```\ntenants > profiles, deals, counterparties, products\ndeals > cost_matrices > cost_lines\ndeals > counterparties (customer, supplier)\ndeals > products\n```" },
  { section_key:"api_ref", title:"5. API Reference", sort_order:40, content:"| Method | Endpoint | Description |\n|--------|----------|-------------|\n| GET/POST | /api/deals | List/Create |\n| GET/PUT/DELETE | /api/deals/[id] | CRUD |\n| GET/POST/PUT | /api/deals/[id]/cost-matrix | Cost matrix |\n| POST | /api/deals/[id]/approve | Workflow |\n| GET/POST | /api/counterparties | Master data |\n| GET/POST | /api/products | Master data |\n| GET | /api/freight-estimate | Freight rates |\n| GET | /api/customs-estimate | Duty rates |\n| GET | /api/suggest-hs-code | HS suggestion |\n| GET/PUT | /api/wiki | Wiki CRUD |\n| GET/POST/PUT | /api/defects | Defect tracker |" },
  { section_key:"tech_stack", title:"6. Tech Stack", sort_order:50, content:"- **Next.js 14** on Vercel\n- **Supabase** (PostgreSQL + Auth)\n- **Leaflet.js** (maps, CartoDB Dark tiles)\n- **SheetJS** (Excel, client-side CDN)\n- **Claude API** (HS code suggestion)\n- **Inline styles** (green #1B4332 theme)" },
  { section_key:"repo", title:"7. Repository & Deploy", sort_order:60, content:"- **GitHub**: github.com/phlo-systems/gtm-app (main branch)\n- **Vercel**: auto-deploys on push (~30s)\n- **URL**: gtm-app-rust.vercel.app\n\n### Local Dev\n```\ngit clone, npm install, create .env.local, npm run dev\n```" },
  { section_key:"credentials", title:"8. Credentials", sort_order:70, content:"**SENSITIVE — do not share publicly**\n\n- **Supabase**: project mytilbigjcfttkaarsgp (saurabh.goyal@phlo.io)\n- **Vercel**: saurabh-goyals-projects/gtm-app\n- **GitHub**: phlo-systems org\n\n### Env Vars\n- NEXT_PUBLIC_SUPABASE_URL\n- NEXT_PUBLIC_SUPABASE_ANON_KEY\n- ANTHROPIC_API_KEY (optional)" },
  { section_key:"roadmap", title:"9. Roadmap", sort_order:80, content:"### High Priority\n- Customs Intelligence screen\n- ERP Sync (Xero)\n\n### Medium\n- Stripe payments\n- Role-based access\n- Multi-currency FX\n- Document upload\n\n### Low\n- Real-time freight API\n- Mobile responsive\n- Audit trail UI\n\n### Tech Debt\n- Split dashboard page.js into components\n- Add CSS framework\n- Automated tests\n- Verify RLS policies" },
]

export async function GET() {
  const { supabase } = await getCurrentUser()
  const { data, error } = await supabase.from('wiki_sections').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    const { data: seeded, error: e2 } = await supabase.from('wiki_sections').insert(DEFAULTS.map(s => ({ ...s, updated_by:'system' }))).select().order('sort_order')
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    return NextResponse.json(seeded)
  }
  return NextResponse.json(data)
}

export async function PUT(request) {
  const { supabase, user } = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, title, content } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('wiki_sections').update({ title, content, updated_by: user.email, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
