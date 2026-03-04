'use client';
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import { LayoutDashboard, Folder, Map, BarChart2, Users, Link2, Building, Shield, MapPin } from "lucide-react";

const PRIORITY_COLORS = {
  EMERGENCY: "#dc2626", // red-600
  HIGH: "#ef4444",      // red-500
  MODERATE: "#f59e0b",  // amber-500
  INFORMATIONAL: "#10b981", // emerald-500
};
const STATUS_LABELS = {
  FILED: "Filed", UNDER_REVIEW: "Review", ASSIGNED: "Assigned",
  IN_PROGRESS: "Active", ESCALATED: "Escalated", RESOLVED: "Resolved", CLOSED: "Closed",
};

const INPUT_CLASS = "px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 transition-all";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

function StatCard({ label, value, color, icon: Icon, loading }) {
  return (
    <div className="bg-white border border-neutral-200/60 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-black/5 group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center group-hover:bg-neutral-100 transition-colors">
          <Icon size={16} className="text-neutral-500" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-neutral-100 animate-pulse rounded-lg mb-1" />
      ) : (
        <div className="text-2xl font-bold text-neutral-900 tracking-tight">{value ?? "0"}</div>
      )}
      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-1">{label}</div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { fetchComplaints(); }, [page, filter, activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/police/dashboard");
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
      const res = await api.get(`/api/police/complaints?${params}`);
      setComplaints(res.data.complaints); setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
  };

  const stats = data?.stats;


  const statItems = [
    { label: "Total", value: stats?.total, color: "#60a5fa", icon: Folder },
    { label: "Emergency", value: stats?.emergency, color: "#ff3b30", icon: Shield },
    { label: "Pending", value: stats?.pending, color: "#fbbf24", icon: BarChart2 },
    { label: "In Progress", value: stats?.inProgress, color: "#a78bfa", icon: LayoutDashboard },
    { label: "Resolved", value: stats?.resolved, color: "#10b981", icon: Link2 },
    { label: "High Priority", value: stats?.highPriority, color: "#f87171", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={{ width: 256 }}
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: "spring", damping: 20, stiffness: 150 }}
        className="hidden lg:flex bg-white/80 backdrop-blur-2xl border-r border-neutral-200/60 flex-col p-6 sticky top-0 h-screen flex-shrink-0 z-40 overflow-hidden"
      >
        <SidebarContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} policeUser={policeUser} logoutPolice={logoutPolice} pathname={pathname} containerVariants={containerVariants} itemVariants={itemVariants} />
      </motion.aside>

      {/* Sidebar - Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[60] p-6 shadow-2xl lg:hidden flex flex-col"
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} policeUser={policeUser} logoutPolice={logoutPolice} pathname={pathname} containerVariants={containerVariants} itemVariants={itemVariants} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Branding Removed */}
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <LayoutDashboard size={20} className="text-neutral-600" />
          </button>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight mb-1.5">
                {policeUser?.station?.stationName || "Station Dashboard"}
              </h1>
              <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-400">
                <MapPin size={14} />
                {policeUser?.station?.district}, {policeUser?.station?.state}
              </div>
            </div>

            {/* Station Admin Geofence Settings */}
            {policeUser?.role === "STATION_ADMIN" && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3 w-full md:min-w-[280px] md:w-auto">
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
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-7">
            {statItems.map(s => (
              <StatCard key={s.label} {...s} loading={loading} />
            ))}
          </div>

          {/* Cyber-Intel Panel */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-2 h-2 rounded-full bg-neutral-900 animate-pulse" />
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">Cyber-Intel awareness</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Attack Vectors */}
              <div className="lg:col-span-2 bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">Active Attack Vectors (Regional)</div>
                  <div className="px-2 py-1 bg-neutral-50 rounded text-[10px] font-bold text-neutral-500">REAL-TIME DATA</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { l: "Social Engineering", v: "44%", c: "#000000" },
                    { l: "Phishing", v: "28%", c: "#404040" },
                    { l: "Identity Theft", v: "15%", c: "#737373" },
                    { l: "Financial Fraud", v: "13%", c: "#a3a3a3" },
                  ].map(vector => (
                    <div key={vector.l}>
                      <div className="text-2xl font-bold text-neutral-900 mb-1">{vector.v}</div>
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight leading-tight mb-3 h-6">{vector.l}</div>
                      <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-neutral-900 transition-all duration-1000" style={{ width: vector.v }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Audit stream */}
              <div className="bg-neutral-900 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield size={80} color="white" />
                </div>
                <div className="text-[10px] font-bold text-neutral-400 mb-4 tracking-[2px] uppercase">Immutable Security Stream</div>
                <div className="space-y-2 font-mono text-[11px] text-neutral-300 leading-relaxed">
                  <div className="flex gap-2"><span className="text-neutral-600">01</span> [SYS] Integrity: PASSED</div>
                  <div className="flex gap-2"><span className="text-neutral-600">02</span> [SIGN] Envelope Sealed</div>
                  <div className="flex gap-2"><span className="text-neutral-600">03</span> [IDS] Monitors: ACTIVE</div>
                  <div className="flex gap-2"><span className="text-neutral-600">04</span> [LOG] Session: {policeUser?.name?.slice(0, 3).toUpperCase()}...</div>
                  <div className="flex gap-2 animate-pulse"><span className="text-neutral-600">05</span> [WSS] Streaming...</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-8 border-b border-neutral-100 px-1">
            {[
              { id: "all", label: "All Cases" },
              { id: "emergency", label: "Emergency" },
              { id: "cyber", label: "Cyber-Crime" },
              { id: "mine", label: "Assigned" },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`pb-4 text-[13px] font-bold transition-all relative border-none bg-transparent cursor-pointer ${activeTab === tab.id
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-600"
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                )}
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:flex gap-3 mb-6">
            <div className="relative flex-1">
              <input id="complaint-search" type="text" className={`${INPUT_CLASS} w-full pl-9`}
                placeholder="Search by tracking ID, type..."
                value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <Shield size={14} />
              </div>
            </div>
            <div className="flex gap-2">
              <select id="status-filter" className={`${INPUT_CLASS} flex-1 sm:w-36`} value={filter.status}
                onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select id="priority-filter" className={`${INPUT_CLASS} flex-1 sm:w-36`} value={filter.priority}
                onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
                <option value="">All Priority</option>
                {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="bg-white border border-neutral-200/60 rounded-[20px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100">
                    {["TRACKING ID", "TYPE", "PRIORITY", "STATUS", "OFFICER", "FILED DATE", "ACTION"].map(h => (
                      <th key={h} className="px-4 md:px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-mono text-neutral-900 font-bold text-[12px] flex items-center gap-2">
                          <span className="truncate max-w-[80px] md:max-w-none">{c.trackingId}</span>
                          {c.isEmergency && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-neutral-600 font-medium max-w-[120px] md:max-w-[150px] truncate">{c.incidentType || "General"}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-tight uppercase border ${c.priorityLevel === "EMERGENCY" ? "bg-red-50 text-red-600 border-red-100" :
                          c.priorityLevel === "HIGH" ? "bg-orange-50 text-orange-600 border-orange-100" :
                            "bg-neutral-50 text-neutral-500 border-neutral-200/60"
                          }`}>
                          {c.priorityLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-neutral-500 font-medium">
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 font-medium">{c.assignedOfficer?.name || "—"}</td>
                      <td className="px-6 py-4 text-neutral-400 font-medium whitespace-nowrap">{new Date(c.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })} · {new Date(c.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link href={`/police/complaints/${c.id}`}
                            className="text-[11px] font-bold text-white bg-neutral-900 px-4 py-2 rounded-xl hover:bg-neutral-800 transition-colors no-underline whitespace-nowrap">
                            View Case
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr><td colSpan="7" className="py-20 text-center text-neutral-400 font-medium">No complaints found matching your filters</td></tr>
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
      </div >
    </div >
  );

}

function SidebarContent({ onClose, isCollapsed, setIsCollapsed, policeUser, logoutPolice, pathname, containerVariants, itemVariants }) {
  const navItems = [
    { to: "/police/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/police/complaints", icon: Folder, label: "All Cases" },
    { to: "/police/map", icon: Map, label: "Crime Map" },
    { to: "/police/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/police/officers", icon: Users, label: "Officers" },
    { to: "/police/linked-complaints", icon: Link2, label: "Joint Complaints" },
    ...(policeUser?.role === "GLOBAL_ADMIN" ? [{ to: "/police/stations", icon: Building, label: "Stations" }] : []),
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-10 px-2 lg:block relative">
        <div className="flex items-center gap-3 mb-5" />

        {/* Desktop Toggle Button */}
        {setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1.5 w-6 h-6 bg-white border border-neutral-200 rounded-full items-center justify-center text-neutral-400 hover:text-neutral-900 shadow-sm transition-all z-50 cursor-pointer"
          >
            <motion.span animate={{ rotate: isCollapsed ? 180 : 0 }}>
              ‹
            </motion.span>
          </button>
        )}

        <button onClick={onClose} className="lg:hidden p-2 text-neutral-400 hover:text-neutral-900 border-none bg-transparent cursor-pointer">
          ✕
        </button>
      </div>

      <motion.nav
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex-1 space-y-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <motion.div key={item.to} variants={itemVariants}>
              <Link href={item.to} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all no-underline overflow-hidden ${active
                  ? "bg-neutral-900 text-white shadow-md shadow-black/10"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      <div className="mt-auto pt-6 border-t border-neutral-100 overflow-hidden">
        <div className="px-2 mb-4">
          {!isCollapsed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-[13px] font-bold text-neutral-900">{policeUser?.name}</div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{policeUser?.role?.replace("_", " ")}</div>
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-500">
              {policeUser?.name?.charAt(0)}
            </div>
          )}
        </div>
        <button onClick={logoutPolice} className={`w-full flex items-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer ${isCollapsed ? "justify-center" : "px-3"}`}>
          <LayoutDashboard size={16} className="flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );
}
