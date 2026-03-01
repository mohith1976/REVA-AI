'use client';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { Link2 } from "lucide-react";

const INPUT = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 transition-colors";

export default function SimpleCaseFile() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState([]);
  const [selectedTargetStation, setSelectedTargetStation] = useState("");
  const [migrationReason, setMigrationReason] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get(`/api/police/complaints/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("reva_police_token")}` },
          }),
          api.get("/api/stations"),
        ]);
        setComplaint(cRes.data);
        setStations(sRes.data.stations || []);
      } catch (err) {
        console.error("Simple View Error:", err.response?.data || err.message);
        toast.error(err.response?.data?.error || "Access Denied / Not Found");
      } finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleMigrate = async () => {
    if (!selectedTargetStation) return toast.error("Select target station");
    setIsMigrating(true);
    try {
      await api.patch(`/api/police/complaints/${id}/migrate`, { targetStationId: selectedTargetStation, reason: migrationReason }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("reva_police_token")}` },
      });
      toast.success("Complaint migrated successfully");
      router.push("/police/dashboard");
    } catch (err) { toast.error(err.response?.data?.error || "Migration failed"); }
    finally { setIsMigrating(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-slate-900 text-sm">Loading Case Data...</div>;
  if (!complaint) return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center text-slate-900 gap-4">
      <h3>Error loading case data.</h3>
      <button onClick={() => router.push("/police/dashboard")} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">Back to Dashboard</button>
    </div>
  );

  const sectionTitle = (text) => (
    <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2.5 mb-4 mt-8">{text}</h3>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-900 p-10">
      <button onClick={() => router.push("/police/dashboard")} className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors mb-5">
        ← Dashboard
      </button>

      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-7">
        <h2 className="text-xl font-bold text-blue-400 mb-5">Case: {complaint.trackingId}</h2>

        {/* Meta grid */}
        <div className="grid grid-cols-[150px_1fr] gap-3 mb-7 text-sm">
          <span className="text-slate-500">Status:</span><span className="font-bold text-slate-900">{complaint.status}</span>
          <span className="text-slate-500">Type:</span><span className="text-slate-800">{complaint.incidentType}</span>
          <span className="text-slate-500">Priority:</span><span style={{ color: complaint.isEmergency ? "#f87171" : undefined }} className="text-slate-800">{complaint.priorityLevel}</span>
          <span className="text-slate-500">Date:</span><span className="text-slate-800">{new Date(complaint.createdAt).toLocaleString()}</span>
          <span className="text-slate-500">Station:</span><span className="text-slate-800">{complaint.station?.stationName}</span>
        </div>

        {sectionTitle("Summary")}
        <p className="text-slate-700 leading-relaxed">{complaint.summaryText}</p>

        {/* Linked cases */}
        {(complaint.linksAsA?.length > 0 || complaint.linksAsB?.length > 0) && (
          <div className="mt-7 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-3">
              <Link2 size={16} className="text-violet-400" /> Linked Cases
            </h3>
            <div className="grid gap-2.5">
              {[
                ...complaint.linksAsA.map(l => ({ ...l.complaintB, reason: l.linkReason })),
                ...complaint.linksAsB.map(l => ({ ...l.complaintA, reason: l.linkReason })),
              ].map((c, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg px-3 py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-blue-400 text-sm">{c.trackingId}</div>
                    <div className="text-xs text-slate-500">{c.incidentType} • {c.status}</div>
                  </div>
                  <button onClick={() => router.push(`/police/view/${c.id}`)} className="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    View Case
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {complaint.transcript && (
          <>
            {sectionTitle("Transcript")}
            <pre className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500 font-mono whitespace-pre-wrap leading-relaxed">{complaint.transcript}</pre>
          </>
        )}

        {/* Evidence */}
        {complaint.evidence?.length > 0 && (
          <>
            {sectionTitle("Evidence Attachments")}
            <div className="grid gap-2.5">
              {complaint.evidence.map(ev => (
                <div key={ev.id} className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{ev.fileName}</div>
                    <div className="text-xs text-slate-500">{ev.mediaCategory} • {(ev.fileSizeBytes / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/api/evidence/${ev.id}/url`, {
                          headers: { Authorization: `Bearer ${localStorage.getItem("reva_police_token")}` },
                        });
                        window.open(res.data.url, "_blank");
                      } catch { toast.error("Failed to load evidence URL"); }
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    View File
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Jurisdiction Transfer */}
        <div className="mt-10 pt-5 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-2">Jurisdiction Transfer</h3>
          <p className="text-sm text-slate-500 mb-4">Transfer this case to another station if it falls outside your jurisdiction.</p>
          <div className="grid gap-3 max-w-sm">
            <select className={INPUT} value={selectedTargetStation} onChange={e => setSelectedTargetStation(e.target.value)}>
              <option value="">Select Target Station</option>
              {stations.filter(s => s.id !== complaint.stationId).map(s => (
                <option key={s.id} value={s.id}>{s.stationName} ({s.district})</option>
              ))}
            </select>
            <input type="text" className={INPUT} placeholder="Reason for transfer..."
              value={migrationReason} onChange={e => setMigrationReason(e.target.value)} />
            <button onClick={handleMigrate} disabled={!selectedTargetStation || isMigrating}
              className="py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {isMigrating ? "Transferring..." : "Transfer Case"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
