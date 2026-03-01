'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import Link from "next/link";
import { MapPin, FileText, ArrowLeft, LogOut, Plus, Shield } from "lucide-react";

// Priority — monochrome style (white/opacity only, no colors)
const PRIORITY_STYLE = {
  EMERGENCY: "bg-slate-100 text-slate-900 border border-slate-200",
  HIGH: "bg-slate-100  text-slate-500 border border-slate-200",
  MODERATE: "bg-slate-100  text-slate-500 border border-slate-200",
  INFORMATIONAL: "bg-slate-100 text-slate-500 border border-slate-200",
};

export default function MyComplaintsPage() {
  const router = useRouter();
  const { user, logoutCitizen } = useAuth();
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchComplaints(); }, [page]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/complaints/my?page=${page}&limit=10`);
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-50/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-wide text-slate-900">REVA AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100 no-underline">Profile</Link>
            <Link href="/complaint" className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-black bg-white rounded-lg hover:bg-slate-100 transition-colors no-underline">
              <Plus size={14} strokeWidth={2.5} /> File Complaint
            </Link>
            <button onClick={logoutCitizen} className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-14 px-6">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-500 transition-colors mb-8">
          <ArrowLeft size={15} />Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <p className="text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-2">Your Cases</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Complaints</h1>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileText size={24} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-500 mb-2">No complaints yet</h3>
            <p className="text-sm text-slate-500 mb-7">File your first complaint to get started</p>
            <Link href="/complaint" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors no-underline">
              <Plus size={15} strokeWidth={2.5} /> File a Complaint
            </Link>
          </div>
        ) : (
          /* Complaint list */
          <div className="grid gap-3">
            {complaints.map((c) => (
              <Link key={c.trackingId} href={`/track/${c.trackingId}`} className="no-underline group">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:bg-white hover:border-slate-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-mono font-bold text-slate-500 text-xs mb-1 tracking-widest">{c.trackingId}</div>
                      <div className="font-semibold text-slate-900">{c.incidentType || "General Complaint"}</div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {c.isEmergency && (
                        <span className="text-[0.68rem] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 border border-slate-200 uppercase tracking-wide">
                          Emergency
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLE[c.priorityLevel] || PRIORITY_STYLE.INFORMATIONAL}`}>
                        {c.priorityLevel}
                      </span>
                    </div>
                  </div>
                  <p className="text-[0.82rem] text-slate-500 leading-relaxed mb-3 line-clamp-2">
                    {c.summaryText || "No summary available"}
                  </p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={11} />{c.station?.stationName}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-500">{page} / {pagination.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-5 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
