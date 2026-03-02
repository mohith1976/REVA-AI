'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";

const PRIORITY_COLORS = { EMERGENCY: "#ff3b30", HIGH: "#f87171", MODERATE: "#fbbf24", INFORMATIONAL: "#34d399" };
const STATUS_COLORS = { FILED: "#60a5fa", UNDER_REVIEW: "#fbbf24", ASSIGNED: "#a78bfa", IN_PROGRESS: "#34d399", ESCALATED: "#f87171", RESOLVED: "#10b981", CLOSED: "#94a3b8" };

export default function AnalyticsPage() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    api.get("/api/analytics/overview")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.push("/police/dashboard")}
            className="text-[13px] font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-1.5 rounded-lg transition-colors mb-4 flex items-center gap-1.5 -ml-2">
            ← Back
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">Analytics Dashboard</h2>
          <p className="text-sm text-neutral-500">{policeUser?.station?.stationName} — Last 30 days</p>
        </div>

        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-3xl bg-neutral-200/50 animate-shimmer bg-[length:200%_100%]" />)}
          </div>
        ) : data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Priority */}
            <div className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-6 sm:p-8">
              <h4 className="font-bold text-neutral-900 text-lg mb-6">Complaints by Priority</h4>
              <div className="grid gap-3">
                {Object.entries(data.byPriority || {}).map(([priority, count]) => {
                  const max = Math.max(...Object.values(data.byPriority || {}));
                  const pct = (count / max) * 100;
                  return (
                    <div key={priority}>
                      <div className="flex justify-between text-[13px] font-bold mb-2">
                        <span style={{ color: PRIORITY_COLORS[priority] || "#94a3b8" }}>{priority}</span>
                        <span className="text-neutral-900">{count}</span>
                      </div>
                      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: PRIORITY_COLORS[priority] || "#94a3b8" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Status */}
            <div className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-6 sm:p-8 lg:col-span-2">
              <h4 className="font-bold text-neutral-900 text-lg mb-6">Complaints by Status</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(data.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="px-4 py-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-center hover:shadow-md transition-shadow">
                    <div className="text-2xl font-black" style={{ color: STATUS_COLORS[status] || "#94a3b8" }}>{count}</div>
                    <div className="text-[10px] font-bold text-neutral-500 mt-1.5 uppercase tracking-widest leading-tight">{status.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Incident Types */}
            {data.topIncidentTypes?.length > 0 && (
              <div className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-6 sm:p-8">
                <h4 className="font-bold text-neutral-900 text-lg mb-6">Top Incident Types</h4>
                <div className="grid gap-3">
                  {data.topIncidentTypes.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                      <div className="w-6 text-[11px] font-bold text-neutral-400 flex-shrink-0">#{i + 1}</div>
                      <div className="flex-1 text-[14px] font-medium text-neutral-800">{item.type}</div>
                      <div className="text-[15px] font-black text-neutral-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend chart */}
            {data.recentTrend?.length > 0 && (
              <div className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-6 sm:p-8">
                <h4 className="font-bold text-neutral-900 text-lg mb-6">Recent Trend (30 days)</h4>
                <div className="flex items-end gap-1.5 h-32 mt-4">
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
                  <span className="font-bold uppercase tracking-widest">{data.recentTrend[0]?.date}</span>
                  <span className="font-bold uppercase tracking-widest">{data.recentTrend[data.recentTrend.length - 1]?.date}</span>
                </div>
              </div>
            )}

            <div className="lg:col-span-2 text-center py-6 text-sm text-neutral-400 bg-white border border-neutral-200/60 shadow-sm rounded-3xl">
              Total Complaints Processed: <strong className="text-neutral-900 font-black text-lg ml-2">{data.totalComplaints}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
