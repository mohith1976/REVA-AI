'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { UserCheck } from "lucide-react";

const ROLE_COLORS = {
  SUPER_ADMIN: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
  STATION_ADMIN: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  OFFICER: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
};

const INPUT = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";

export default function OfficersPage() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const router = useRouter();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "OFFICER" });
  const [submitting, setSubmitting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("reva_police_token") : "";
  const headers = { Authorization: `Bearer ${token}` };

  const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const targetStationId = queryParams.get("stationId") || policeUser?.stationId;

  useEffect(() => {
    if (!["GLOBAL_ADMIN", "STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role)) {
      router.push("/police/dashboard"); return;
    }
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const url = targetStationId ? `/api/police/officers?stationId=${targetStationId}` : "/api/police/officers";
      const res = await api.get(url, { headers });
      setOfficers(res.data.officers);
    } catch { toast.error("Failed to load officers"); }
    finally { setLoading(false); }
  };

  const addOfficer = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("All fields required"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/police/auth/register", { ...form, stationId: targetStationId }, { headers });
      toast.success("Officer registered successfully");
      setShowAddForm(false);
      setForm({ name: "", email: "", password: "", role: "OFFICER" });
      fetchOfficers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to register"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-7">
          <div>
            <button onClick={() => router.push("/police/dashboard")}
              className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors mb-2 flex items-center gap-1">
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Station Officers</h2>
            <p className="text-sm text-slate-500">{policeUser?.station?.stationName} — {officers.length} officers</p>
          </div>
          <button id="add-officer-btn" onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity">
            {showAddForm ? "✕ Cancel" : "+ Add Officer"}
          </button>
        </div>

        {/* Add Officer Form */}
        {showAddForm && (
          <div className="bg-white border border-blue-500/20 rounded-2xl p-6 mb-5 animate-fade-in">
            <h4 className="font-bold text-slate-900 mb-5">Register New Officer</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Full Name</label>
                <input type="text" className={INPUT} value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Officer name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Email</label>
                <input type="email" className={INPUT} value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="officer@police.gov.in" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Password</label>
                <input type="password" className={INPUT} value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Role</label>
                <select className={INPUT} value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="OFFICER">Officer</option>
                  {["GLOBAL_ADMIN", "SUPER_ADMIN", "STATION_ADMIN"].includes(policeUser?.role) &&
                    <option value="STATION_ADMIN">Station Admin</option>}
                  {policeUser?.role === "GLOBAL_ADMIN" && <>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="GLOBAL_ADMIN">Global Admin</option>
                  </>}
                </select>
              </div>
            </div>
            <button id="submit-officer-btn" onClick={addOfficer} disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
              {submitting ? "Registering..." : "Register Officer"}
            </button>
          </div>
        )}

        {/* Officers list */}
        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-shimmer bg-[length:200%_100%]" />)}
          </div>
        ) : (
          <div className="grid gap-3">
            {officers.map((officer) => {
              const roleStyle = ROLE_COLORS[officer.role] || ROLE_COLORS.OFFICER;
              return (
                <div key={officer.id} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={18} color="white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{officer.name}</div>
                    <div className="text-sm text-slate-500">{officer.email}</div>
                    {officer.station && <div className="text-xs text-slate-400">{officer.station.stationName}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: roleStyle.bg, color: roleStyle.color }}>
                      {officer.role.replace("_", " ")}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-400">{officer._count?.assignedComplaints || 0}</div>
                      <div className="text-[0.7rem] text-slate-400">cases</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${officer.isActive ? "bg-emerald-500" : "bg-slate-600"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
