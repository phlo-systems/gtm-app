/**
 * TEAM MANAGEMENT SCREEN
 * 
 * Admin-only screen for managing team members:
 *   - View current team members with roles
 *   - Invite new members by email with role assignment
 *   - Change existing member roles
 *   - Cancel pending invitations
 * 
 * Uses /api/team (GET, POST, PUT, DELETE) with RBAC.
 * Only users with admin role can access invite/edit features.
 */
'use client'

import { useState, useEffect } from 'react';
import { S } from '@/components/shared/styles';

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access, can manage team and approve" },
  { value: "trader", label: "Trader", desc: "Create and edit deals" },
  { value: "forwarder", label: "Forwarder", desc: "Create and edit forwarding jobs" },
  { value: "finance", label: "Finance", desc: "View all, edit financials, approve" },
  { value: "approver", label: "Approver", desc: "View and approve/reject deals" },
  { value: "operations", label: "Operations", desc: "View and edit, no approvals" },
  { value: "viewer", label: "Viewer", desc: "Read-only access" },
];

const ROLE_COLORS = {
  admin: "#C62828", trader: "#1B7A43", forwarder: "#1565C0",
  finance: "#6A1B9A", approver: "#D4A017", operations: "#E65100", viewer: "#888",
};

export default function TeamScreen() {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "trader" });
  const [error, setError] = useState("");

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        setTenant(data.tenant);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const inviteMember = async () => {
    if (!inviteForm.email.trim()) { setError("Email is required"); return; }
    if (!inviteForm.email.includes("@")) { setError("Enter a valid email"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (res.ok) {
        await loadTeam();
        setInviteForm({ email: "", role: "trader" });
        setShowInvite(false);
      } else {
        setError(data.error || "Failed to send invite");
      }
    } catch (err) { setError("Error: " + err.message); }
    setSaving(false);
  };

  const changeRole = async (memberId, newRole) => {
    try {
      const res = await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });
      if (res.ok) await loadTeam();
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch (err) { alert("Error: " + err.message); }
  };

  const cancelInvite = async (invitationId) => {
    if (!confirm("Cancel this invitation?")) return;
    try {
      const res = await fetch(`/api/team?invitation_id=${invitationId}`, { method: "DELETE" });
      if (res.ok) await loadTeam();
    } catch (err) { alert("Error: " + err.message); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Loading team...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Team Management</h2>
          {tenant && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Organisation: {tenant.name}</div>}
        </div>
        <button style={S.btn(true)} onClick={() => setShowInvite(!showInvite)}>+ Invite Member</button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div style={{ ...S.card, border: "2px solid #1B4332", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Invite New Team Member</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={S.label}>Email Address *</label>
              <input style={{ ...S.input, background: "#FFF" }} type="email" value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="colleague@company.com" />
            </div>
            <div>
              <label style={S.label}>Role</label>
              <select style={S.select} value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                {ROLES.filter(r => r.value !== "admin").map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btn(false)} onClick={() => { setShowInvite(false); setError(""); }}>Cancel</button>
              <button style={S.btn(true)} onClick={inviteMember} disabled={saving}>{saving ? "Sending..." : "Send Invite"}</button>
            </div>
          </div>
          {error && <div style={{ color: "#C62828", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
            The invited user will need to sign up at the app with this email address to join your team.
          </div>
        </div>
      )}

      {/* Current Members */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Team Members ({members.length})
        </div>
        {members.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#888" }}>No team members found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Joined</th>
            </tr></thead>
            <tbody>{members.map(m => (
              <tr key={m.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{m.full_name || "\u2014"}</td>
                <td style={{ ...S.td, fontSize: 12 }}>{m.email}</td>
                <td style={S.td}>
                  <select style={{ ...S.select, width: "auto", padding: "4px 8px", fontSize: 12, color: ROLE_COLORS[m.role] || "#888", fontWeight: 600 }}
                    value={m.role} onChange={e => changeRole(m.id, e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td style={{ ...S.td, fontSize: 12, color: "#888" }}>{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Pending Invitations ({invitations.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Invited</th>
              <th style={S.th}>Actions</th>
            </tr></thead>
            <tbody>{invitations.map(inv => (
              <tr key={inv.id}>
                <td style={S.td}>{inv.email}</td>
                <td style={S.td}><span style={S.badge(ROLE_COLORS[inv.role] || "#888")}>{inv.role}</span></td>
                <td style={{ ...S.td, fontSize: 12, color: "#888" }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td style={S.td}>
                  <span onClick={() => cancelInvite(inv.id)} style={{ cursor: "pointer", color: "#C62828", fontWeight: 600, fontSize: 12 }}>Cancel</span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Role Reference */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Role Permissions Reference</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {ROLES.map(r => (
            <div key={r.value} style={{ padding: 10, background: "#FAFAF8", borderRadius: 6, border: "1px solid #E8E4DC" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[r.value] }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
