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
    <div className="bg-white border border-slate-200 rounded-2xl p-7 mb-4">
      <div className="text-[0.68rem] font-bold tracking-[2px] uppercase text-slate-500 mb-6">
        Complaint Status
      </div>

      {isRejected ? (
        <div className="text-center py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-semibold text-sm">
          Complaint Rejected
        </div>
      ) : (
        <div className="flex items-start justify-between">
          {STAGES.map((label, i) => {
            const isCompleted = i < activeIdx || allDone;
            const isActive = i === activeIdx && !allDone;
            return (
              <div key={i} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {i > 0 && (
                  <div
                    className="absolute top-4 -left-1/2 w-full h-px z-0 transition-all duration-500"
                    style={{ background: isCompleted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)" }}
                  />
                )}
                {/* Node */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center z-10 text-[12px] font-bold transition-all duration-500"
                  style={
                    isCompleted
                      ? { background: "rgba(255,255,255,0.9)", color: "#000" }
                      : isActive
                        ? { background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.5)", color: "#fff" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }
                  }
                >
                  {isCompleted ? "✓" : i + 1}
                </div>
                {/* Label */}
                <div
                  className="mt-2.5 text-[0.68rem] text-center leading-tight px-1 transition-colors duration-500"
                  style={{
                    fontWeight: isActive || isCompleted ? 600 : 400,
                    color: isCompleted ? "rgba(255,255,255,0.7)" : isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                  }}
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
      <nav className="sticky top-0 z-50 bg-slate-50/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-wide text-slate-900">REVA AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                Complaints <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>

              <div className="absolute top-full mt-1 -right-4 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl overflow-hidden py-1.5 z-50">
                <Link href="/track" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  {t("nav.track") || "Track Complaint"}
                </Link>
                {user && (
                  <>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <Link href="/my-complaints" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      {t("nav.myCases") || "My Cases"}
                    </Link>
                    <Link href="/complaint" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      {t("nav.fileComplaint") || "File a Complaint"}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {user ? (
              <Link href="/profile" className="px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                <User size={16} strokeWidth={2.5} />
              </Link>
            ) : (
              <Link href="/login" className="px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100 no-underline">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto py-16 px-6">
        {/* Fixed Back Button */}
        <button
          onClick={() => router.back()}
          className="fixed top-22 left-8 z-40 flex items-center gap-2 px-4 py-2  backdrop-blur-md  text-sm font-semibold text-neutral-600 hover:text-neutral-900  rounded-lg  transition-all duration-300"
        >
          <ArrowLeft size={16} />Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <p className="text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-2">Public</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Track Complaint</h1>
          <p className="text-sm text-slate-500">Enter your tracking ID to check the status of your complaint</p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-10">
          <input
            id="tracking-input"
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && fetchComplaint(trackingId)}
            placeholder="REVA-2024-XXXXXXXX"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-sm placeholder:text-slate-500 outline-none focus:border-slate-200 focus:bg-white transition-colors"
          />
          <button
            id="track-btn"
            onClick={() => fetchComplaint(trackingId)}
            disabled={loading || !trackingId}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={15} strokeWidth={2.5} />
            {loading ? "..." : "Track"}
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
