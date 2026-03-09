/**
 * GTM DASHBOARD — Main App Shell & Router
 * 
 * This is the top-level page that:
 *   1. Handles auth (redirect to login if not authenticated)
 *   2. Loads deals/jobs from the API
 *   3. Routes to the correct screen based on active page + role
 * 
 * All UI components are imported from /components/.
 * This file should stay thin — add new screens by creating
 * components, not by adding code here.
 * 
 * File structure:
 *   /components/shared/     → Sidebar, Loading, styles
 *   /components/common/     → DashboardView (both roles)
 *   /components/trader/     → DealsList, PreCalcScreen
 *   /components/forwarder/  → JobsList, ForwarderJobScreen
 */
'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

// Shared
import { S } from "@/components/shared/styles";
import Sidebar from "@/components/shared/Sidebar";
import Loading from "@/components/shared/Loading";

// Common (both roles)
import DashboardView from "@/components/common/DashboardView";

// Trader screens
import DealsList from "@/components/trader/DealsList";
import PreCalcScreen from "@/components/trader/PreCalcScreen";

// Forwarder screens
import ForwarderJobsList from "@/components/forwarder/JobsList";
import ForwarderJobScreen from "@/components/forwarder/ForwarderJobScreen";

export default function GTMApp() {
  const [page, setPage] = useState("dashboard");
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("trader");
  const supabase = createClient();
  const router = useRouter();

  // ── Init: check auth & load data ──
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await loadDeals();
      setLoading(false);
    }
    init();
  }, []);

  const loadDeals = async () => {
    try {
      const res = await fetch("/api/deals");
      if (res.ok) setDeals(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // ── Navigation handlers ──
  const openDeal = (deal) => { setCurrentDeal(deal); setPage("precalc"); };
  const newDeal = () => { setCurrentDeal(null); setPage("precalc"); };
  const openJob = (deal) => { setCurrentDeal(deal); setPage("newjob"); };
  const newJob = () => { setCurrentDeal(null); setPage("newjob"); };
  const handleSaved = (saved) => { setCurrentDeal(saved); loadDeals(); };
  const goBack = () => { setCurrentDeal(null); setPage(role === "forwarder" ? "jobs" : "deals"); loadDeals(); };

  const handleRoleChange = (r) => {
    setRole(r);
    setCurrentDeal(null);
    setPage("dashboard");
  };

  // ── Loading state ──
  if (loading) return <div style={S.page}><Loading text="Loading GTM..." /></div>;

  // ── Page router ──
  const renderPage = () => {
    if (role === "forwarder") {
      switch (page) {
        case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openJob(d) : setPage(p)} role="forwarder" />;
        case "jobs":      return <ForwarderJobsList deals={deals} onOpenJob={openJob} onNewJob={newJob} />;
        case "newjob":    return <ForwarderJobScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
        case "customs":   return <Placeholder title="Customs Clearance" />;
        case "tracking":  return <Placeholder title="Shipment Tracking" />;
        default:          return <DashboardView deals={deals} onNav={setPage} role="forwarder" />;
      }
    } else {
      switch (page) {
        case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openDeal(d) : setPage(p)} role="trader" />;
        case "deals":     return <DealsList deals={deals} onOpenDeal={openDeal} onNewDeal={newDeal} />;
        case "precalc":   return <PreCalcScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
        case "customs":   return <Placeholder title="Customs Intelligence" />;
        case "postcalc":  return <Placeholder title="Post-Trade Analytics" />;
        default:          return <DashboardView deals={deals} onNav={setPage} role="trader" />;
      }
    }
  };

  return (
    <div style={S.page}>
      <Sidebar active={page} onNav={setPage} user={user} onLogout={handleLogout} role={role} onRoleChange={handleRoleChange} />
      <div style={S.main}>{renderPage()}</div>
    </div>
  );
}

// Simple placeholder for screens that haven't been built yet
function Placeholder({ title }) {
  return (
    <div style={S.card}>
      <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
        {title} {"\u2014"} Coming Soon
      </div>
    </div>
  );
}
