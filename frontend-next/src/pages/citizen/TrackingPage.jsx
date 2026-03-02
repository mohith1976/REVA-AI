'use client';
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Shield, Search, ChevronDown, User } from "lucide-react";

const STATUS_STAGE_MAP = {
  FILED: 0, UNDER_REVIEW: 1, ASSIGNED: 2, IN_PROGRESS: 3,
  ESCALATED: 4, RESOLVED: 4, CLOSED: 4, REJECTED: -1,
};

const STAGES = ["Submitted", "Under Review", "Forwarded", "Action Initiated"];

function ProgressTracker({ status }) {
  const activeIdx = STATUS_STAGE_MAP[status] ?? 0;
  const isRejected = status === "REJECTED";
  const allDone = activeIdx === 4;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 mb-4">
      <div className="text-[10px] sm:text-[0.68rem] font-bold tracking-[2px] uppercase text-slate-500 mb-4 sm:mb-6">
        Complaint Status
      </div>

      {isRejected ? (
        <div className="text-center py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-semibold text-sm">
          Complaint Rejected
        </div>
      ) : (
        <div className="flex items-start justify-between gap-1">
          {STAGES.map((label, i) => {
            const isCompleted = i < activeIdx || allDone;
            const isActive = i === activeIdx && !allDone;
            return (
              <div key={i} className="flex-1 flex flex-col items-center relative min-w-0">
                {/* Connector line */}
                {i > 0 && (
                  <div
                    className="absolute top-3 sm:top-4 -left-1/2 w-full h-px z-0 transition-all duration-500 bg-neutral-100"
                    style={{ background: isCompleted ? "#171717" : "#f5f5f5" }}
                  />
                )}
                {/* Node */}
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center z-10 text-[10px] sm:text-[12px] font-bold transition-all duration-500"
                  style={
                    isCompleted
                      ? { background: "#171717", color: "#fff" }
                      : isActive
                        ? { background: "#fff", border: "2px solid #171717", color: "#171717" }
                        : { background: "#fff", border: "1px solid #e5e5e5", color: "#a3a3a3" }
                  }
                >
                  {isCompleted ? "✓" : i + 1}
                </div>
                {/* Label */}
                <div
                  className={`mt-2 text-[9px] sm:text-[0.68rem] text-center leading-tight px-0.5 transition-colors duration-500 truncate w-full ${isActive || isCompleted ? "font-semibold text-neutral-900" : "text-neutral-400"}`}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-2.5 border-b border-slate-200 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-500">{value || "—"}</span>
    </div>
  );
}

export default function TrackingPage() {
  const params = useParams();
  const paramId = params?.trackingId;
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user;
  const [trackingId, setTrackingId] = useState(paramId || "");
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(!!paramId);
  const { t } = useTranslation();

  useState(() => { if (paramId) fetchComplaint(paramId); });

  async function fetchComplaint(id) {
    setLoading(true);
    try {
      const res = await api.get(`/api/complaints/track/${id}`);
      setComplaint(res.data);
    } catch { toast.error("Complaint not found. Check your tracking ID."); setComplaint(null); }
    finally { setLoading(false); }
  }

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
            <Link href="/track" className="px-3 py-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">
              Track Complaint
            </Link>
            {user && (
              <>
                <Link href="/my-complaints" className="px-3 py-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">
                  My Cases
                </Link>
                <Link href="/complaint" className="px-3 py-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">
                  New Complaint
                </Link>
              </>
            )}

            {user ? (
              <Link href="/profile" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-50 transition-colors">
                <User size={18} className="text-neutral-600" />
              </Link>
            ) : (
              <Link href="/login" className="px-4 py-2 bg-neutral-900 text-white text-[13px] font-bold rounded-full hover:bg-neutral-800 transition-all">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto py-12 sm:py-16 px-4 sm:px-6">
        {/* Fixed Back Button */}
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 sm:top-[88px] sm:left-8 z-[60] flex items-center gap-1.5 bg-white/85 backdrop-blur-md border border-neutral-200 rounded-[10px] px-2.5 py-1 sm:px-3.5 sm:py-[7px] text-[12px] sm:text-[13px] font-semibold text-neutral-600 cursor-pointer shadow-sm"
        >
          <ArrowLeft size={14} /> <span className="hidden xs:inline">Back</span>
        </button>

        {/* Header */}
        <div className="mb-8 sm:mb-10 text-center sm:text-left mt-12 sm:mt-0">
          <p className="text-[10px] sm:text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-2">Public Portal</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Track Complaint</h1>
          <p className="text-[13px] sm:text-sm text-slate-500">Enter your tracking ID to check the status</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-8 sm:mb-10">
          <input
            id="tracking-input"
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && fetchComplaint(trackingId)}
            placeholder="REVA-2024-XXXXXXXX"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-neutral-900 font-mono text-sm placeholder:text-slate-400 outline-none focus:border-neutral-900 transition-colors"
          />
          <button
            id="track-btn"
            onClick={() => fetchComplaint(trackingId)}
            disabled={loading || !trackingId}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white font-bold text-sm rounded-xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={15} strokeWidth={2.5} />
            {loading ? "Tracking…" : "Track"}
          </button>
        </div>

        {/* Results */}
        {complaint && (
          <div className="space-y-4 animate-fade-in">
            <ProgressTracker status={complaint.status} />

            {/* Detail card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <div className="font-mono font-bold text-slate-500 text-xs tracking-widest mb-1">{complaint.trackingId}</div>
                  <div className="font-bold text-slate-900 text-lg">{complaint.incidentType || "General"}</div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">
                  {complaint.status?.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-0">
                <Row label="Filed On" value={new Date(complaint.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
                <Row label="Station" value={complaint.station?.stationName} />
                <Row label="District" value={complaint.station?.district} />
                <Row label="Priority" value={complaint.priorityLevel} />
                {complaint.locationAddress && <Row label="Location" value={complaint.locationAddress} />}
                <Row label="Last Updated" value={new Date(complaint.updatedAt).toLocaleString("en-IN")} />
              </div>
            </div>

            {/* Activity timeline */}
            {complaint.updates?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h4 className="text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-5">Activity Timeline</h4>
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-0 bottom-0 w-px bg-slate-100" />
                  {complaint.updates.map((update, i) => (
                    <div key={i} className="mb-4 relative">
                      <div className="absolute -left-[17px] w-2 h-2 rounded-full bg-slate-100 top-1.5" />
                      <div className="text-[0.68rem] text-slate-500 mb-1">{new Date(update.createdAt).toLocaleString("en-IN")}</div>
                      <div className="text-sm text-slate-500">{update.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
