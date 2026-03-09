/**
 * SHARED STYLES & CONSTANTS
 * 
 * Central style definitions and status color mappings used across
 * all Trader and Forwarder screens. Import this in any component
 * that needs consistent styling.
 * 
 * Usage:
 *   import { S, statusColor } from '@/components/shared/styles'
 */

export const S = {
  page: { fontFamily: "'Segoe UI', -apple-system, sans-serif", background: "#F8F7F4", minHeight: "100vh", color: "#1A1A1A" },
  sidebar: { width: 220, background: "#1B4332", color: "#FFF", position: "fixed", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", zIndex: 10 },
  main: { marginLeft: 220, padding: "24px 32px" },
  card: { background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 20, marginBottom: 16 },
  badge: (color) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + "18", color }),
  input: { width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#FAFAF8" },
  select: { width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", background: "#FAFAF8" },
  btn: (primary) => ({ padding: "8px 20px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: primary ? "#1B4332" : "#E8E4DC", color: primary ? "#FFF" : "#1A1A1A" }),
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#888", borderBottom: "2px solid #E8E4DC" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #F0EDE6" },
  label: { fontSize: 11, color: "#888", display: "block", marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1B4332", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" },
};

export const statusColor = {
  draft: "#888",
  submitted: "#D4A017",
  approved: "#1B7A43",
  rejected: "#C62828",
  quoted: "#1565C0",
  booked: "#6A1B9A",
  in_transit: "#E65100",
  delivered: "#1B7A43",
};
