'use client';
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { LayoutDashboard, Folder, Map, BarChart2, Users, Link2, Building } from "lucide-react";

const PRIORITY_COLORS = {
  EMERGENCY: "#ff3b30", HIGH: "#f87171", MODERATE: "#fbbf24", INFORMATIONAL: "#34d399",
};
const STATUS_COLORS = {
  FILED: "#60a5fa", UNDER_REVIEW: "#fbbf24", ASSIGNED: "#a78bfa",
  IN_PROGRESS: "#34d399", ESCALATED: "#f87171", RESOLVED: "#10b981", CLOSED: "#94a3b8",
};

const INPUT_CLASS = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";

export default function ComplaintsListPage() {
  const { policeUser, logoutPolice } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });

  const token = typeof window !== "undefined" ? localStorage.getItem("reva_police_token") : "";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchComplaints(); }, [page, filters.status, filters.priority]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, status: filters.status, priority: filters.priority, search: filters.search });
      const res = await api.get(`/api/police/complaints?${params}`, { headers });
      setComplaints(res.data.complaints);
      setTotal(res.data.pagination.total);
    } catch { toast.error("Failed to load complaints"); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchComplaints(); };

  const navItems = [
    { to: "/police/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/police/complaints", icon: Folder, label: "All Cases" },
    { to: "/police/map", icon: Map, label: "Crime Map" },
    { to: "/police/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/police/officers", icon: Users, label: "Officers" },
    { to: "/police/linked-complaints", icon: Link2, label: "Joint Complaints" },
    ...(policeUser?.role === "GLOBAL_ADMIN" ? [{ to: "/police/stations", icon: Building, label: "Stations" }] : []),
  ];

  const ThCell = ({ children }) => (
    <th className="px-4 py-4 text-[0.7rem] font-semibold uppercase text-slate-400 text-left">{children}</th>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen">
        <div className="pb-8 px-3">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <span className="text-blue-400">REVA</span>
            <span className="text-xs bg-gradient-to-r from-blue-600 to-violet-600 px-2 py-0.5 rounded uppercase font-bold">Police</span>
          </h1>
        </div>
        <nav className="flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link key={item.to} href={item.to}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl mb-1.5 text-[0.9rem] transition-all no-underline ${active ? "bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/20"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent"
                  }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-400 mb-0.5">Logged in as</div>
          <div className="text-sm font-semibold text-slate-800 mb-3">{policeUser?.name}</div>
          <button onClick={logoutPolice} className="w-full text-left text-sm text-red-400 hover:text-red-300 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors">
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Case Management</h2>
            <p className="text-slate-500">Manage all registered complaints and legal proceedings.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-blue-400">{total}</div>
            <div className="text-[0.7rem] text-slate-400 uppercase tracking-widest">Total Records</div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_120px] gap-4">
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-500 text-sm">🔍</span>
              <input type="text" placeholder="Search by Tracking ID, Incident Type..."
                className={`${INPUT_CLASS} pl-9`}
                value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </div>
            <select className={INPUT_CLASS} value={filters.status}
              onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <select className={INPUT_CLASS} value={filters.priority}
              onChange={e => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }}>
              <option value="">All Priorities</option>
              {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="submit" className="px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity">
              Search
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <ThCell>Case ID</ThCell>
                  <ThCell>Incident</ThCell>
                  <ThCell>Priority</ThCell>
                  <ThCell>Status</ThCell>
                  <ThCell>Date Filed</ThCell>
                  <ThCell>Action</ThCell>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="py-16 text-center text-slate-500 text-sm">Loading cases...</td></tr>
                ) : complaints.length > 0 ? (
                  complaints.map(c => (
                    <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-mono font-bold text-blue-400">{c.trackingId}</div>
                        {c.isEmergency && <span className="text-[0.65rem] text-red-400 font-extrabold">🚨 EMERGENCY</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{c.incidentType || "General"}</div>
                        <div className="text-xs text-slate-500">{c.locationAddress?.slice(0, 30)}…</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-xl text-[0.7rem] font-bold border"
                          style={{ background: `${PRIORITY_COLORS[c.priorityLevel]}20`, color: PRIORITY_COLORS[c.priorityLevel], borderColor: `${PRIORITY_COLORS[c.priorityLevel]}40` }}>
                          {c.priorityLevel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[c.status] }} />
                          <span className="text-sm text-slate-800">{c.status.replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Link href={`/police/complaints/${c.id}`}
                            className="text-xs font-bold text-slate-900 bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity no-underline">
                            Full Case File →
                          </Link>
                          <Link href={`/police/map?id=${c.id}`}
                            className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors no-underline">
                            📍
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="py-12 text-center text-slate-500">No complaints found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="mt-6 flex justify-center items-center gap-3">
            <button onClick={() => setPage(page - 1)} disabled={page === 1}
              className="text-sm text-slate-500 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 15)}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 15)}
              className="text-sm text-slate-500 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
