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
  const [stations, setStations] = useState([]);
  const [selectedRank, setSelectedRank] = useState('STATION');
  const [showLocalStations, setShowLocalStations] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const LRef = useRef(null);

  const RANK_COLORS = {
    DISTRICT: "#ef4444",    // Red
    SUBDIVISION: "#f97316", // Orange
    CIRCLE: "#14b8a6",      // Teal
    STATION: "#3b82f6"      // Blue
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    fetchStations(selectedRank);
  }, [selectedRank]);

  const fetchComplaints = async () => {
    try {
      const res = await api.get("/api/police/complaints?limit=250");
      setComplaints(res.data.complaints || []);
    } catch (err) { console.error("Map Data Fetch Error:", err); }
    finally { setLoading(false); }
  };

  const fetchStations = async (rank) => {
    try {
      const res = await api.get(`/api/stations?rank=${rank}`);
      setStations(res.data.stations || []);
    } catch (err) { console.error("Station Data Fetch Error:", err); }
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
        const map = L.map(mapRef.current).setView([16.5062, 80.6480], 7); // Default to Andhra Pradesh center
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; CARTO", subdomains: "abcd", maxZoom: 20,
        }).addTo(map);
        markersGroup.current = L.layerGroup().addTo(map);
        mapInstance.current = map;
      }

      if (mapInstance.current && markersGroup.current) {
        markersGroup.current.clearLayers();

        // 1. Render Jurisdictions (Polygons)
        stations.forEach(s => {
          if (!s.boundary) return;

          const boundaryColor = RANK_COLORS[s.rank] || "#3b82f6";

          if (showLocalStations) {
            L.geoJSON(s.boundary, {
              style: {
                color: boundaryColor,
                weight: 1.5,
                fillOpacity: 0.1,
                dashArray: s.rank === 'STATION' ? "3" : "0",
              },
              onEachFeature: (feature, layer) => {
                layer.bindTooltip(`
                  <div style="font-weight:bold;color:${boundaryColor};">
                    ${s.rank === 'STATION' ? '🚓' : '🏢'} ${s.stationName}
                  </div>
                `, { sticky: true });
                layer.on('mouseover', function () {
                  this.setStyle({ fillOpacity: 0.3, weight: 3 });
                });
                layer.on('mouseout', function () {
                  this.setStyle({ fillOpacity: 0.1, weight: 1.5 });
                });
              }
            }).addTo(markersGroup.current);
          }
        });

        // 2. Render Complaint Markers
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
            L.marker([lat, lng], { icon, zIndexOffset: 1000 })
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
  }, [loading, complaints, stations, showLocalStations]);

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
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-5 px-4 lg:px-6 py-4 bg-white/95 backdrop-blur-md border-b border-neutral-200 z-[1000] shadow-sm">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button onClick={() => router.push("/police/dashboard")}
            className="text-[13px] font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors -ml-2">
            ← Back
          </button>
          <div className="flex-1 lg:flex-none">
            <h3 className="text-base lg:text-lg font-bold text-neutral-900 leading-tight">Live Intelligence Map</h3>
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{complaints.length} Cases Loaded</div>
          </div>
        </div>

        <div className="hidden lg:block flex-1" />

        {/* Legend & Controls */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 text-[11px] font-bold uppercase tracking-widest w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t border-neutral-100 lg:border-0">
          <div className="flex items-center gap-3 pr-4 border-r border-neutral-200">
            <span className="text-neutral-400">Jurisdiction:</span>
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="bg-neutral-100 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="STATION">Police Stations</option>
              <option value="CIRCLE">Circle Offices</option>
              <option value="SUBDIVISION">Sub-Divisions</option>
              <option value="DISTRICT">District HQs</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pr-4 border-r border-neutral-200">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-1 px-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={showLocalStations}
                onChange={(e) => setShowLocalStations(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full border shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-colors"
                  style={{
                    backgroundColor: `${RANK_COLORS[selectedRank]}40`,
                    borderColor: RANK_COLORS[selectedRank]
                  }}
                />
                <span className="text-neutral-900">Show Geofences</span>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] shadow-[0_0_8px_rgba(255,59,48,0.6)]" />
              <span className="text-neutral-600 font-bold uppercase tracking-widest text-[10px]">Emergency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <span className="text-neutral-600 font-bold uppercase tracking-widest text-[10px]">Standard</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={mapRef} className="flex-1 z-[1]" />
    </div >
  );
}
