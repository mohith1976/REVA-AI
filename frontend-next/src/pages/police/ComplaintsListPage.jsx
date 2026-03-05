'use client';
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { LayoutDashboard, Folder, Map, BarChart2, Users, Link2, Building, Search, Shield, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRIORITY_COLORS = {
  EMERGENCY: "#dc2626", HIGH: "#ef4444", MODERATE: "#f59e0b", INFORMATIONAL: "#10b981",
};
const STATUS_COLORS = {
  FILED: "#0f172a", UNDER_REVIEW: "#737373", ASSIGNED: "#404040",
  IN_PROGRESS: "#09090b", ESCALATED: "#ef4444", RESOLVED: "#10b981", CLOSED: "#a3a3a3",
};

const INPUT_CLASS = "w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 transition-all";

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

export default function ComplaintsListPage() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const logoutPolice = auth?.logoutPolice;
  const router = useRouter();
  const pathname = usePathname();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => { fetchComplaints(); }, [page, filters.status, filters.priority]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, status: filters.status, priority: filters.priority, search: filters.search });
      const res = await api.get(`/api/police/complaints?${params}`);
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
    { to: "/police/officers", icon: Users, label: "Officers" },
    { to: "/police/linked-complaints", icon: Link2, label: "Joint Complaints" },
    ...(policeUser?.role === "GLOBAL_ADMIN" ? [{ to: "/police/stations", icon: Building, label: "Stations" }] : []),
  ];

  const ThCell = ({ children }) => (
    <th className="px-4 py-4 text-[0.7rem] font-semibold uppercase text-slate-400 text-left">{children}</th>
  );

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[60] p-6 shadow-2xl lg:hidden flex flex-col"
            >
              <SidebarContent onClose={() => setIsSidebarOpen(false)} policeUser={policeUser} logoutPolice={logoutPolice} pathname={pathname} containerVariants={containerVariants} itemVariants={itemVariants} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto">
        {/* Mobile Header Row */}
        <div className="lg:hidden flex items-center justify-between p-4 sm:p-6 bg-white border-b border-neutral-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Branding Removed */}
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -mr-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8 mt-4 lg:mt-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">Case Management</h2>
              <p className="text-sm text-neutral-500">Manage all registered complaints and legal proceedings.</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex items-baseline gap-2 sm:block">
                <div className="text-3xl font-extrabold text-neutral-900">{total}</div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest sm:mt-0.5">Total Records</div>
              </div>
            </div>
          </header>

          {/* Filters */}
          <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_140px] gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-4 top-3.5 text-neutral-400" size={18} />
                <input type="text" placeholder="Search Tracking ID, Type..."
                  className={`${INPUT_CLASS} pl-12 font-medium w-full`}
                  value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <select className={`${INPUT_CLASS} font-medium`} value={filters.status}
                onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                <option value="">Status</option>
                {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <select className={`${INPUT_CLASS} font-medium`} value={filters.priority}
                onChange={e => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }}>
                <option value="">Priority</option>
                {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="submit" className="px-5 py-3 bg-neutral-900 text-white font-bold text-[13px] rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-black/5 whitespace-nowrap sm:col-span-2 lg:col-span-1 border-none cursor-pointer">
                Refine Search
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="bg-white border border-neutral-200/60 rounded-[20px] shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase text-left">CASE ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase text-left">INCIDENT</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase text-left">PRIORITY</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase text-left">STATUS</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase text-left">FILED DATE</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 tracking-widest uppercase text-left">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="py-24 text-center text-neutral-400 font-medium text-[13px]">Loading records...</td></tr>
                  ) : complaints.length > 0 ? (
                    complaints.map(c => (
                      <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-mono font-bold text-neutral-900 text-[13px]">{c.trackingId}</div>
                          {c.isEmergency && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider block mt-1 px-1.5 py-0.5 bg-red-50 rounded inline-block">EMERGENCY</span>}
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-neutral-900 text-[14px]">{c.incidentType || "General"}</div>
                          <div className="text-[12px] text-neutral-400 font-medium truncate max-w-[200px] mt-1">{c.locationAddress}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight uppercase border ${c.priorityLevel === "EMERGENCY" ? "bg-red-50 text-red-600 border-red-100" :
                            c.priorityLevel === "HIGH" ? "bg-orange-50 text-orange-600 border-orange-100" :
                              "bg-neutral-50 text-neutral-500 border-neutral-200/60"
                            }`}>
                            {c.priorityLevel}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[c.status] }} />
                            <span className="text-[13px] text-neutral-600 font-semibold">{c.status.replace("_", " ")}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[13px] text-neutral-400 font-medium whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5">
                          <Link href={`/police/complaints/${c.id}`}
                            className="text-[12px] font-bold text-white bg-neutral-900 px-5 py-2.5 rounded-xl hover:bg-neutral-800 transition-all no-underline whitespace-nowrap shadow-sm">
                            Case File
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="py-24 text-center text-neutral-400 font-medium">No records found matching filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 15 && (
            <div className="mt-2 mb-8 flex flex-wrap justify-between items-center gap-4 bg-white border border-neutral-200/60 rounded-2xl p-3 sm:p-4 shadow-sm">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}
                className="text-[13px] font-bold text-neutral-600 hover:text-neutral-900 px-4 py-2 sm:px-5 sm:py-2.5 hover:bg-neutral-100 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all border border-neutral-200/60 flex-1 sm:flex-none text-center">
                Previous
              </button>
              <span className="text-[13px] font-bold text-neutral-500 w-full sm:w-auto text-center order-first sm:order-none">Page {page} of {Math.ceil(total / 15)}</span>
              <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 15)}
                className="text-[13px] font-bold text-neutral-600 hover:text-neutral-900 px-4 py-2 sm:px-5 sm:py-2.5 hover:bg-neutral-100 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all border border-neutral-200/60 flex-1 sm:flex-none text-center">
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );

}

function SidebarContent({ onClose, isCollapsed, setIsCollapsed, policeUser, logoutPolice, pathname, containerVariants, itemVariants }) {
  const navItems = [
    { to: "/police/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/police/complaints", icon: Folder, label: "All Cases" },
    { to: "/police/map", icon: Map, label: "Crime Map" },
    { to: "/police/officers", icon: Users, label: "Officers" },
    { to: "/police/linked-complaints", icon: Link2, label: "Joint Complaints" },
    ...(policeUser?.role === "GLOBAL_ADMIN" ? [{ to: "/police/stations", icon: Building, label: "Stations" }] : []),
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-10 px-2 lg:block relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/10">
            <Shield size={18} color="white" />
          </div>
        </div>

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
              <div className="text-[13px] font-bold text-neutral-900 truncate">{policeUser?.name}</div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">{policeUser?.role?.replace("_", " ")}</div>
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
