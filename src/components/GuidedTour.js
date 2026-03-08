'use client'
import { useState, useEffect, useCallback } from "react";

const TOUR_STEPS = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to GTM!",
    content: "GTM helps you model trade costs, validate incoterms, estimate freight & customs, and track deal profitability. Let's take a quick tour of the key features.",
    position: "center",
    icon: "\uD83C\uDF1F",
  },
  {
    id: "sidebar",
    target: "[data-tour='sidebar']",
    title: "Navigation",
    content: "Use the sidebar to move between screens: Dashboard, Deals, Pre-Calc, Customs, Post-Calc, Master Data, and Settings.",
    position: "right",
    icon: "\uD83D\uDCCD",
  },
  {
    id: "master-data",
    target: "[data-tour='nav-master']",
    title: "Step 1: Set Up Master Data",
    content: "Start here. Add your Customers, Suppliers, and Products. You can also create them on-the-fly when entering deals, but setting up master data first saves time.",
    position: "right",
    icon: "\uD83D\uDCCB",
  },
  {
    id: "settings",
    target: "[data-tour='nav-settings']",
    title: "Step 2: Configure Cost Templates",
    content: "Set up your standard business charges here — insurance %, commission, bank charges, fumigation, etc. These will auto-populate as Block C when you generate a cost matrix.",
    position: "right",
    icon: "\u2699\uFE0F",
  },
  {
    id: "new-deal",
    target: "[data-tour='nav-deals']",
    title: "Step 3: Create a Deal",
    content: "Go to Deals and click '+ New Deal'. Fill in the Deal Sheet with supplier, customer, product, incoterms, quantities, and prices. The system will detect incoterm gaps automatically.",
    position: "right",
    icon: "\uD83D\uDCC4",
  },
  {
    id: "cost-matrix",
    target: "[data-tour='nav-precalc']",
    title: "Step 4: Generate Cost Matrix",
    content: "After saving a deal, click 'Gen Cost Matrix'. The Incoterm Gap Engine calculates all costs the trader must cover. You can edit any amount and add custom cost lines.",
    position: "right",
    icon: "\uD83D\uDCCA",
  },
  {
    id: "feasibility",
    target: "[data-tour='nav-precalc']",
    title: "Step 5: Check Feasibility",
    content: "The Feasibility tab shows a full P&L: Revenue, Cost of Sales, Finance Cost (based on payment terms gap), and Net Profit. Below, you'll find the trade route map, freight estimates, customs duties, and voyage schedules.",
    position: "right",
    icon: "\uD83D\uDCB0",
  },
  {
    id: "freight-customs",
    target: "[data-tour='nav-precalc']",
    title: "Step 6: Apply Freight & Customs",
    content: "On the Feasibility tab, click 'Apply Freight to Cost Matrix' to auto-fill Block B with freight costs. Click 'Fetch Customs Estimate' then 'Apply Customs to Cost Matrix' for import duties. Both update the cost matrix directly.",
    position: "right",
    icon: "\uD83D\uDE9A",
  },
  {
    id: "approve",
    target: "[data-tour='nav-deals']",
    title: "Step 7: Submit & Approve",
    content: "When the deal looks good, click 'Submit for Approval'. A manager can then Approve or Reject. Approved deals unlock PO/SO download.",
    position: "right",
    icon: "\u2705",
  },
  {
    id: "download",
    target: "[data-tour='nav-deals']",
    title: "Step 8: Download PO/SO Excel",
    content: "On approved deals, click 'Download PO/SO (Excel)'. You'll get a 3-sheet workbook: Purchase Order, Sales Order, and Cost Matrix. The Cost Matrix has a dedicated 'Actual' column for you to fill in from your ERP.",
    position: "right",
    icon: "\uD83D\uDCE5",
  },
  {
    id: "postcalc",
    target: "[data-tour='nav-postcalc']",
    title: "Step 9: Post-Trade Analysis",
    content: "After execution, go to Post-Calc. Select your deal, upload the Excel with actuals filled in, and get a full Budget vs Actual variance analysis showing which costs drove the difference. Click 'Save to System' to keep the results.",
    position: "right",
    icon: "\uD83D\uDD0D",
  },
  {
    id: "wiki",
    target: null,
    title: "Need Help?",
    content: "Visit the Requirements Wiki at /docs to see detailed documentation, report bugs, or suggest changes. You're all set — let's start trading!",
    position: "center",
    icon: "\uD83D\uDE80",
  },
];

export default function GuidedTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState(null);

  const currentStep = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  const updateTarget = useCallback(() => {
    if (!currentStep?.target) { setTargetRect(null); return; }
    const el = document.querySelector(currentStep.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else { setTargetRect(null); }
  }, [currentStep]);

  useEffect(() => { updateTarget(); }, [step, updateTarget]);
  useEffect(() => { window.addEventListener("resize", updateTarget); return () => window.removeEventListener("resize", updateTarget); }, [updateTarget]);

  const next = () => { if (isLast) { finish(); } else { setStep(s => s + 1); } };
  const prev = () => { if (!isFirst) setStep(s => s - 1); };
  const finish = () => { setVisible(false); localStorage.setItem("gtm_tour_done", "1"); if (onComplete) onComplete(); };
  const skip = () => { finish(); };

  if (!visible) return null;

  // Calculate tooltip position
  let tooltipStyle = {};
  if (currentStep.position === "center" || !targetRect) {
    tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (currentStep.position === "right") {
    tooltipStyle = { top: Math.max(20, targetRect.top - 10), left: targetRect.left + targetRect.width + 16 };
  } else if (currentStep.position === "bottom") {
    tooltipStyle = { top: targetRect.top + targetRect.height + 16, left: targetRect.left };
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
      {/* Overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", transition: "opacity 0.3s" }} onClick={skip} />

      {/* Spotlight cutout */}
      {targetRect && (
        <div style={{
          position: "absolute",
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          borderRadius: 8,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          border: "2px solid #00E5FF",
          background: "transparent",
          zIndex: 10001,
          transition: "all 0.3s ease",
          pointerEvents: "none",
        }}>
          {/* Pulse animation */}
          <div style={{
            position: "absolute", inset: -8, borderRadius: 12, border: "2px solid #00E5FF",
            opacity: 0.4, animation: "tour-pulse 2s infinite",
          }} />
        </div>
      )}

      {/* Tooltip card */}
      <div style={{
        position: "fixed", ...tooltipStyle,
        background: "#FFF", borderRadius: 16, padding: 0, width: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)",
        zIndex: 10002, overflow: "hidden",
        animation: "tour-fadein 0.3s ease",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: "#E8E4DC" }}>
          <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg, #1B4332, #00E5FF)", transition: "width 0.4s ease", borderRadius: 3 }} />
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}>{currentStep.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1B4332" }}>{currentStep.title}</div>
              <div style={{ fontSize: 10, color: "#AAA" }}>Step {step + 1} of {TOUR_STEPS.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "#444" }}>{currentStep.content}</div>
        </div>

        {/* Actions */}
        <div style={{ padding: "12px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFAF8", borderTop: "1px solid #F0EDE6" }}>
          <button onClick={skip} style={{ background: "none", border: "none", fontSize: 12, color: "#AAA", cursor: "pointer" }}>Skip tour</button>
          <div style={{ display: "flex", gap: 8 }}>
            {!isFirst && <button onClick={prev} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #D5D0C6", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#FFF", color: "#666" }}>Back</button>}
            <button onClick={next} style={{ padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#1B4332", color: "#FFF" }}>{isLast ? "Start Trading!" : "Next"}</button>
          </div>
        </div>
      </div>

      {/* Step dots */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10002 }}>
        {TOUR_STEPS.map((_, i) => (
          <div key={i} onClick={() => setStep(i)} style={{
            width: i === step ? 20 : 8, height: 8, borderRadius: 4,
            background: i === step ? "#00E5FF" : i < step ? "#1B4332" : "rgba(255,255,255,0.3)",
            cursor: "pointer", transition: "all 0.3s",
          }} />
        ))}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes tour-pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:0; transform:scale(1.1); } }
        @keyframes tour-fadein { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
