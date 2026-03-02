'use client';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";

const INPUT = "w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-[13px] font-medium placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 transition-all";

export default function StationManagement() {
  const auth = useAuth();
  const policeUser = auth?.policeUser;
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    stationName: "", district: "", state: "",
    latitude: 12.9716, longitude: 77.5946, radiusKm: 5, contactNumber: "",
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const LRef = useRef(null);

  useEffect(() => {
    if (policeUser?.role !== "GLOBAL_ADMIN") { router.push("/police/dashboard"); return; }
    fetchStations();
  }, [policeUser, router]);

  const fetchStations = async () => {
    try {
      const res = await api.get("/api/stations");
      setStations(res.data.stations);
    } catch { toast.error("Failed to load stations"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!showAddForm) {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      return;
    }
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const initMap = async () => {
        if (!LRef.current) {
          await import("leaflet/dist/leaflet.css");
          LRef.current = (await import("leaflet")).default;
        }
        const L = LRef.current;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
        const map = L.map(mapContainerRef.current).setView([form.latitude, form.longitude], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
        const marker = L.marker([form.latitude, form.longitude], { draggable: false }).addTo(map);
        const circle = L.circle([form.latitude, form.longitude], { radius: form.radiusKm * 1000, color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.2 }).addTo(map);
        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
          reverseGeocode(lat, lng);
        });
        mapInstanceRef.current = map; markerRef.current = marker; circleRef.current = circle;
      };
      initMap();
    }
  }, [showAddForm]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      const pos = [form.latitude, form.longitude];
      markerRef.current.setLatLng(pos);
      circleRef.current.setLatLng(pos);
      circleRef.current.setRadius(form.radiusKm * 1000);
    }
  }, [form.latitude, form.longitude, form.radiusKm]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        setForm(prev => ({
          ...prev,
          district: addr.city_district || addr.suburb || addr.district || addr.city || prev.district,
          state: addr.state || prev.state,
        }));
      }
    } catch { }
  };

  const handleAddStation = async () => {
    if (!form.stationName || !form.district || !form.state) { toast.error("Please fill all required fields"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/stations", form);
      toast.success("Station created!"); setShowAddForm(false); fetchStations();
    } catch { toast.error("Failed to create station"); }
    finally { setSubmitting(false); }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">Police Station Management</h1>
            <p className="text-sm text-neutral-500">Define geofences and coverage areas</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-3 bg-neutral-900 text-white font-bold text-[13px] rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 w-full sm:w-auto text-center"
          >
            {showAddForm ? "✕ Cancel" : "+ Create New Station"}
          </button>
        </div>

        {/* Add Station Form */}
        {showAddForm && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-10 animate-fade-in">
            {/* Map */}
            <div className="bg-white border border-neutral-200/60 rounded-3xl overflow-hidden relative h-[400px] sm:h-[500px] shadow-sm">
              <div ref={mapContainerRef} className="h-full w-full bg-[#0d1420]" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-[12px] font-semibold text-neutral-600 border border-neutral-200 shadow-lg pointer-events-none whitespace-nowrap">
                Click map to set center location
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-white border border-neutral-200/60 shadow-sm rounded-3xl p-6 sm:p-8 flex flex-col gap-5">
              <h3 className="font-bold text-neutral-900 text-lg border-b border-neutral-100 pb-4">Register Station</h3>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">Station Name *</label>
                <input type="text" className={INPUT} placeholder="e.g. Koramangala Station"
                  value={form.stationName} onChange={e => setForm({ ...form, stationName: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">District *</label>
                  <input type="text" className={INPUT} value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">State *</label>
                  <input type="text" className={INPUT} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">Lat</label>
                  <input type="text" className={`${INPUT} opacity-60 font-mono`} value={form.latitude.toFixed(4)} readOnly />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">Lng</label>
                  <input type="text" className={`${INPUT} opacity-60 font-mono`} value={form.longitude.toFixed(4)} readOnly />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">Radius (km)</label>
                  <input type="number" className={INPUT} value={form.radiusKm}
                    onChange={e => setForm({ ...form, radiusKm: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">Contact Number</label>
                <input type="text" className={INPUT} value={form.contactNumber}
                  onChange={e => setForm({ ...form, contactNumber: e.target.value })} />
              </div>
              <button onClick={handleAddStation} disabled={submitting}
                className="py-4 bg-neutral-900 text-white font-bold text-[13px] rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-lg shadow-black/10 mt-auto w-full"
              >
                {submitting ? "Processing..." : "Register Station →"}
              </button>
            </div>
          </div>
        )}

        {/* Stations grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {stations.map(station => (
            <div key={station.id} className="bg-white border border-neutral-200/60 shadow-sm rounded-[24px] p-6 sm:p-7 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h4 className="text-xl font-bold text-neutral-900 mb-1">{station.stationName}</h4>
                  <div className="text-[13px] font-medium text-neutral-500">{station.district}, {station.state}</div>
                </div>
                <div className={`w-3 h-3 rounded-full mt-1.5 shadow-sm ${station.status ? "bg-emerald-500 shadow-emerald-500/20" : "bg-neutral-300"}`} />
              </div>

              <div className="flex gap-4 mb-6 p-4 bg-neutral-50 rounded-[16px]">
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-1">Geofence</div>
                  <div className="text-neutral-900 font-bold text-[15px]">{station.radiusKm} km</div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-1">Location</div>
                  <div className="text-[13px] font-mono font-semibold text-neutral-600">{station.latitude.toFixed(3)}, {station.longitude.toFixed(3)}</div>
                </div>
              </div>

              <button onClick={() => router.push(`/police/officers?stationId=${station.id}`)}
                className="w-full py-3.5 text-[13px] font-bold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-all"
              >
                Manage Station Officers
              </button>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
