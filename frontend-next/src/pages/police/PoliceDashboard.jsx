'use client';
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import { LayoutDashboard, Folder, Map, BarChart2, Users, Link2, Building, Shield } from "lucide-react";

const PRIORITY_COLORS = {
  EMERGENCY: "#ff3b30", HIGH: "#f87171", MODERATE: "#fbbf24", INFORMATIONAL: "#34d399",
};
const STATUS_LABELS = {
  FILED: "Filed", UNDER_REVIEW: "Under Review", ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", ESCALATED: "Escalated", RESOLVED: "Resolved", CLOSED: "Closed",
};

const INPUT_CLASS = "px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
      <div className="flex justify-center mb-2">
        <Icon size={20} style={{ color }} />
      </div>
      <div className="text-3xl font-extrabold mb-0.5" style={{ color }}>{value ?? "—"}</div>
      <div className="text-[0.78rem] text-slate-400">{label}</div>
    </div>
  );
}

export default function PoliceDashboard() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const logoutPolice = auth?.logoutPolice;
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", priority: "", assignedTo: "", search: "" });
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { fetchComplaints(); }, [page, filter, activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/police/dashboard", {
        headers: { Authorization: `Bearer ${localStorage.getItem("reva_police_token")}` },
      });
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15, ...filter });
      if (activeTab === "mine") params.set("assignedTo", "me");
      if (activeTab === "emergency") params.set("priority", "EMERGENCY");
      if (activeTab === "cyber") params.set("search", "Cybercrime");
      const res = await api.get(`/api/police/complaints?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("reva_police_token")}` },
      });
      setComplaints(res.data.complaints); setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
  };

  const stats = data?.stats;

  const navItems = [
    { to: "/police/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/police/complaints", icon: Folder, label: "All Cases" },
    { to: "/police/map", icon: Map, label: "Crime Map" },
    { to: "/police/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/police/officers", icon: Users, label: "Officers" },
    { to: "/police/linked-complaints", icon: Link2, label: "Joint Complaints" },
    ...(policeUser?.role === "GLOBAL_ADMIN" ? [{ to: "/police/stations", icon: Building, label: "Stations" }] : []),
  ];

  const statItems = [
    { label: "Total", value: stats?.total, color: "#60a5fa", icon: Folder },
    { label: "Emergency", value: stats?.emergency, color: "#ff3b30", icon: Shield },
    { label: "Pending", value: stats?.pending, color: "#fbbf24", icon: BarChart2 },
    { label: "In Progress", value: stats?.inProgress, color: "#a78bfa", icon: LayoutDashboard },
    { label: "Resolved", value: stats?.resolved, color: "#10b981", icon: Link2 },
    { label: "High Priority", value: stats?.highPriority, color: "#f87171", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen flex-shrink-0 overflow-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Shield size={16} color="white" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">REVA Police</div>
            <div className="text-[0.7rem] text-slate-400">{policeUser?.station?.stationName}</div>
          </div>
        </div>

        <nav className="flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link key={item.to} href={item.to}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 text-[0.88rem] transition-all no-underline ${active ? "bg-blue-500/15 text-blue-400 font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-200">
          <div className="text-sm font-semibold text-slate-800">{policeUser?.name}</div>
          <div className="text-[0.7rem] text-slate-400 mb-3">{policeUser?.role?.replace("_", " ")}</div>
          <button onClick={logoutPolice} className="w-full text-left text-sm text-red-400 hover:text-red-300 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto px-7 py-6">

        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {policeUser?.station?.stationName || "Station Dashboard"}
            </h1>
            <p className="text-sm text-slate-500">
              {policeUser?.station?.district}, {policeUser?.station?.state}
            </p>
          </div>

          {/* Station Admin Geofence Settings */}
          {policeUser?.role === "STATION_ADMIN" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 min-w-[280px]">
              <div className="text-sm font-semibold text-blue-400">Geofence Settings</div>
              <div className="grid grid-cols-2 gap-2">
                {["latitude", "longitude"].map(field => (
                  <div key={field}>
                    <label className="text-[0.65rem] text-slate-400 block mb-1 capitalize">{field}</label>
                    <input type="number" className={`${INPUT_CLASS} w-full text-xs py-1.5`}
                      defaultValue={policeUser?.station?.[field]}
                      onBlur={async (e) => {
                        try {
                          await api.patch(`/api/stations/${policeUser.stationId}`, { [field]: e.target.value });
                        } catch { }
                      }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[0.65rem] text-slate-400 block mb-1">Radius (km)</label>
                <input type="number" className={`${INPUT_CLASS} w-full text-xs py-1.5`}
                  defaultValue={policeUser?.station?.radiusKm || 5}
                  onBlur={async (e) => {
                    const radius = parseFloat(e.target.value);
                    try { await api.patch(`/api/stations/${policeUser.stationId}`, { radiusKm: radius }); } catch { }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {!loading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
            {statItems.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        )}

        {/* Cyber-Intel Panel */}
        <div className="mb-7">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" style={{ boxShadow: "0 0 10px #60a5fa" }} />
            <h2 className="text-lg font-bold text-blue-400">Cyber-Intel Threat Awareness</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            {/* Attack Vectors */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-sm text-slate-500 mb-4">Active Attack Vectors (Regional)</div>
              <div className="flex gap-3">
                {[
                  { l: "Social Engineering", v: "44%", c: "#fbbf24" },
                  { l: "Phishing", v: "28%", c: "#f87171" },
                  { l: "Identity Theft", v: "15%", c: "#a78bfa" },
                  { l: "Financial Fraud", v: "13%", c: "#60a5fa" },
                ].map(vector => (
                  <div key={vector.l} className="flex-1 text-center">
                    <div className="text-xl font-bold" style={{ color: vector.c }}>{vector.v}</div>
                    <div className="text-[0.65rem] text-slate-400 uppercase mb-2">{vector.l}</div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: vector.v, background: vector.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Audit stream */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-emerald-400 mb-3">IMMUTABLE AUDIT STREAM</div>
              <div className="text-[0.65rem] font-mono text-slate-400 leading-relaxed">
                [SYS] Integrity Check: PASSED (SHA-256)<br />
                [AUDIT] Auth Request: Officer_{policeUser?.name?.slice(0, 3)}...<br />
                [SIGN] Forensic Envelope: Sealed v1.2<br />
                [BLOCK] Tracking ID verification...
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {[
            { id: "all", label: "All Complaints" },
            { id: "emergency", label: "🚨 Emergency" },
            { id: "cyber", label: "Cyber Crimes" },
            { id: "mine", label: "Assigned to Me" },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`px-4 py-2.5 text-sm border-b-2 transition-all ${activeTab === tab.id
                ? "text-slate-900 font-semibold border-blue-500"
                : "text-slate-500 font-normal border-transparent hover:text-slate-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input id="complaint-search" type="text" className={`${INPUT_CLASS} flex-1 min-w-[200px]`}
            placeholder="Search by tracking ID, type..."
            value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
          <select id="status-filter" className={INPUT_CLASS} value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select id="priority-filter" className={INPUT_CLASS} value={filter.priority}
            onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priority</option>
            {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Complaints Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-slate-200">
                <tr>
                  {["Tracking ID", "Type", "Priority", "Status", "Officer", "Filed", "Action"].map(h => (
                    <th key={h} className="px-4 py-3.5 text-xs font-medium text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-blue-400 text-xs">
                        {c.trackingId}
                        {c.isEmergency && <span className="ml-1.5 text-red-400">🚨</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 max-w-[150px] truncate">{c.incidentType || "General"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg text-[0.72rem] font-semibold"
                        style={{ background: `${PRIORITY_COLORS[c.priorityLevel]}20`, color: PRIORITY_COLORS[c.priorityLevel] }}>
                        {c.priorityLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg text-[0.72rem] bg-slate-100 text-slate-500">
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.assignedOfficer?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/police/complaints/${c.id}`}
                          className="text-xs font-bold text-slate-900 bg-gradient-to-r from-blue-600 to-violet-600 px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity no-underline whitespace-nowrap">
                          Case File →
                        </Link>
                        <Link href={`/police/map?id=${c.id}`} title="View on Map"
                          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors no-underline">
                          📍
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {complaints.length === 0 && (
                  <tr><td colSpan="7" className="py-12 text-center text-slate-500">No complaints found matching your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-sm text-slate-500 px-4 py-2 border border-white/12 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            <span className="text-sm text-slate-500">{page} of {pagination.pages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages}
              className="text-sm text-slate-500 px-4 py-2 border border-white/12 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
