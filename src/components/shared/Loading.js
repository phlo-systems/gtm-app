/**
 * LOADING SPINNER
 * 
 * Simple centered loading indicator used during page/data loads.
 * 
 * Props:
 *   text - optional loading message (default: "Loading...")
 */
export default function Loading({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>&#8635;</div>
      {text || "Loading..."}
    </div>
  );
}
