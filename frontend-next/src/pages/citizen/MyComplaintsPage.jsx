'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import Link from "next/link";
import { MapPin, FileText, ArrowLeft, LogOut, Shield, ChevronDown, User } from "lucide-react";

// Priority — monochrome style (white/opacity only, no colors)
const PRIORITY_STYLE = {
  EMERGENCY: "bg-slate-100 text-slate-900 border border-slate-200",
  HIGH: "bg-slate-100  text-slate-500 border border-slate-200",
  MODERATE: "bg-slate-100  text-slate-500 border border-slate-200",
  INFORMATIONAL: "bg-slate-100 text-slate-500 border border-slate-200",
};

export default function MyComplaintsPage() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user;
  const logoutCitizen = auth?.logoutCitizen;
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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-[64px]">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-8 h-8 bg-neutral-900 rounded-[10px] flex items-center justify-center transition-transform group-hover:scale-105">
              <Shield size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[17px] tracking-tight text-neutral-900">REVA AI</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg">
                <span className="hidden xs:inline">Complaints</span>
                <ChevronDown size={14} className="transition-transform duration-300 group-hover:rotate-180" />
              </button>

              <div className="absolute top-full mt-1 -right-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top scale-95 group-hover:scale-100 bg-white border border-neutral-100 shadow-2xl shadow-black/5 rounded-2xl overflow-hidden py-2 z-50">
                <Link href="/track" className="block px-4 py-2.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50">
                  Track Complaint
                </Link>
                {user && (
                  <>
                    <div className="h-px bg-neutral-50 my-1 mx-3" />
                    <Link href="/my-complaints" className="block px-4 py-2.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50">
                      My Cases
                    </Link>
                    <Link href="/complaint" className="block px-4 py-2.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50">
                      New Complaint
                    </Link>
                  </>
                )}
              </div>
            </div>

            <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-50 transition-colors">
              <User size={18} className="text-neutral-600" />
            </Link>
            <button onClick={logoutCitizen} className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-bold text-neutral-500 hover:text-red-500 rounded-lg transition-colors">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-12 sm:py-14 px-4 sm:px-6">
        {/* Fixed Back Button */}
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 sm:top-[88px] sm:left-8 z-[60] flex items-center gap-1.5 bg-white/85 backdrop-blur-md border border-neutral-200 rounded-[10px] px-2.5 py-1 sm:px-3.5 sm:py-[7px] text-[12px] sm:text-[13px] font-semibold text-neutral-600 cursor-pointer shadow-sm"
        >
          <ArrowLeft size={14} /> <span className="hidden xs:inline">Back</span>
        </button>

        {/* Header */}
        <div className="mb-8 sm:mb-10 text-center sm:text-left mt-12 sm:mt-0">
          <p className="text-[10px] sm:text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-2">My History</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Complaints</h1>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-500 text-[10px] sm:text-xs mb-1 tracking-widest">{c.trackingId}</div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base truncate">{c.incidentType || "General Complaint"}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {c.isEmergency && (
                        <span className="text-[9px] sm:text-[0.68rem] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">
                          Emergency
                        </span>
                      )}
                      <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLE[c.priorityLevel] || PRIORITY_STYLE.INFORMATIONAL}`}>
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
