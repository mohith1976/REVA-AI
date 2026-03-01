'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";

const PRIORITY_COLORS = { EMERGENCY: "#ff3b30", HIGH: "#f87171", MODERATE: "#fbbf24", INFORMATIONAL: "#34d399" };
const STATUS_COLORS = { FILED: "#60a5fa", UNDER_REVIEW: "#fbbf24", ASSIGNED: "#a78bfa", IN_PROGRESS: "#34d399", ESCALATED: "#f87171", RESOLVED: "#10b981", CLOSED: "#94a3b8" };

export default function AnalyticsPage() {
  const { policeUser } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("reva_police_token") : "";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get("/api/analytics/overview", { headers })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-7">
          <button onClick={() => router.push("/police/dashboard")}
            className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors mb-2">
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-sm text-slate-500">{policeUser?.station?.stationName} — Last 30 days</p>
        </div>

        {loading ? (
          <div className="grid gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-shimmer bg-[length:200%_100%]" />)}
          </div>
        ) : data && (
          <div className="grid gap-5">
            {/* By Priority */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h4 className="font-bold text-slate-900 mb-5">Complaints by Priority</h4>
              <div className="grid gap-3">
                {Object.entries(data.byPriority || {}).map(([priority, count]) => {
                  const max = Math.max(...Object.values(data.byPriority || {}));
                  const pct = (count / max) * 100;
                  return (
                    <div key={priority}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span style={{ color: PRIORITY_COLORS[priority] || "#94a3b8" }}>{priority}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: PRIORITY_COLORS[priority] || "#94a3b8" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Status */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h4 className="font-bold text-slate-900 mb-5">Complaints by Status</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-center min-w-[120px]">
                    <div className="text-2xl font-bold" style={{ color: STATUS_COLORS[status] || "#94a3b8" }}>{count}</div>
                    <div className="text-xs text-slate-500 mt-1">{status.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Incident Types */}
            {data.topIncidentTypes?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="font-bold text-slate-900 mb-5">Top Incident Types</h4>
                <div className="grid gap-2">
                  {data.topIncidentTypes.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 text-xs text-slate-400 flex-shrink-0">#{i + 1}</div>
                      <div className="flex-1 text-sm text-slate-800">{item.type}</div>
                      <div className="text-sm font-semibold text-blue-400">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend chart */}
            {data.recentTrend?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="font-bold text-slate-900 mb-4">Recent Trend (30 days)</h4>
                <div className="flex items-end gap-1 h-20">
                  {data.recentTrend.map((d, i) => {
                    const max = Math.max(...data.recentTrend.map(t => t.count));
                    const h = max > 0 ? (d.count / max) * 100 : 0;
                    return (
                      <div key={i} title={`${d.date}: ${d.count}`} className="flex-1 rounded-t-sm transition-all duration-300 cursor-pointer opacity-80 hover:opacity-100"
                        style={{ height: `${Math.max(h, 4)}%`, minHeight: 4, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5 text-[0.72rem] text-slate-400">
                  <span>{data.recentTrend[0]?.date}</span>
                  <span>{data.recentTrend[data.recentTrend.length - 1]?.date}</span>
                </div>
              </div>
            )}

            <div className="text-center py-4 text-sm text-slate-400">
              Total Complaints: <strong className="text-slate-800">{data.totalComplaints}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
