'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { User, Phone, MapPin, Globe, Save, LogOut, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loginCitizen, logoutCitizen } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    mobileNumber: user?.mobileNumber || "",
    language: user?.language || "en",
    latitude: user?.latitude || "",
    longitude: user?.longitude || "",
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch("/api/users/profile", formData);
      loginCitizen(res.data.user, localStorage.getItem("reva_token"));
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally { setLoading(false); }
  };

  const setLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        toast.success("Location captured!");
      },
      () => toast.error("Location permission denied"),
    );
  };

  const inputCls = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-500 outline-none focus:border-slate-300 focus:bg-white transition-colors";
  const labelCls = "flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2.5";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-50/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-wide text-slate-900">REVA AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">Home</Link>
            <Link href="/my-complaints" className="px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">My Cases</Link>
            <button
              onClick={logoutCitizen}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto py-12  px-6">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-500 transition-colors mb-8">
          <ArrowLeft size={15} />
          Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <p className="text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-2">Account</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
        </div>

        <form className="space-y-6" onSubmit={handleUpdate}>
          {/* Name */}
          <div>
            <label className={labelCls}><User size={12} />Full Name</label>
            <input
              type="text"
              className={inputCls}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className={labelCls}><Phone size={12} />Mobile Number</label>
            <input
              type="text"
              className={inputCls}
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              placeholder="10-digit mobile number"
            />
          </div>

          {/* Language */}
          <div>
            <label className={labelCls}><Globe size={12} />Preferred Language</label>
            <select
              className={inputCls}
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            >
              {[
                ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"],
                ["kn", "Kannada"], ["mr", "Marathi"], ["bn", "Bengali"], ["gu", "Gujarati"],
                ["pa", "Punjabi"], ["or", "Odia"], ["ml", "Malayalam"],
              ].map(([v, l]) => <option key={v} value={v} className="bg-slate-50">{l}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className={labelCls}><MapPin size={12} />GPS Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                className={`${inputCls} flex-1`}
                value={formData.latitude ? `${Number(formData.latitude).toFixed(4)}, ${Number(formData.longitude).toFixed(4)}` : ""}
                readOnly
                placeholder="No location set"
              />
              <button
                type="button"
                onClick={setLocation}
                className="px-4 py-3 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Get GPS
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Used to route complaints to your nearest police station</p>
          </div>

          {/* Assigned station badge */}
          {user?.policeStation && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <div className="text-[0.68rem] font-bold uppercase text-slate-500 tracking-widest mb-1">Assigned Station</div>
              <div className="font-semibold text-slate-900">{user.policeStation.stationName}</div>
              <div className="text-sm text-slate-500">{user.policeStation.district}</div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Save */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Save size={16} strokeWidth={2.5} />
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
