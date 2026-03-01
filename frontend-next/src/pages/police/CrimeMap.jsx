'use client';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";

export default function CrimeMap() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const LRef = useRef(null);

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("reva_police_token");
      const res = await api.get("/api/police/complaints?limit=250", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaints(res.data.complaints || []);
    } catch (err) { console.error("Map Data Fetch Error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (loading) return;

    const initMap = async () => {
      // Dynamically import leaflet only on the client side
      if (!LRef.current) {
        await import("leaflet/dist/leaflet.css");
        const L = (await import("leaflet")).default;
        LRef.current = L;
      }

      const L = LRef.current;

      if (mapRef.current && !mapInstance.current) {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
        const map = L.map(mapRef.current).setView([22.5937, 78.9629], 5);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 20,
        }).addTo(map);
        markersGroup.current = L.layerGroup().addTo(map);
        mapInstance.current = map;
      }

      if (mapInstance.current && markersGroup.current) {
        markersGroup.current.clearLayers();
        const bounds = [];
        complaints.forEach((c) => {
          const lat = parseFloat(c.locationLat);
          const lng = parseFloat(c.locationLng);
          if (!isNaN(lat) && !isNaN(lng)) {
            const isEmergency = c.isEmergency || c.priorityLevel === "EMERGENCY";
            const color = isEmergency ? "#ff3b30" : "#3b82f6";
            const icon = L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 12px ${color},inset 0 0 4px rgba(0,0,0,0.3);${isEmergency ? "animation:pulse-red 1.5s infinite;" : ""}"></div>`,
              iconSize: [14, 14], iconAnchor: [7, 7],
            });
            L.marker([lat, lng], { icon })
              .bindPopup(`
                <div style="font-family:system-ui;color:#1a1a1a;min-width:180px;padding:5px;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <span style="font-family:monospace;font-weight:700;color:#3b82f6;font-size:0.8rem;">${c.trackingId}</span>
                    <span style="font-size:0.65rem;padding:2px 6px;border-radius:10px;background:${color}20;color:${color};font-weight:700;">${c.priorityLevel}</span>
                  </div>
                  <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;">${c.incidentType || "General Incident"}</div>
                  <div style="font-size:0.75rem;color:#666;margin-bottom:12px;line-height:1.4;">${c.locationAddress || "Address not specified"}</div>
                  <div style="border-top:1px solid #eee;padding-top:8px;">
                    <a href="/police/complaints/${c.id}" style="color:#3b82f6;text-decoration:none;font-size:0.8rem;font-weight:700;display:block;text-align:center;">View Full Case File →</a>
                  </div>
                </div>
              `)
              .addTo(markersGroup.current);
            bounds.push([lat, lng]);
          }
        });
        if (bounds.length > 0 && mapInstance.current) {
          mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
      }
    };

    initMap();
  }, [loading, complaints]);

  return (
    <div className="h-screen bg-[#0c0c0c] flex flex-col">
      <style>{`
        @keyframes pulse-red {
          0%   { box-shadow: 0 0 0 0px rgba(255,59,48,0.7); }
          70%  { box-shadow: 0 0 0 15px rgba(255,59,48,0); }
          100% { box-shadow: 0 0 0 0px rgba(255,59,48,0); }
        }
        .leaflet-popup-content-wrapper { border-radius: 12px; background: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .leaflet-popup-tip { background: #fff; }
      `}</style>

      {/* Topbar */}
      <div className="flex items-center gap-5 px-6 py-3 bg-slate-50/95 border-b border-slate-200 z-[1000] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <button onClick={() => router.push("/police/dashboard")}
          className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
          ← Dashboard
        </button>
        <div>
          <h3 className="text-base font-bold text-slate-900">Live Intelligence Map</h3>
          <div className="text-[0.7rem] text-slate-400">Real-time Incident Monitoring — {complaints.length} Cases Loaded</div>
        </div>
        <div className="flex-1" />
        {/* Legend */}
        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] border-2 border-white" style={{ boxShadow: "0 0 8px #ff3b30" }} />
            <span className="text-slate-800 font-semibold">Critical / Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" style={{ boxShadow: "0 0 8px #3b82f6" }} />
            <span className="text-slate-800 font-semibold">Standard Dispatch</span>
          </div>
        </div>
      </div>

      <div ref={mapRef} className="flex-1 z-[1]" />
    </div>
  );
}
