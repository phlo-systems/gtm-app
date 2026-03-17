'use client'
import CustomsIntelligence from '@/components/common/CustomsIntelligence';
import FuturesPricingWidget from '@/components/trader/FuturesPricingWidget';
import DealExtendedFields from '@/components/trader/DealExtendedFields';
import M2MWidget from '@/components/trader/M2MWidget';
import AgentDashboard from '@/components/agent/AgentDashboard';
import FinancerDashboard from '@/components/financer/FinancerDashboard';
import ManagementFeesSettings from '@/components/admin/ManagementFeesSettings';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { S } from "@/components/shared/styles";
import Sidebar from "@/components/shared/Sidebar";
import Loading from "@/components/shared/Loading";
import DashboardView from "@/components/common/DashboardView";
import DealsList from "@/components/trader/DealsList";
import PreCalcScreen from "@/components/trader/PreCalcScreen";
import ForwarderJobsList from "@/components/forwarder/JobsList";
import ForwarderJobScreen from "@/components/forwarder/ForwarderJobScreen";
import MasterDataScreen from "@/components/common/MasterDataScreen";
import TeamScreen from "@/components/common/TeamScreen";
import ContainerCalculator from "@/components/common/ContainerCalculator";
import CustomsScreen from "@/components/common/CustomsScreen";

export default function GTMApp() {
  const [page, setPage] = useState("dashboard");
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("trader");
  const supabase = createClient();
  const router = useRouter();

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

  const openDeal = (deal) => { setCurrentDeal(deal); setPage("precalc"); };
  const newDeal  = ()     => { setCurrentDeal(null);  setPage("precalc"); };
  const openJob  = (deal) => { setCurrentDeal(deal); setPage("newjob"); };
  const newJob   = ()     => { setCurrentDeal(null);  setPage("newjob"); };

  const handleSaved = (saved) => { setCurrentDeal(saved); loadDeals(); };
  const goBack = () => {
    setCurrentDeal(null);
    setPage(role === "forwarder" ? "jobs" : "deals");
    loadDeals();
  };
  const handleRoleChange = (r) => { setRole(r); setCurrentDeal(null); setPage("dashboard"); };

  if (loading) return <div style={S.page}><Loading text="Loading GTM..." /></div>;

  const renderPage = () => {
    if (role === "forwarder") {
      switch (page) {
        case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openJob(d) : setPage(p)} role="forwarder" />;
        case "m2m":       return <M2MWidget S={S} />;
        case "jobs":      return <ForwarderJobsList deals={deals} onOpenJob={openJob} onNewJob={newJob} />;
        case "newjob":    return <ForwarderJobScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
        case "customs":   return <CustomsIntelligence S={S} />;
        case "agent":     return <AgentDashboard deals={deals} S={S} />;
        case "financer":  return <FinancerDashboard deals={deals} S={S} />;
        case "tracking":  return <Placeholder title="Shipment Tracking" />;
        case "calculator":return <ContainerCalculator />;
        case "masterdata":return <MasterDataScreen role="forwarder" />;
        case "team":      return <TeamScreen />;
        default:          return <DashboardView deals={deals} onNav={setPage} role="forwarder" />;
      }
    } else {
      switch (page) {
        case "dashboard": return <DashboardView deals={deals} onNav={(p, d) => d ? openDeal(d) : setPage(p)} role="trader" />;
        case "deals":     return <DealsList deals={deals} onOpenDeal={openDeal} onNewDeal={newDeal} />;
        case "precalc":   return <PreCalcScreen deal={currentDeal} onBack={goBack} onSaved={handleSaved} />;
        case "customs":   return <CustomsIntelligence S={S} />;
        case "agent":     return <AgentDashboard deals={deals} S={S} />;
        case "financer":  return <FinancerDashboard deals={deals} S={S} />;
        case "postcalc":  return <Placeholder title="Post-Trade Analytics" />;
        case "calculator":return <ContainerCalculator />;
        case "masterdata":return <MasterDataScreen role="trader" />;
        case "team":      return <TeamScreen />;
        case "settings":  return <ManagementFeesSettings S={S} />;
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

function Placeholder({ title }) {
  return (
    <div style={S.card}>
      <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
        {title} — Coming Soon
      </div>
    </div>
  );
}
