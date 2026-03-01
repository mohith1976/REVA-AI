'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { Link2, Search } from "lucide-react";

const PRIORITY_COLORS = {
  EMERGENCY: "#ff3b30", HIGH: "#f87171", MODERATE: "#fbbf24", INFORMATIONAL: "#34d399",
};

const STATUS_LABELS = {
  FILED: "Filed", UNDER_REVIEW: "Under Review", ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress", ESCALATED: "Escalated", RESOLVED: "Resolved", CLOSED: "Closed",
};

export default function LinkedComplaintsPage() {
  const router = useRouter();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchLinkedComplaints(); }, []);

  const fetchLinkedComplaints = async () => {
    try {
      const res = await api.get("/api/evidence/linked-complaints", {
        headers: { Authorization: `Bearer ${localStorage.getItem("reva_police_token")}` },
      });
      setLinks(res.data.links || []);
    } catch (err) {
      toast.error("Failed to load linked complaints.");
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button onClick={() => router.push("/police/dashboard")}
          className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors mb-6">
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-7">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-2">
            <Link2 size={22} className="text-violet-400" /> Joint Complaint Intelligence
          </h1>
          <p className="text-sm text-slate-500">
            Complaints automatically linked by matching evidence (≥85% visual similarity). Confidential — not visible to citizens.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading linked complaints...</div>
        ) : links.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-500">
            <Search size={36} className="mx-auto mb-3 text-slate-400" />
            <p className="font-semibold text-slate-700 mb-2">No linked complaints yet</p>
            <p className="text-sm">When users upload visually similar evidence, complaints will be automatically linked here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {links.map((link) => {
              const isOpen = expanded === link.linkId;
              const sim = link.evidenceMatch ? Math.round(link.evidenceMatch.similarityScore * 100) : null;
              const isExact = link.evidenceMatch?.matchType === "EXACT";
              return (
                <div key={link.linkId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : link.linkId)}
                    className="w-full flex items-center gap-4 p-5 bg-transparent border-none cursor-pointer text-left"
                  >
                    {/* Match badge */}
                    <div className={`min-w-[64px] text-center px-2.5 py-1.5 rounded-lg border ${isExact ? "bg-emerald-500/15 border-emerald-500/40" : "bg-blue-500/12 border-blue-500/30"}`}>
                      <div className={`text-xs font-bold ${isExact ? "text-emerald-400" : "text-blue-400"}`}>{isExact ? "EXACT" : `${sim}%`}</div>
                      <div className="text-[0.65rem] text-slate-500 mt-0.5">match</div>
                    </div>

                    {/* Complaints summary */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex gap-3 flex-wrap">
                        {[link.complaintA, link.complaintB].map((c, i) => (
                          <span key={i} className="text-sm text-slate-800 flex items-center gap-1.5">
                            <span className="font-mono font-bold text-violet-400">{c.trackingId}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full border"
                              style={{ background: `${PRIORITY_COLORS[c.priorityLevel]}22`, color: PRIORITY_COLORS[c.priorityLevel], borderColor: `${PRIORITY_COLORS[c.priorityLevel]}44` }}>
                              {c.priorityLevel}
                            </span>
                            <span className="text-slate-500 text-xs">{c.incidentType || "Unknown"}</span>
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-slate-500">
                        Linked {new Date(link.linkedAt).toLocaleString()} · {link.linkReason.replace(/_/g, " ")}
                      </div>
                    </div>
                    <span className="text-slate-500 text-sm">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {[link.complaintA, link.complaintB].map((c, i) => (
                          <div key={i} className="bg-slate-50/20 rounded-xl p-4">
                            <div className="text-[0.7rem] font-bold uppercase text-slate-500 tracking-widest mb-2">Complaint {i + 1}</div>
                            <div className="font-mono font-bold text-violet-400 mb-1.5">{c.trackingId}</div>
                            <div className="text-sm text-slate-800 mb-1">{c.incidentType || "Unknown type"}</div>
                            <div className="text-xs text-slate-500 mb-1">{c.station?.stationName}{c.station?.district ? `, ${c.station.district}` : ""}</div>
                            <div className="text-xs text-slate-500 mb-2">{c.locationAddress || "No address"}</div>
                            <div className="flex gap-2 mb-3">
                              <span className="text-xs px-2.5 py-1 rounded-full border"
                                style={{ background: `${PRIORITY_COLORS[c.priorityLevel]}22`, color: PRIORITY_COLORS[c.priorityLevel], borderColor: `${PRIORITY_COLORS[c.priorityLevel]}44` }}>
                                {c.priorityLevel}
                              </span>
                              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                {STATUS_LABELS[c.status] || c.status}
                              </span>
                            </div>
                            <Link href={`/police/complaints/${c.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                              View Full Case →
                            </Link>
                          </div>
                        ))}
                      </div>

                      {/* Evidence match */}
                      {link.evidenceMatch && (
                        <div className="mt-4 p-4 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                          <div className="text-[0.7rem] font-bold uppercase text-violet-400 tracking-widest mb-3">Matching Evidence</div>
                          <div className="grid grid-cols-2 gap-3">
                            {[link.evidenceMatch.source, link.evidenceMatch.target].map((ev, i) => (
                              <div key={i} className="text-sm text-slate-500">
                                <div className="font-semibold text-slate-800 mb-1">{ev.fileName}</div>
                                <div>{ev.mimeType}</div>
                                {ev.riskLevel && (
                                  <div className="mt-1">Risk: <span style={{ color: ev.riskLevel === "Critical" || ev.riskLevel === "High" ? "#f87171" : "#fbbf24" }}>{ev.riskLevel}</span></div>
                                )}
                                {ev.overview && <div className="mt-1 italic text-xs">{ev.overview}</div>}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            Match type: <strong style={{ color: isExact ? "#10b981" : "#60a5fa" }}>{link.evidenceMatch.matchType}</strong>
                            {" · "}Similarity: <strong className="text-violet-400">{Math.round(link.evidenceMatch.similarityScore * 100)}%</strong>
                            {" · "}Detected: {new Date(link.evidenceMatch.createdAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
