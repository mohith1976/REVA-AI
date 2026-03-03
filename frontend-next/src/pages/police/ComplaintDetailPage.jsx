'use client';
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";

import {
  MapPin, FileText, Clock, AlertCircle, CheckCircle2,
  ChevronRight, Printer, User, Shield, ArrowLeft,
  Bot, AlertTriangle, Link2, Info, UserPlus,
  RefreshCw, Gavel, Image as ImageIcon, Video,
  File, Activity, BarChart2, Mail, Phone,
  ChevronLeft, Share2, Search, ExternalLink,
  ChevronDown, Send, Check
} from "lucide-react";

const PRIORITY_COLORS = {
  EMERGENCY: "text-red-600 bg-red-50 border-red-100",
  HIGH: "text-rose-500 bg-rose-50 border-rose-100",
  MODERATE: "text-amber-600 bg-amber-50 border-amber-100",
  INFORMATIONAL: "text-emerald-600 bg-emerald-50 border-emerald-100",
};

const STATUS_ORDER = [
  "FILED",
  "UNDER_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const SUMMARY_STATUS_LABELS = {
  FILED: "Filed",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function EvidenceCard({ item }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUrl = async () => {
    if (url) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/evidence/${item.id}/url`);
      setUrl(res.data.url);
    } catch (err) {
      toast.error("Failed to load evidence file");
    } finally {
      setLoading(false);
    }
  };

  const isImage = item.mediaCategory === "IMAGE";
  const isVideo = item.mediaCategory === "VIDEO";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-3 group transition-all hover:shadow-md">
      <div
        className="h-36 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden relative cursor-pointer"
        onClick={fetchUrl}
      >
        {url ? (
          isImage ? (
            <img
              src={url}
              alt={item.fileName}
              className="w-full h-full object-cover"
            />
          ) : isVideo ? (
            <video
              src={url}
              className="w-full h-full object-cover"
            />
          ) : (
            <File size={32} className="text-slate-400" />
          )
        ) : (
          <div className="text-center">
            <div className="mb-1 flex justify-center">
              {isImage ? <ImageIcon size={24} className="text-slate-400" /> : isVideo ? <Video size={24} className="text-slate-400" /> : <File size={24} className="text-slate-400" />}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {loading ? "Loading..." : "Click to view"}
            </div>
          </div>
        )}
        {item.riskLevel && (
          <div
            className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${item.riskLevel === "Critical" || item.riskLevel === "High"
              ? "bg-red-500"
              : "bg-amber-500"
              }`}
          >
            {item.riskLevel}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div
          className="text-xs font-bold text-slate-900 truncate"
          title={item.fileName}
        >
          {item.fileName}
        </div>
        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
          {item.mediaCategory} • {(item.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-colors hover:bg-slate-100 no-underline"
        >
          Open Original <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = params?.id;
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const router = useRouter();
  const [complaint, setComplaint] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeView, setActiveView] = useState("case_file");
  const [stations, setStations] = useState([]);
  const [selectedTargetStation, setSelectedTargetStation] = useState("");
  const [migrationReason, setMigrationReason] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [firData, setFirData] = useState(null);
  const [firLoading, setFirLoading] = useState(false);
  const [firError, setFirError] = useState(null);
  const firGeneratedRef = useRef(false);


  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (complaint && !firGeneratedRef.current) {
      firGeneratedRef.current = true;
      generateFIR(complaint.id);
    }
  }, [complaint?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch complaint first as it's critical
      const cRes = await api.get(`/api/police/complaints/${id}`);
      setComplaint(cRes.data);
      setSelectedStatus(cRes.data.status);

      // Fetch other data secondary
      try {
        if (["STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role)) {
          const oRes = await api.get("/api/police/officers");
          setOfficers(oRes.data.officers || []);
        }
      } catch (e) {
        console.warn("Failed to load officers", e);
      }

      try {
        const sRes = await api.get("/api/stations");
        setStations(sRes.data.stations || []);
      } catch (e) {
        console.warn("Failed to load stations", e);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to load complaint details";
      toast.error(errorMsg);
      console.error("Fetch Error:", err.response?.data || err.message);

      // Don't navigate away immediately if it's an auth error we want to see
      if (err.response?.status === 401) {
        router.push("/police/login");
      } else if (err.response?.status === 404) {
        // Only navigate back if it's truly missing
        setTimeout(() => router.push("/police/dashboard"), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOfficer) return;
    try {
      await api.patch(
        `/api/police/complaints/${id}/assign`,
        { officerId: selectedOfficer }
      );
      toast.success("Complaint assigned successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign");
    }
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === complaint.status) return;
    try {
      await api.patch(
        `/api/police/complaints/${id}/status`,
        { status: selectedStatus }
      );
      toast.success("Status updated");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSubmittingNote(true);
    try {
      await api.post(
        `/api/police/complaints/${id}/notes`,
        { note }
      );
      toast.success("Note added");
      setNote("");
      fetchData();
    } catch (err) {
      toast.error("Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const generateFIR = async (complaintId) => {
    if (firData || firLoading) return;
    setFirLoading(true);
    setFirError(null);
    try {
      const res = await api.post(
        `/api/police/complaints/${complaintId}/generate-fir`,
        {}
      );
      setFirData(res.data.firData);
    } catch (err) {
      setFirError(err.response?.data?.error || "Failed to generate FIR");
    } finally {
      setFirLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!selectedTargetStation) return toast.error("Select target station");
    setIsMigrating(true);
    try {
      await api.patch(
        `/api/police/complaints/${id}/migrate`,
        { targetStationId: selectedTargetStation, reason: migrationReason }
      );
      toast.success("Complaint migrated and transferred");
      router.push("/police/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Migration failed");
    } finally {
      setIsMigrating(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("print-root");
    if (!printContent) {
      toast.error("FIR not yet generated. Please wait.");
      return;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>FIR Report - ${complaint.trackingId}</title>
          <style>
            body { 
              font-family: "Times New Roman", Times, serif; 
              padding: 40px; 
              color: #000; 
              background: #fff; 
              line-height: 1.7;
              font-size: 14px;
            }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #999; padding: 8px 12px; }
            h2 { text-align: center; margin-bottom: 8px; }
            h4 { border-bottom: 2px solid #000; padding-bottom: 6px; text-transform: uppercase; }
            .no-print { display: none !important; }
            @page { margin: 2cm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield size={16} className="text-slate-900" />
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px] animate-pulse">Loading Secure Files</div>
      </div>
    );

  if (!complaint) return null;

  const pStyle = PRIORITY_COLORS[complaint.priorityLevel] || "text-slate-500 bg-slate-50 border-slate-100";
  const structured = complaint.structuredJson || {};

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 no-print">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/police/dashboard")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-6 w-px bg-slate-200 hidden xs:block" />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Case File</span>
                <span className="font-mono font-bold text-slate-900 text-sm truncate">{complaint.trackingId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${pStyle}`}>
              {complaint.priorityLevel}
            </div>

            {complaint.isEmergency && (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white border border-red-600 uppercase tracking-wide animate-pulse flex items-center gap-1">
                <AlertCircle size={10} />
                <span>Emergency</span>
              </div>
            )}

            {complaint.priorityScore > 0 && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 ml-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Score</span>
                <span className={`text-sm font-black ${complaint.priorityScore >= 80 ? "text-red-600" : complaint.priorityScore >= 50 ? "text-amber-600" : "text-emerald-600"}`}>
                  {complaint.priorityScore}<span className="text-[10px] text-slate-400 font-medium">/100</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          {/* Main column */}
          <div className="min-w-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto no-print scrollbar-hide">
              {[
                { id: "case_file", label: "Full Case File", icon: FileText },
                { id: "extraction", label: "AI Analytics", icon: BarChart2 },
                { id: "timeline", label: "Audit Timeline", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${activeView === tab.id
                    ? "text-slate-900 border-slate-900"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                    }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {activeView === "case_file" && (
                <div className="space-y-8">
                  {/* Transcript Section */}
                  <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm no-print">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-900" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Digital Transcript</h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recorded via REVA AI</span>
                    </div>

                    <div className="p-6 max-h-[600px] overflow-y-auto space-y-4 bg-white font-sans text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {complaint.transcript ? (
                        complaint.transcript.split("\n").map((line, i) => {
                          const isAi = line.startsWith("REVA:");
                          const isUser = line.startsWith("USER:");
                          const content = line.split(":").slice(1).join(":").trim();

                          if (!content) return null;

                          return (
                            <div
                              key={i}
                              className={`flex flex-col gap-1.5 p-4 rounded-2xl max-w-[90%] ${isAi
                                ? "bg-slate-50 text-slate-800 border border-slate-100 self-start rounded-tl-none"
                                : "bg-white text-slate-900 border border-slate-200 self-end ml-auto rounded-tr-none shadow-sm"
                                }`}
                            >
                              <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isAi ? "text-slate-500" : "text-indigo-600"
                                }`}>
                                {isAi ? <Bot size={10} /> : <User size={10} />}
                                {line.split(":")[0]}
                              </div>
                              <div className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">
                                {content}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-20 text-center flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                            <Info size={20} className="text-slate-300" />
                          </div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transcript data available</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Evidence Section */}
                  {complaint.evidence?.length > 0 && (
                    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm no-print">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <ImageIcon size={16} className="text-slate-900" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Evidence & Media Gallery</h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {complaint.evidence.map((ev) => (
                            <EvidenceCard key={ev.id} item={ev} />
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* FIR Section */}
                  {firLoading && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw size={32} className="text-slate-300 animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Generating Official FIR</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Processing Section 154 CrPC document...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {firError && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle size={24} className="text-red-500" />
                        <p className="text-sm font-bold text-red-900">FIR Generation Failed</p>
                        <p className="text-xs text-red-600 mb-2">{firError}</p>
                        <button
                          onClick={() => { setFirError(null); generateFIR(complaint.id); }}
                          className="px-4 py-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Retry Generation
                        </button>
                      </div>
                    </div>
                  )}

                  {firData && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between no-print">
                        <div className="flex items-center gap-2">
                          <Gavel size={16} className="text-slate-900" />
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Formal FIR Document</h3>
                        </div>
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                        >
                          <Printer size={14} />
                          Print Final FIR
                        </button>
                      </div>

                      <div
                        id="print-root"
                        className="bg-white border border-slate-200 p-8 md:p-16 shadow-sm rounded-sm overflow-x-auto"
                        style={{
                          color: "#000",
                          fontFamily: '"Times New Roman", Times, serif',
                          fontSize: "14px",
                          lineHeight: "1.6",
                          minWidth: "min(100%, 800px)"
                        }}
                      >
                        {/* ── Document Header ── */}
                        <div className="text-center mb-10 border-b-4 border-double border-black pb-8">
                          <div className="text-[11px] font-bold tracking-[4px] uppercase mb-2">Government of India</div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">First Information Report</h2>
                          <div className="text-sm font-bold opacity-80 mb-1">(Complaint Statement)</div>
                          <div className="text-xs italic">(Under Section 154 CrPC)</div>
                        </div>

                        {/* ── Meta Info ── */}
                        <div className="grid grid-cols-2 border border-black mb-8">
                          <div className="p-4 border-r border-b border-black">
                            <span className="font-bold block text-[10px] uppercase mb-0.5">FIR Number</span>
                            {complaint.trackingId}
                          </div>
                          <div className="p-4 border-b border-black">
                            <span className="font-bold block text-[10px] uppercase mb-0.5">Filing Date & Time</span>
                            {new Date(complaint.createdAt).toLocaleString("en-IN")}
                          </div>
                          <div className="p-4 border-r border-black">
                            <span className="font-bold block text-[10px] uppercase mb-0.5">Police Jurisdiction</span>
                            {complaint.station?.stationName}, {complaint.station?.district}
                          </div>
                          <div className="p-4">
                            <span className="font-bold block text-[10px] uppercase mb-0.5">Case Status</span>
                            {complaint.status}
                          </div>
                        </div>


                        {/* ── Numbered fields ── */}
                        <div className="space-y-4 border-t border-black pt-6">
                          {[
                            { no: "1.", label: "Name of Complainant", value: complaint.isAnonymous ? "UNDER PROTECTED IDENTITY (ANONYMOUS)" : firData.complainant_name },
                            { no: "2.", label: "Father's / Husband's Name", value: firData.fathers_or_husbands_name },
                            { no: "3.", label: "Age", value: firData.age },
                            { no: "4.", label: "Gender", value: firData.gender },
                            { no: "5.", label: "Occupation", value: firData.occupation },
                            { no: "6.", label: "Residential Address", value: firData.address },
                            { no: "7.", label: "Contact Number", value: complaint.isAnonymous ? "WITHHELD" : firData.contact_number },
                            { no: "8.", label: "Aadhaar (Masked)", value: complaint.user?.aadhaarMasked || "Not Provided" },
                          ].map(({ no, label, value }) => (
                            <div key={no} className="grid grid-cols-[30px_200px_1fr] gap-4 border-b border-dotted border-slate-300 pb-3">
                              <span className="font-bold">{no}</span>
                              <span className="font-bold">{label}:</span>
                              <span className="opacity-90">{value || "Not mentioned"}</span>
                            </div>
                          ))}
                        </div>

                        {/* ── Occurrence details ── */}
                        <div className="mt-8 mb-6 uppercase border-b-2 border-black pb-2 font-black tracking-widest text-lg">
                          Particulars of Occurrence
                        </div>

                        <div className="space-y-4">
                          {[
                            { no: "9.", label: "Date of Occurrence", value: firData.date_of_occurrence },
                            { no: "10.", label: "Time of Occurrence", value: firData.time_of_occurrence },
                            { no: "11.", label: "Place of Occurrence", value: firData.place_of_occurrence },
                            { no: "12.", label: "Nature of Offence", value: firData.nature_of_offence },
                            { no: "13.", label: "Applicable IPC / BNS Sections", value: firData.ipc_sections },
                          ].map(({ no, label, value }) => (
                            <div key={no} className="grid grid-cols-[30px_200px_1fr] gap-4 border-b border-dotted border-slate-300 pb-3">
                              <span className="font-bold">{no}</span>
                              <span className="font-bold">{label}:</span>
                              <span className="opacity-90">{value || "Not mentioned"}</span>
                            </div>
                          ))}
                        </div>

                        {/* ── Incident Details ── */}
                        <div className="mt-8 p-6 bg-slate-50 border border-black italic">
                          <strong className="block mb-3 text-sm uppercase underline">14. {firData.incident_specific_details_label || "Incident Details"}:</strong>
                          <div className="whitespace-pre-line leading-relaxed text-justify">
                            {firData.incident_specific_details || "Not mentioned"}
                          </div>
                        </div>

                        <div className="mt-6 p-6 bg-slate-50 border border-black">
                          <strong className="block mb-3 text-sm uppercase underline">15. Brief Facts of the Case:</strong>
                          <p className="text-justify leading-relaxed m-0 italic">
                            {firData.brief_facts}
                          </p>
                        </div>

                        <div className="mt-6 grid grid-cols-[30px_200px_1fr] gap-4 py-4 border-t border-black">
                          <span className="font-bold">16.</span>
                          <span className="font-bold">Witnesses:</span>
                          <span className="opacity-90 italic">{firData.witnesses || "None mentioned"}</span>
                        </div>

                        {/* ── Prayer ── */}
                        <div className="mt-8 p-6 border-2 border-black font-bold italic text-center">
                          "I request the registering of this complaint and necessary legal action."
                        </div>

                        {/* ── Signature Block ── */}
                        <div className="mt-20 grid grid-cols-3 gap-12 text-center pt-8 border-t border-black">
                          <div>
                            <div className="h-12 border-b border-black mb-2" />
                            <div className="text-[10px] font-bold uppercase">Signature of Complainant</div>
                            <div className="text-xs mt-1">({complaint.isAnonymous ? "Anonymous" : firData.complainant_name})</div>
                          </div>
                          <div>
                            <div className="h-12 border-b border-black mb-2" />
                            <div className="text-[10px] font-bold uppercase">Investigating Officer</div>
                          </div>
                          <div>
                            <div className="h-12 border-b border-black mb-2" />
                            <div className="text-[10px] font-bold uppercase">Station SHO Seal</div>
                          </div>
                        </div>

                        <div className="flex justify-between mt-12 text-xs font-bold uppercase tracking-widest text-slate-500">
                          <span>Date: {firData.date_of_filing}</span>
                          <span>Place: {firData.place_of_filing}</span>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeView === "extraction" && (
                <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm no-print">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Bot size={16} className="text-slate-900" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">AI Forensic Extraction</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-0.5">
                      {Object.entries(structured).map(([key, value]) => value && (
                        <div key={key} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mt-1">{key.replace(/_/g, " ")}</span>
                          <div className="text-[13px] text-slate-700 font-medium leading-relaxed break-words">
                            {typeof value === 'object' ? (
                              <pre className="bg-slate-50 text-slate-600 p-4 rounded-xl text-[11px] overflow-x-auto mt-2 border border-slate-100">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {activeView === "timeline" && (
                <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm no-print">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Activity size={16} className="text-slate-900" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Audit History</h3>
                  </div>
                  <div className="p-8 relative">
                    <div className="absolute left-10 top-8 bottom-8 w-px bg-slate-100" />
                    <div className="space-y-8 relative">
                      {[
                        { content: "Complaint filed by citizen", createdAt: complaint.createdAt, updateType: "FILED" },
                        ...(complaint.updates || [])
                      ].map((u, i) => (
                        <div key={i} className="flex gap-6 group">
                          <div className={`w-4 h-4 rounded-full mt-1.5 z-10 border-2 border-white shadow-sm ring-4 ring-slate-50 transition-colors ${u.updateType === 'EMERGENCY_FLAG' ? 'bg-red-500' : 'bg-slate-900'}`} />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(u.createdAt).toLocaleString("en-IN")}
                              </span>
                              {u.updateType && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tighter">
                                  {u.updateType}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{u.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Internal Notes */}
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm no-print mt-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <FileText size={16} className="text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Case Notes</h3>
                </div>
                <div className="p-6">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Record investigation updates, officer notes..."
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={addNote}
                      disabled={submittingNote || !note.trim()}
                      className="px-6 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-black/10"
                    >
                      {submittingNote ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                      Add Case Note
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Sidebar Controls */}
          <aside className="space-y-6 no-print">
            {/* Status Control */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] mb-4">Case Management</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Update Status</label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/5 outline-none"
                    >
                      {STATUS_ORDER.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <button
                  onClick={handleStatusChange}
                  disabled={selectedStatus === complaint.status}
                  className="w-full py-3 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  Permanently Save Status
                </button>
              </div>
            </section>

            {/* Officer Assignment */}
            {["STATION_ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN"].includes(policeUser?.role) && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] mb-4">Investigating Personnel</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Assigned To</div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {complaint.assignedOfficer?.name || "Unassigned"}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900/5 outline-none"
                    >
                      <option value="">Choose Officer...</option>
                      {officers.map(o => (
                        <option key={o.id} value={o.id}>{o.name} ({o._count?.assignedComplaints || 0} active)</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedOfficer}
                    className="w-full py-3 bg-white border border-slate-900 text-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30"
                  >
                    Assign Personnel
                  </button>
                </div>
              </section>
            )}

            {/* Jurisdiction Transfer */}
            {["STATION_ADMIN", "SUPER_ADMIN", "GLOBAL_ADMIN"].includes(policeUser?.role) && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px]">Jurisdiction Transfer</h3>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-4">
                  Routing this case to another station will transfer all forensic data and ownership immediately.
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <select
                      value={selectedTargetStation}
                      onChange={(e) => setSelectedTargetStation(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/5"
                    >
                      <option value="">Select Target Station...</option>
                      {stations.filter(s => s.id !== complaint.stationId).map(s => (
                        <option key={s.id} value={s.id}>{s.stationName} ({s.district})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <input
                    type="text"
                    placeholder="Official Reason for Transfer"
                    value={migrationReason}
                    onChange={(e) => setMigrationReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/5"
                  />
                  <button
                    onClick={handleMigrate}
                    disabled={!selectedTargetStation || isMigrating}
                    className="w-full py-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    {isMigrating ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Execute Transfer
                  </button>
                </div>
              </section>
            )}
          </aside>
        </div >
      </main >
    </div >
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">
        {label}
      </span>
      <span className="text-[11px] font-bold text-slate-700 text-right break-words">
        {value || "—"}
      </span>
    </div>
  );
}
