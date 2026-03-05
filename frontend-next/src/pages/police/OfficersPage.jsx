"use client";
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

const INPUT =
  "w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-[13px] font-medium placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 transition-all";

export default function OfficersPage() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const router = useRouter();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OFFICER",
  });
  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");

  const queryParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const targetStationId = queryParams.get("stationId") || policeUser?.stationId;

  useEffect(() => {
    if (
      !["GLOBAL_ADMIN", "STATION_ADMIN", "SUPER_ADMIN"].includes(
        policeUser?.role,
      )
    ) {
      router.push("/police/dashboard");
      return;
    }
    fetchOfficers();
  }, [roleFilter]);

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetStationId) params.append("stationId", targetStationId);
      if (roleFilter) params.append("role", roleFilter);

      const url = `/api/police/officers?${params.toString()}`;
      const res = await api.get(url);
      setOfficers(res.data.officers);
    } catch {
      toast.error("Failed to load officers");
    } finally {
      setLoading(false);
    }
  };

  const addOfficer = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("All fields required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/police/auth/register", {
        ...form,
        stationId: targetStationId,
      });
      toast.success("Officer registered successfully");
      setShowAddForm(false);
      setForm({ name: "", email: "", password: "", role: "OFFICER" });
      fetchOfficers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push("/police/dashboard")}
              className="text-[13px] font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-1.5 rounded-lg transition-colors mb-4 flex items-center gap-1.5 -ml-2"
            >
              ← Back
            </button>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
              Station Officers
            </h2>
            <p className="text-sm text-neutral-500">
              {policeUser?.station?.stationName} — {officers.length} active
              personnel
            </p>
          </div>
          <button
            id="add-officer-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto px-5 py-3 bg-neutral-900 text-white font-bold text-[13px] rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 text-center"
          >
            {showAddForm ? "✕ Cancel" : "+ Add Officer"}
          </button>
        </div>

        {/* Add Officer Form */}
        {showAddForm && (
          <div className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-6 sm:p-8 mb-8 animate-fade-in">
            <h4 className="font-bold text-neutral-900 text-lg border-b border-neutral-100 pb-4 mb-6">
              Register New Officer
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className={INPUT}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Officer name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
                  Email
                </label>
                <input
                  type="email"
                  className={INPUT}
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="officer@police.gov.in"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
                  Password
                </label>
                <input
                  type="password"
                  className={INPUT}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
                  Role
                </label>
                <select
                  className={INPUT}
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="OFFICER">Officer</option>
                  {["GLOBAL_ADMIN", "SUPER_ADMIN", "STATION_ADMIN"].includes(
                    policeUser?.role,
                  ) && <option value="STATION_ADMIN">Station Admin</option>}
                  {policeUser?.role === "GLOBAL_ADMIN" && (
                    <>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="GLOBAL_ADMIN">Global Admin</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <button
              id="submit-officer-btn"
              onClick={addOfficer}
              disabled={submitting}
              className="w-full md:w-auto px-8 py-3.5 bg-neutral-900 text-white font-bold text-[13px] rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-lg shadow-black/10"
            >
              {submitting ? "Registering..." : "Register Officer →"}
            </button>
          </div>
        )}

        {/* Role Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: "All Roles", value: "" },
            { label: "Division Admin", value: "DIVISION_ADMIN" },
            { label: "Circle Admin", value: "CIRCLE_ADMIN" },
            { label: "Station Admin", value: "STATION_ADMIN" },
            { label: "Officers", value: "OFFICER" },
          ].map((role) => (
            <button
              key={role.value}
              onClick={() => setRoleFilter(role.value)}
              className={`px-4 py-2 text-[12px] font-bold rounded-xl border transition-all ${
                roleFilter === role.value
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                  : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-900 hover:text-neutral-900"
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-5 flex items-center gap-5"
              >
                <div className="w-12 h-12 rounded-[14px] bg-neutral-100 animate-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-neutral-100 animate-shimmer rounded-md" />
                  <div className="h-3 w-1/2 bg-neutral-100 animate-shimmer rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {officers.map((officer) => {
              const roleStyle =
                ROLE_COLORS[officer.role] || ROLE_COLORS.OFFICER;
              return (
                <div
                  key={officer.id}
                  className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:shadow-md transition-all group animate-fade-in"
                >
                  <div className="flex items-center gap-4 flex-1 w-full min-w-0">
                    <div className="w-12 h-12 rounded-[14px] bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <UserCheck size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900 text-[15px] truncate">
                        {officer.name}
                      </div>
                      <div className="text-[13px] font-medium text-neutral-500 truncate">
                        {officer.email}
                      </div>
                      {officer.station && (
                        <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-1 truncate">
                          {officer.station.stationName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border border-neutral-200/60 bg-neutral-50 text-neutral-600">
                      {officer.role.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[15px] font-bold text-neutral-900">
                          {officer._count?.assignedComplaints || 0}
                        </div>
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                          cases
                        </div>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${officer.isActive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-neutral-300"}`}
                      />
                    </div>
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
