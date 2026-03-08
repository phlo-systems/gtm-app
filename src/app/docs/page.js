'use client'
import { useState, useEffect } from "react";

const S = {
  page: { fontFamily: "'Segoe UI', -apple-system, sans-serif", background: "#F8F7F4", minHeight: "100vh", color: "#1A1A1A" },
  btn: (primary) => ({ padding: "6px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: primary ? "#1B4332" : "#E8E4DC", color: primary ? "#FFF" : "#1A1A1A" }),
  badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: color + "18", color }),
};

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```([\s\S]*?)```/g, '<pre style="background:#1A1A2E;color:#E0E0E0;padding:12px;border-radius:6px;font-size:12px;overflow:auto;margin:8px 0">$1</pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h4 style="font-size:15px;font-weight:700;color:#2D5741;margin:16px 0 6px">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="font-size:17px;font-weight:700;color:#1B4332;margin:20px 0 8px">$1</h3>')
    .replace(/^- \[x\] (.*$)/gm, '<div style="padding:2px 0;font-size:13px"><span style="color:#1B7A43;margin-right:6px">\u2705</span>$1</div>')
    .replace(/^- \[ \] (.*$)/gm, '<div style="padding:2px 0;font-size:13px"><span style="color:#D4A017;margin-right:6px">\u{1F7E1}</span>$1</div>')
    .replace(/^- (.*$)/gm, '<div style="padding:2px 0 2px 16px;font-size:13px;position:relative"><span style="position:absolute;left:4px;color:#888">\u2022</span>$1</div>')
    .replace(/\|(.*)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim().match(/^[-:]+$/))) return '';
      return '<div style="display:flex;border-bottom:1px solid #E8E4DC">' + cells.map(c => '<div style="flex:1;padding:4px 8px;font-size:12px">' + c.trim() + '</div>').join('') + '</div>';
    })
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function WikiDocs() {
  const [sections, setSections] = useState([]);
  const [defects, setDefects] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("wiki");
  const [defectForm, setDefectForm] = useState({ title: "", description: "", severity: "medium", screen: "", steps_to_reproduce: "" });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/wiki").then(r => r.json()).then(d => { if (Array.isArray(d)) setSections(d); }).catch(() => {});
    fetch("/api/defects").then(r => r.json()).then(d => { if (Array.isArray(d)) setDefects(d); }).catch(() => {});
    // Check if logged in
    import("@/lib/supabase-browser").then(({ createClient }) => {
      const sb = createClient();
      sb.auth.getUser().then(({ data }) => { if (data?.user) setUser(data.user); });
    }).catch(() => {});
  }, []);

  const startEdit = (section) => { setEditing(section.id); setEditTitle(section.title); setEditContent(section.content); };
  const cancelEdit = () => { setEditing(null); };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/wiki", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing, title: editTitle, content: editContent }) });
      if (res.ok) {
        const updated = await res.json();
        setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
        setEditing(null);
      } else { const err = await res.json(); alert(err.error || "Failed to save"); }
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const submitDefect = async () => {
    if (!defectForm.title) { alert("Title is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/defects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(defectForm) });
      if (res.ok) {
        const d = await res.json();
        setDefects(prev => [d, ...prev]);
        setDefectForm({ title: "", description: "", severity: "medium", screen: "", steps_to_reproduce: "" });
      } else { alert("Failed to submit"); }
    } catch (e) { alert("Error: " + e.message); }
    setSubmitting(false);
  };

  const updateDefectStatus = async (id, status) => {
    const res = await fetch("/api/defects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (res.ok) { const d = await res.json(); setDefects(prev => prev.map(x => x.id === d.id ? d : x)); }
  };

  const sevColor = { critical: "#C62828", high: "#E65100", medium: "#D4A017", low: "#2E7D32" };
  const statColor = { open: "#C62828", "in-progress": "#D4A017", resolved: "#2E7D32", "wont-fix": "#888" };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: "#1B4332", color: "#FFF", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>GTM \u2014 Requirements Wiki</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Living documentation \u2022 Edit sections \u2022 Report defects \u2022 Phlo Systems</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {user && <span style={{ fontSize: 11, opacity: 0.5 }}>{user.email}</span>}
          <a href="/dashboard" style={{ color: "#A5D6A7", fontSize: 12, textDecoration: "none" }}>App</a>
          <a href="/login" style={{ color: "#A5D6A7", fontSize: 12, textDecoration: "none" }}>{user ? "" : "Login to edit"}</a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#FFF", borderBottom: "2px solid #E8E4DC", padding: "0 32px", display: "flex", gap: 0 }}>
        {[{ k: "wiki", l: "Requirements Wiki" }, { k: "defects", l: "Defects & Changes (" + defects.filter(d => d.status === "open").length + ")" }].map(t => (
          <div key={t.k} onClick={() => setTab(t.k)} style={{ padding: "12px 20px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.k ? 700 : 400, color: tab === t.k ? "#1B4332" : "#888", borderBottom: tab === t.k ? "3px solid #1B4332" : "3px solid transparent" }}>{t.l}</div>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px" }}>

        {/* ── WIKI TAB ── */}
        {tab === "wiki" && (
          <div>
            {!user && <div style={{ padding: "12px 16px", background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>\u26A0 <a href="/login" style={{ color: "#1B4332", fontWeight: 700 }}>Login</a> to edit sections and report defects.</div>}

            {sections.map(section => (
              <div key={section.id} id={section.section_key} style={{ background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 20, marginBottom: 16 }}>
                {editing === section.id ? (
                  /* ── Edit Mode ── */
                  <div>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 16, fontWeight: 700, marginBottom: 8, outline: "none", boxSizing: "border-box" }} />
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={Math.max(10, editContent.split("\n").length + 2)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, fontFamily: "monospace", lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                      <button style={S.btn(false)} onClick={cancelEdit}>Cancel</button>
                      <button style={S.btn(true)} onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                    </div>
                    <div style={{ fontSize: 10, color: "#AAA", marginTop: 8 }}>Tip: Use **bold**, ### headings, - bullets, - [x] done items, - [ ] todo items, ```code blocks```, |table|cells|</div>
                  </div>
                ) : (
                  /* ── View Mode ── */
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1B4332", margin: 0 }}>{section.title}</h2>
                      {user && <button style={{ ...S.btn(false), padding: "4px 12px" }} onClick={() => startEdit(section)}>Edit</button>}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }} />
                    {section.updated_by && section.updated_by !== "system" && (
                      <div style={{ fontSize: 10, color: "#AAA", marginTop: 12, borderTop: "1px solid #F0EDE6", paddingTop: 8 }}>Last edited by {section.updated_by} \u2022 {section.updated_at ? new Date(section.updated_at).toLocaleDateString() : ""}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── DEFECTS TAB ── */}
        {tab === "defects" && (
          <div>
            {/* Report Form */}
            {user && (
              <div style={{ background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1B4332", marginBottom: 12 }}>Report Defect or Suggest Change</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Title *</label><input value={defectForm.title} onChange={e => setDefectForm({ ...defectForm, title: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }} placeholder="Brief summary" /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Severity</label><select value={defectForm.severity} onChange={e => setDefectForm({ ...defectForm, severity: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none" }}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low / Suggestion</option></select></div>
                    <div><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Screen</label><select value={defectForm.screen} onChange={e => setDefectForm({ ...defectForm, screen: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none" }}><option value="">General</option><option>Dashboard</option><option>Deal Sheet</option><option>Cost Matrix</option><option>Feasibility</option><option>Post-Calc</option><option>Login/Signup</option><option>PO/SO Excel</option><option>Freight</option><option>Customs</option></select></div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Description</label><textarea value={defectForm.description} onChange={e => setDefectForm({ ...defectForm, description: e.target.value })} rows={3} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="What's wrong or what should change?" /></div>
                <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Steps to Reproduce</label><textarea value={defectForm.steps_to_reproduce} onChange={e => setDefectForm({ ...defectForm, steps_to_reproduce: e.target.value })} rows={2} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D5D0C6", borderRadius: 6, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="1. Go to... 2. Click... 3. See error..." /></div>
                <button style={S.btn(true)} onClick={submitDefect} disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</button>
              </div>
            )}

            {!user && <div style={{ padding: "12px 16px", background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>\u26A0 <a href="/login" style={{ color: "#1B4332", fontWeight: 700 }}>Login</a> to report defects.</div>}

            {/* Defect List */}
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1B4332", marginBottom: 12 }}>All Items ({defects.length})</div>
            {defects.length === 0 ? (
              <div style={{ background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 32, textAlign: "center", color: "#AAA" }}>No defects or change requests yet.</div>
            ) : defects.map(d => (
              <div key={d.id} style={{ background: "#FFF", borderRadius: 8, border: "1px solid #E8E4DC", padding: 16, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <span style={S.badge(sevColor[d.severity] || "#888")}>{d.severity}</span>
                      <span style={S.badge(statColor[d.status] || "#888")}>{d.status}</span>
                      {d.screen && <span style={{ fontSize: 10, color: "#888" }}>{d.screen}</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.title}</div>
                    {d.description && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{d.description}</div>}
                    {d.steps_to_reproduce && <div style={{ fontSize: 11, color: "#888", marginTop: 4, fontStyle: "italic" }}>Steps: {d.steps_to_reproduce}</div>}
                    <div style={{ fontSize: 10, color: "#AAA", marginTop: 6 }}>By {d.reported_by} \u2022 {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}</div>
                  </div>
                  {user && d.status === "open" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ ...S.btn(false), padding: "3px 8px", fontSize: 10 }} onClick={() => updateDefectStatus(d.id, "in-progress")}>In Progress</button>
                      <button style={{ ...S.btn(false), padding: "3px 8px", fontSize: 10, color: "#2E7D32" }} onClick={() => updateDefectStatus(d.id, "resolved")}>Resolve</button>
                    </div>
                  )}
                  {user && d.status === "in-progress" && (
                    <button style={{ ...S.btn(false), padding: "3px 8px", fontSize: 10, color: "#2E7D32" }} onClick={() => updateDefectStatus(d.id, "resolved")}>Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
