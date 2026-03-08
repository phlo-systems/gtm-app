'use client'
import { useState } from "react";

const sections = [
  { id: "overview", label: "1. Overview" },
  { id: "features", label: "2. Features" },
  { id: "screens", label: "3. Screens & Workflows" },
  { id: "data-model", label: "4. Data Model" },
  { id: "api", label: "5. API Reference" },
  { id: "tech-stack", label: "6. Tech Stack" },
  { id: "repo", label: "7. Repository & Deploy" },
  { id: "credentials", label: "8. Credentials" },
  { id: "roadmap", label: "9. Roadmap & Backlog" },
];

export default function DocsPage() {
  const [active, setActive] = useState("overview");

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const H2 = ({ id, children }) => <h2 id={id} style={{ fontSize: 22, fontWeight: 800, color: "#1B4332", margin: "48px 0 16px", paddingTop: 24, borderTop: "2px solid #E8E4DC" }}>{children}</h2>;
  const H3 = ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2D5741", margin: "28px 0 10px" }}>{children}</h3>;
  const H4 = ({ children }) => <h4 style={{ fontSize: 14, fontWeight: 700, color: "#444", margin: "20px 0 8px" }}>{children}</h4>;
  const P = ({ children }) => <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333", margin: "0 0 12px" }}>{children}</p>;
  const Code = ({ children }) => <code style={{ background: "#F5F2EB", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontFamily: "monospace", color: "#1B4332" }}>{children}</code>;
  const Pre = ({ children }) => <pre style={{ background: "#1A1A2E", color: "#E0E0E0", padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "monospace", overflow: "auto", margin: "8px 0 16px", lineHeight: 1.6 }}>{children}</pre>;
  const Table = ({ headers, rows }) => (
    <div style={{ overflow: "auto", margin: "8px 0 16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "8px 12px", background: "#1B4332", color: "#FFF", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} style={{ background: i % 2 ? "#FAFAF8" : "#FFF" }}>{row.map((cell, j) => <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid #E8E4DC", verticalAlign: "top" }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
  const Badge = ({ color, children }) => <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: color + "18", color, marginRight: 4 }}>{children}</span>;
  const Alert = ({ type, children }) => {
    const colors = { info: "#1565C0", warning: "#E65100", danger: "#C62828", success: "#2E7D32" };
    return <div style={{ padding: "12px 16px", borderRadius: 8, background: (colors[type] || "#1565C0") + "10", border: "1px solid " + (colors[type] || "#1565C0") + "30", margin: "12px 0", fontSize: 13, color: "#333" }}>{children}</div>;
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, sans-serif", background: "#F8F7F4", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#1B4332", color: "#FFF", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>GTM — System Documentation</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Global Trade Management Platform | Phlo Systems Ltd</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/dashboard" style={{ color: "#A5D6A7", fontSize: 13, textDecoration: "none" }}>Launch App</a>
          <span style={{ opacity: 0.3 }}>|</span>
          <span style={{ fontSize: 12, opacity: 0.5 }}>v0.3 | March 2026</span>
        </div>
      </div>

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto" }}>
        {/* Sidebar Nav */}
        <div style={{ width: 220, padding: "24px 0", position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 }}>
          {sections.map(s => (
            <div key={s.id} onClick={() => scrollTo(s.id)} style={{
              padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: active === s.id ? 700 : 400,
              color: active === s.id ? "#1B4332" : "#666", borderLeft: active === s.id ? "3px solid #1B4332" : "3px solid transparent",
              background: active === s.id ? "#E8F5E9" : "transparent",
            }}>{s.label}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "32px 40px", maxWidth: 800 }}>

          {/* ─── 1. OVERVIEW ─── */}
          <H2 id="overview">1. System Overview</H2>
          <P>GTM (Global Trade Management) is a web-based trade intelligence platform for <strong>physical commodity traders</strong>. It enables users to model trade costs, validate incoterm obligations, calculate customs duty, estimate freight, and track deal profitability from feasibility to settlement.</P>
          <P>Built by <strong>Phlo Systems Ltd</strong> (London, UK) as a standalone SaaS product targeting SME traders who need pre-trade analytics without a full CTRM/ERP system.</P>

          <H3>Key Value Proposition</H3>
          <Table headers={["Capability", "Description"]} rows={[
            ["Pre-Trade Feasibility", "Full cost matrix with incoterm gap analysis, freight estimates, customs duties, and P&L with finance cost"],
            ["Incoterm Gap Engine", "Automatically identifies cost blocks the trader must cover based on buying vs selling incoterms (all 11 Incoterms 2020)"],
            ["Freight Intelligence", "Estimated ocean freight rates by trade lane with voyage schedule estimates"],
            ["Customs Duty Estimation", "Import duty + VAT across 19 countries based on HS code chapter"],
            ["Deal Lifecycle", "Draft → Submit → Approve → Execute → Post-Trade Analysis"],
            ["PO/SO Generation", "Downloadable Excel with Purchase Order, Sales Order, and Cost Matrix sheets"],
            ["Budget vs Actual", "Upload ERP actuals and get variance attribution analysis"],
            ["Multi-Tenant", "Each company gets isolated data via tenant_id on all tables"],
          ]} />

          {/* ─── 2. FEATURES ─── */}
          <H2 id="features">2. Feature Inventory</H2>

          <H3>2.1 Authentication & Multi-Tenancy</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Email/password signup", "✅ Live", "Supabase Auth, email confirmation disabled for beta"],
            ["Session management", "✅ Live", "Cookie-based via @supabase/ssr middleware"],
            ["Multi-tenant isolation", "✅ Live", "All tables have tenant_id, all queries filter by it"],
            ["Role-based access", "🔲 Planned", "Currently single role per tenant"],
          ]} />

          <H3>2.2 Master Data</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Customers (counterparties)", "✅ Live", "Searchable ComboBox dropdown with create-new option"],
            ["Suppliers (counterparties)", "✅ Live", "Same ComboBox, filtered by type=supplier"],
            ["Products", "✅ Live", "ComboBox with HS code auto-fill on selection"],
            ["HS Code Suggestion", "✅ Live", "Built-in lookup (40+ commodities) + Claude API fallback"],
            ["Port Database", "✅ Live", "90+ world ports with UN/LOCODE, searchable dropdown"],
          ]} />

          <H3>2.3 Deal Management</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Create deal", "✅ Live", "Auto-generates deal number (GTM-YYYY-NNN)"],
            ["Edit draft deal", "✅ Live", "All fields editable while status=draft"],
            ["Delete draft deal", "✅ Live", "Cascades to cost_lines, cost_matrices, approvals"],
            ["Deal fields", "✅ Live", "Trade type, transport mode, qty, unit price, selling price, payment terms, incoterms, ports, HS code, shipment date"],
            ["Conditional fields", "✅ Live", "Inland address for EXW/FCA/DAP/DPU/DDP; port selection for ocean"],
            ["Approval workflow", "✅ Live", "Draft → Submitted → Approved/Rejected"],
          ]} />

          <H3>2.4 Pre-Calc / Cost Matrix</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Auto-generate cost matrix", "✅ Live", "Incoterm Gap Engine creates Block A (supplier) + Block B (gap costs) + Block C (business charges)"],
            ["Supplier cost = qty × price", "✅ Live", "Block A calculated from deal sheet values"],
            ["Editable cost lines", "✅ Live", "Click any amount to edit, yellow highlight on changes"],
            ["Add new cost lines", "✅ Live", "Block D - additional/custom costs"],
            ["Save changes", "✅ Live", "PUT /api/deals/[id]/cost-matrix recalculates totals"],
            ["Apply freight estimates", "✅ Live", "Fetches from /api/freight-estimate, adds as Block B lines"],
            ["Apply customs estimates", "✅ Live", "Fetches from /api/customs-estimate, adds as Block D lines"],
          ]} />

          <H3>2.5 Feasibility / Deal P&L</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Revenue calculation", "✅ Live", "Selling price × quantity"],
            ["Cost of sales breakdown", "✅ Live", "Blocks A + B + C + D"],
            ["Gross profit / margin", "✅ Live", "Revenue minus total COS"],
            ["Finance cost", "✅ Live", "12% p.a. prorated for financing gap (customer days - supplier days)"],
            ["Net profit / margin", "✅ Live", "Gross profit minus finance cost"],
            ["Trade route map", "✅ Live", "Dark-themed Leaflet map with curved ocean routes, port markers, transport mode labels"],
            ["Freight cost estimate", "✅ Live", "Itemised: ocean, BAF, THC, inland, insurance, docs"],
            ["Customs cost estimate", "✅ Live", "Duty rate, VAT, brokerage, inspection by destination country"],
            ["Voyage schedules", "✅ Live", "Estimated sailings by carrier, frequency, transit days"],
          ]} />

          <H3>2.6 Post-Trade Analytics</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Select approved deal", "✅ Live", "Shows all approved deals with budget data"],
            ["Upload actuals (Excel)", "✅ Live", "Same PO/SO format, reads Cost Matrix sheet"],
            ["Budget vs Actual table", "✅ Live", "Side-by-side with variance and % columns"],
            ["Variance attribution", "✅ Live", "Ranked waterfall of top cost drivers with bar chart"],
            ["Margin comparison", "✅ Live", "Budget margin vs actual margin summary cards"],
          ]} />

          <H3>2.7 PO/SO Generation</H3>
          <Table headers={["Feature", "Status", "Notes"]} rows={[
            ["Download Excel", "✅ Live", "Available on approved deals via 'Download PO/SO' button"],
            ["Purchase Order sheet", "✅ Live", "Supplier, product, pricing, cost breakdown"],
            ["Sales Order sheet", "✅ Live", "Customer, selling price, margin summary, shipment details"],
            ["Cost Matrix sheet", "✅ Live", "All cost lines for ERP upload / actuals entry"],
          ]} />

          {/* ─── 3. SCREENS ─── */}
          <H2 id="screens">3. Screens & User Workflows</H2>

          <H3>3.1 Landing Page (<Code>/</Code>)</H3>
          <P>Marketing page with tagline, feature badges, email capture for beta signup. Links to <Code>/login</Code> and <Code>/signup</Code>.</P>

          <H3>3.2 Login / Signup (<Code>/login</Code>, <Code>/signup</Code>)</H3>
          <P>Email/password auth via Supabase. Signup creates a user + tenant + profile. Middleware redirects unauthenticated users to /login and authenticated users away from /login.</P>

          <H3>3.3 Dashboard (<Code>/dashboard</Code>)</H3>
          <P>KPI cards (Active Deals, Drafts, Approved, Total). Recent Deals table (top 5). Click any deal to open Pre-Calc. "View All" navigates to Deals list.</P>

          <H3>3.4 Deals List</H3>
          <P>Full table of all deals with Deal ID, Customer, Supplier, Incoterms, Status, Margin. "+ New Deal" button. Delete button (✕) on draft deals. Click a row to open Pre-Calc.</P>

          <H3>3.5 Pre-Calc (3-step wizard)</H3>
          <H4>Step 1: Deal Sheet</H4>
          <P>Three-column layout: Trade Structure (type, transport, qty, unit, shipment date, product ComboBox) | Supplier/Origin (supplier ComboBox, buy incoterm, location, port, unit price, HS code with suggest, payment terms, inland address) | Customer/Destination (customer ComboBox, sell incoterm, location, port, selling price, currency, payment terms, inland address). Incoterm gap warning banner at bottom.</P>

          <H4>Step 2: Cost Matrix</H4>
          <P>Editable table with Block, Cost Line, Type, Amount, Responsibility. "+ Add Cost" button. "Save Changes" button (yellow) when dirty. Live total recalculation. Amounts are inline editable inputs.</P>

          <H4>Step 3: Feasibility</H4>
          <P>Full P&L: Revenue → Cost blocks → Gross Profit → Finance Cost (with payment terms breakdown) → Net Profit. Summary cards on right (net margin gauge, gross margin, finance cost, revenue vs cost bar). Below: Trade route map (dark theme), freight estimates with "Apply to Cost Matrix" button, customs estimates with "Fetch" and "Apply" buttons, voyage schedules.</P>

          <H3>3.6 Post-Calc</H3>
          <P>Select an approved deal → view budget cost matrix → upload actuals Excel → see Budget vs Actual variance table → variance attribution with ranked waterfall.</P>

          <H3>3.7 Approval Workflow</H3>
          <Pre>{`Draft → [Save Draft] → Draft (editable)
Draft → [Submit for Approval] → Submitted (locked)
Submitted → [Approve] → Approved (PO/SO downloadable)
Submitted → [Reject] → Rejected
Approved → [Upload Actuals] → Post-Trade Analysis`}</Pre>

          {/* ─── 4. DATA MODEL ─── */}
          <H2 id="data-model">4. Data Model (Supabase/PostgreSQL)</H2>

          <H3>4.1 Entity Relationship</H3>
          <Pre>{`tenants (1) ──── (N) profiles (linked to auth.users)
tenants (1) ──── (N) deals
tenants (1) ──── (N) counterparties
tenants (1) ──── (N) products
tenants (1) ──── (N) business_charge_templates

deals (1) ──── (N) cost_matrices
deals (1) ──── (N) approvals
deals (N) ──── (1) counterparties (customer_id)
deals (N) ──── (1) counterparties (supplier_id)
deals (N) ──── (1) products (product_id)

cost_matrices (1) ──── (N) cost_lines`}</Pre>

          <H3>4.2 Table Schemas</H3>

          <H4>tenants</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", "Auto-generated"],
            ["name", "text", "Company name"],
            ["created_at", "timestamptz", "Default now()"],
          ]} />

          <H4>profiles</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", "References auth.users(id)"],
            ["tenant_id", "uuid (FK)", "References tenants(id)"],
            ["full_name", "text", ""],
            ["role", "text", "Default 'admin'"],
          ]} />

          <H4>deals</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", "Auto-generated"],
            ["tenant_id", "uuid (FK)", "References tenants(id)"],
            ["deal_number", "text", "Auto-generated: GTM-YYYY-NNN"],
            ["status", "text", "draft | submitted | approved | rejected"],
            ["trade_type", "text", "cross_border_direct | cross_border_intermediated | domestic | transit_reexport"],
            ["transport_mode", "text", "ocean | road | air"],
            ["customer_id", "uuid (FK)", "References counterparties(id)"],
            ["supplier_id", "uuid (FK)", "References counterparties(id)"],
            ["product_id", "uuid (FK)", "References products(id)"],
            ["buy_incoterm", "text", "e.g. FOB"],
            ["buy_location", "text", "e.g. Mumbai, India"],
            ["sell_incoterm", "text", "e.g. CIF"],
            ["sell_location", "text", "e.g. Durban, South Africa"],
            ["unit_price", "numeric", "Buy price per unit"],
            ["selling_price", "numeric", "Sell price per unit"],
            ["quantity", "numeric", ""],
            ["quantity_unit", "text", "MT | KG | CBM | Units | Containers | Bags | Drums"],
            ["cost_currency", "text", "Default USD"],
            ["sales_currency", "text", "Default USD"],
            ["supplier_payment_terms", "text", "Net 30 | Net 60 | LC at Sight | etc."],
            ["customer_payment_terms", "text", "Same options"],
            ["hs_code", "text", "e.g. 1701.99"],
            ["expected_shipment_date", "date", "nullable"],
            ["created_by", "uuid (FK)", "References profiles(id)"],
            ["created_at", "timestamptz", "Default now()"],
          ]} />

          <H4>counterparties</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", ""],
            ["tenant_id", "uuid (FK)", ""],
            ["name", "text", ""],
            ["type", "text", "customer | supplier | agent | forwarder"],
            ["country", "text", ""],
            ["payment_terms", "text", ""],
            ["currency", "text", "Default USD"],
            ["contact_email", "text", ""],
            ["contact_phone", "text", ""],
            ["is_active", "boolean", "Default true"],
          ]} />

          <H4>products</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", ""],
            ["tenant_id", "uuid (FK)", ""],
            ["name", "text", ""],
            ["hs_code", "text", ""],
            ["units_per_case", "integer", "Default 1"],
            ["cases_per_container", "integer", "Default 1"],
            ["is_active", "boolean", "Default true"],
          ]} />

          <H4>cost_matrices</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", ""],
            ["deal_id", "uuid (FK)", "References deals(id)"],
            ["leg_number", "integer", "Default 1"],
            ["version", "integer", "Default 1"],
            ["status", "text", "draft | locked"],
            ["total_cost", "numeric", "Calculated"],
            ["gross_margin_pct", "numeric", "Calculated"],
            ["locked_at", "timestamptz", "nullable"],
          ]} />

          <H4>cost_lines</H4>
          <Table headers={["Column", "Type", "Notes"]} rows={[
            ["id", "uuid (PK)", ""],
            ["matrix_id", "uuid (FK)", "References cost_matrices(id)"],
            ["block", "text", "A = supplier | B = incoterm gap/freight | C = business charges | D = additional/customs"],
            ["line_item", "text", "Description"],
            ["cost_type", "text", "base | incoterm_gap | business_charge | additional"],
            ["calc_type", "text", "fixed | percentage"],
            ["amount", "numeric", "USD amount"],
            ["amount_per_unit", "numeric", ""],
            ["currency", "text", "Default USD"],
            ["source", "text", "manual | template | api"],
            ["responsibility", "text", "Supplier | Trader"],
            ["sort_order", "integer", "Display order"],
            ["is_active", "boolean", "Default true"],
          ]} />

          <H4>Other Tables</H4>
          <P><Code>business_charge_templates</Code> — tenant-specific default charges (e.g. commission %, insurance %). <Code>approvals</Code> — audit trail of submit/approve/reject actions. <Code>audit_log</Code> — general change log. <Code>actuals</Code> — planned for actual cost capture.</P>

          {/* ─── 5. API ─── */}
          <H2 id="api">5. API Reference</H2>
          <P>All API routes are Next.js Route Handlers at <Code>/src/app/api/</Code>. All protected routes require Supabase auth cookie.</P>

          <Table headers={["Method", "Endpoint", "Description"]} rows={[
            ["GET", "/api/deals", "List all deals for tenant (with customer, supplier, product joins)"],
            ["POST", "/api/deals", "Create new deal (auto-creates counterparties/products if name given without ID)"],
            ["GET", "/api/deals/[id]", "Get deal with full joins (cost_matrices, cost_lines, approvals)"],
            ["PUT", "/api/deals/[id]", "Update draft deal (sanitizes fields to DB-safe whitelist)"],
            ["DELETE", "/api/deals/[id]", "Delete draft deal (cascades to cost_lines, matrices, approvals)"],
            ["GET", "/api/deals/[id]/cost-matrix", "Get all cost matrices for deal"],
            ["POST", "/api/deals/[id]/cost-matrix", "Generate new cost matrix using Incoterm Gap Engine"],
            ["PUT", "/api/deals/[id]/cost-matrix", "Update cost lines (edit amounts, add new, delete), recalculates totals"],
            ["POST", "/api/deals/[id]/approve", "Submit, approve, or reject a deal"],
            ["GET", "/api/counterparties?type=X", "List counterparties filtered by type"],
            ["POST", "/api/counterparties", "Create new counterparty"],
            ["GET", "/api/products", "List products for tenant"],
            ["POST", "/api/products", "Create new product"],
            ["GET", "/api/freight-estimate?params", "Get freight cost estimate (olat, olng, dlat, dlng, origin, dest, mode)"],
            ["GET", "/api/customs-estimate?params", "Get customs duty estimate (hs_code, destination, cargo_value)"],
            ["GET", "/api/suggest-hs-code?product=X", "Get HS code suggestions for product description"],
            ["GET", "/api/auth/callback", "Supabase auth callback handler"],
          ]} />

          <H3>5.1 Key API Patterns</H3>
          <Pre>{`// All routes start with auth check:
const { supabase, tenantId } = await getCurrentUser()
if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// All queries filter by tenant:
.eq('tenant_id', tenantId)

// PUT /api/deals/[id] sanitizes form fields:
const DEAL_FIELDS = ['trade_type', 'transport_mode', ... ]  // whitelist
// Strips UI-only fields: port_of_origin, customer_inland_address, etc.`}</Pre>

          {/* ─── 6. TECH STACK ─── */}
          <H2 id="tech-stack">6. Tech Stack & Architecture</H2>

          <Table headers={["Layer", "Technology", "Version"]} rows={[
            ["Framework", "Next.js (React)", "14.2.18"],
            ["Hosting", "Vercel", "Hobby plan"],
            ["Database", "Supabase (PostgreSQL)", "Free tier"],
            ["Auth", "Supabase Auth (@supabase/ssr)", "0.5.2"],
            ["Maps", "Leaflet.js", "1.9.4 (CDN)"],
            ["Map Tiles", "CartoDB Dark Matter", "Via CDN"],
            ["Geocoding", "Nominatim (OpenStreetMap)", "Free API"],
            ["Excel", "SheetJS (xlsx)", "0.20.3 (CDN, client-side)"],
            ["HS Code AI", "Claude API (Anthropic)", "claude-sonnet-4-20250514"],
            ["Styling", "Inline styles (no CSS framework)", "Green theme #1B4332"],
          ]} />

          <H3>6.1 File Structure</H3>
          <Pre>{`gtm-app/
├── jsconfig.json          # Path aliases: @/* → ./src/*
├── next.config.js         # Next.js config (minimal)
├── package.json           # Dependencies: next, react, @supabase/ssr, @supabase/supabase-js
├── src/
│   ├── middleware.js       # Auth guard: /dashboard protected, /login redirects if authed
│   ├── lib/
│   │   ├── supabase-server.js   # Server-side Supabase client (cookie-based)
│   │   ├── supabase-browser.js  # Client-side Supabase client
│   │   ├── auth-helpers.js      # getCurrentUser() → { user, profile, tenantId, supabase }
│   │   ├── incoterms.js         # Incoterm Gap Engine + cost matrix generator (199 lines)
│   │   └── ports.js             # World ports database + voyage schedules (180 lines)
│   └── app/
│       ├── page.js              # Landing page (236 lines)
│       ├── layout.js            # Root layout with metadata
│       ├── globals.css           # Minimal global styles
│       ├── login/page.js         # Login form
│       ├── signup/page.js        # Signup form
│       ├── docs/page.js          # This documentation page
│       ├── dashboard/page.js     # Main app (all screens: ~1400 lines)
│       └── api/
│           ├── auth/callback/route.js
│           ├── deals/route.js
│           ├── deals/[id]/route.js
│           ├── deals/[id]/cost-matrix/route.js
│           ├── deals/[id]/approve/route.js
│           ├── counterparties/route.js
│           ├── products/route.js
│           ├── freight-estimate/route.js
│           ├── customs-estimate/route.js
│           └── suggest-hs-code/route.js`}</Pre>

          <H3>6.2 Key Libraries / Engines</H3>
          <H4>Incoterm Gap Engine (<Code>src/lib/incoterms.js</Code>)</H4>
          <P>Maps each incoterm to a responsibility level (0-10). Compares buyer vs seller levels to identify cost blocks the trader must cover. Generates Block B cost lines automatically.</P>
          <Pre>{`EXW=0, FCA=1, FAS=2, FOB=3, CFR=5, CIF=6, CPT=5, CIP=6, DAP=8, DPU=9, DDP=10
Gap costs activate for levels between buy and sell incoterms.
E.g. FOB(3) → CIF(6) activates: Main Carriage, Cargo Insurance`}</Pre>

          <H4>Freight Estimate Engine (<Code>src/app/api/freight-estimate/route.js</Code>)</H4>
          <P>Built-in rate table with FBX/WCI Q1 2026 benchmarks for 14 trade lanes. Falls back to distance-based estimate using Haversine formula. Returns: ocean freight, BAF, THC, inland, insurance, documentation, total.</P>

          <H4>Customs Estimate Engine (<Code>src/app/api/customs-estimate/route.js</Code>)</H4>
          <P>Covers 19 countries with duty rates by HS chapter (first 2 digits). Location-to-country resolver (e.g. "Durban" → ZA). Returns: duty rate, duty amount, VAT/GST, brokerage, inspection, total.</P>

          <H4>Finance Cost Calculation</H4>
          <P>Payment terms converted to days. Financing gap = max(0, customer_days - supplier_days). Finance cost = total_COS × 12% × gap_days / 365. Displayed in P&L with full breakdown.</P>

          {/* ─── 7. REPO ─── */}
          <H2 id="repo">7. Repository, Deployment & Development</H2>

          <H3>7.1 Git Repository</H3>
          <Table headers={["Item", "Value"]} rows={[
            ["GitHub Repo", "https://github.com/phlo-systems/gtm-app"],
            ["Branch", "main (auto-deploys to Vercel)"],
            ["Owner", "phlo-systems org"],
          ]} />

          <H3>7.2 Deployment</H3>
          <Table headers={["Item", "Value"]} rows={[
            ["Platform", "Vercel (Hobby plan)"],
            ["Project", "gtm-app"],
            ["Production URL", "https://gtm-app-rust.vercel.app"],
            ["Auto-deploy", "Every push to main triggers build (~30s)"],
            ["Build command", "npm run build (Next.js)"],
            ["Node.js", "18.x"],
          ]} />

          <H3>7.3 Local Development</H3>
          <Pre>{`# Clone
git clone https://github.com/phlo-systems/gtm-app.git
cd gtm-app

# Install
npm install

# Create .env.local (copy from .env.local.example)
NEXT_PUBLIC_SUPABASE_URL=https://mytilbigjcfttkaarsgp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see Supabase dashboard>

# Optional: for HS code AI suggestions
ANTHROPIC_API_KEY=<your key>

# Run dev server
npm run dev
# Opens at http://localhost:3000`}</Pre>

          <H3>7.4 Deploy Workflow</H3>
          <Pre>{`# After making changes:
git add -A
git commit -m "description of changes"
git push origin main
# Vercel auto-deploys in ~30 seconds
# Monitor: https://vercel.com/saurabh-goyals-projects/gtm-app/deployments`}</Pre>

          {/* ─── 8. CREDENTIALS ─── */}
          <H2 id="credentials">8. Credentials & Access</H2>
          <Alert type="danger"><strong>SENSITIVE:</strong> Do not share this section publicly. Rotate keys if this document is exposed outside the team.</Alert>

          <Table headers={["Service", "Dashboard URL", "How to Access"]} rows={[
            ["Supabase", "https://supabase.com/dashboard/project/mytilbigjcfttkaarsgp", "Login as project owner (saurabh.goyal@phlo.io)"],
            ["Vercel", "https://vercel.com/saurabh-goyals-projects/gtm-app", "Login as saurabh.goyal@phlo.io"],
            ["GitHub", "https://github.com/phlo-systems/gtm-app", "phlo-systems org member"],
          ]} />

          <H3>8.1 Environment Variables (Vercel)</H3>
          <Table headers={["Key", "Where to find", "Notes"]} rows={[
            ["NEXT_PUBLIC_SUPABASE_URL", "Supabase → Settings → API → Project URL", "Public, safe to expose"],
            ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase → Settings → API → anon/public key", "Public, safe to expose (RLS enforces security)"],
            ["ANTHROPIC_API_KEY", "Anthropic Console → API Keys", "Optional, for HS code AI suggestions. Add to Vercel env vars if needed"],
          ]} />

          <H3>8.2 Supabase Project</H3>
          <Table headers={["Item", "Value"]} rows={[
            ["Project name", "gtm-app"],
            ["Org", "PhloCN"],
            ["Project ref", "mytilbigjcfttkaarsgp"],
            ["Region", "Free tier (auto-assigned)"],
            ["Auth", "Email/password enabled, email confirmation OFF"],
            ["RLS", "Should be enabled on all tables (verify)"],
          ]} />

          <H3>8.3 Key Accounts</H3>
          <P>The first user account (<Code>saurabh.goyal@phlo.io</Code>) was created during initial testing. For production, create proper admin accounts via the signup flow or Supabase dashboard.</P>

          {/* ─── 9. ROADMAP ─── */}
          <H2 id="roadmap">9. Roadmap & Backlog</H2>

          <H3>9.1 Pending Features</H3>
          <Table headers={["Feature", "Priority", "Notes"]} rows={[
            ["Customs Intelligence screen", "High", "Dedicated screen for HS code lookup across 17 countries (standalone tool already built as React artifact)"],
            ["ERP Sync (Xero)", "High", "Push approved PO/SO to Xero as draft invoices/bills. Xero API integration."],
            ["Stripe Payments", "Medium", "Subscription billing for SaaS model"],
            ["Role-based access control", "Medium", "Trader, Manager, Admin roles with different permissions"],
            ["Multi-currency support", "Medium", "FX conversion in cost matrix and P&L"],
            ["Contract/document upload", "Medium", "Attach PDFs (LC, BL, COO) to deals"],
            ["Trade finance integration", "Low", "Connect to trade financiers for LC/BG issuance"],
            ["Real-time freight API", "Low", "Freightos or SeaRates API integration (requires paid key)"],
            ["Mobile responsive", "Low", "Current UI is desktop-only"],
            ["Audit trail UI", "Low", "View change history per deal"],
          ]} />

          <H3>9.2 Known Issues / Tech Debt</H3>
          <Table headers={["Issue", "Severity", "Notes"]} rows={[
            ["All screens in single page.js", "Medium", "Dashboard page.js is ~1400 lines. Should be split into separate components."],
            ["Inline styles", "Low", "No CSS-in-JS or Tailwind. Fine for MVP but harder to theme."],
            ["No automated tests", "Medium", "No unit or integration tests exist yet."],
            ["RLS policies", "High", "Verify Row Level Security is properly configured on all Supabase tables."],
            ["No error boundaries", "Low", "API errors show alert() — should have proper toast notifications."],
            ["Port/address fields not persisted", "Medium", "port_of_origin, port_of_dest, inland addresses are UI-only — not saved to deals table. Add columns if needed."],
            ["Freight rates static", "Low", "Built-in rate table needs periodic manual updates."],
          ]} />

          <H3>9.3 For Business Analysts</H3>
          <Alert type="info">To propose changes to these requirements, create a copy of this document and annotate with your modifications. Mark additions in <strong style={{color:"#2E7D32"}}>green</strong>, deletions in <strong style={{color:"#C62828"}}>red</strong>, and questions in <strong style={{color:"#1565C0"}}>blue</strong>. Or use the deal workflow above as a reference and describe new screens/fields needed.</Alert>

          <H3>9.4 For Developers</H3>
          <Alert type="info">Start by cloning the repo and running <Code>npm run dev</Code>. The entire app UI lives in <Code>src/app/dashboard/page.js</Code> — this is the first file to refactor into components. API routes are clean and follow a consistent pattern. The Incoterm Gap Engine in <Code>src/lib/incoterms.js</Code> is the core business logic — understand it before making cost calculation changes.</Alert>

          <div style={{ margin: "48px 0", padding: 24, background: "#1B4332", borderRadius: 12, color: "#FFF", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>GTM — Global Trade Management</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>Built by Phlo Systems Ltd | London, UK | v0.3 March 2026</div>
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>This document is auto-generated and served at /docs on the GTM platform.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
