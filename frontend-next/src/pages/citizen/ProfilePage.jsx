'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { User, Phone, MapPin, Globe, Save, LogOut, ArrowLeft, Shield, Edit2, X, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user;
  const loginCitizen = auth?.loginCitizen;
  const logoutCitizen = auth?.logoutCitizen;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      setIsEditing(false);
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

  const inputCls = `w-full px-4 py-2 border rounded-lg text-sm transition-colors ${isEditing
    ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-300"
    : "bg-slate-100/70 border-slate-200 text-slate-500 cursor-not-allowed select-none focus:outline-none"
    }`;

  const labelCls = "flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5";

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || "",
      mobileNumber: user?.mobileNumber || "",
      language: user?.language || "en",
      latitude: user?.latitude || "",
      longitude: user?.longitude || "",
    });
  };

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

      <div className="max-w-lg mx-auto py-10 px-6">
        {/* Fixed Back Button */}
        <button
          onClick={() => router.back()}
          className="fixed top-22 left-8 z-40 flex items-center gap-2 px-4 py-2  backdrop-blur-md  text-sm font-semibold text-neutral-600 hover:text-neutral-900  rounded-lg  transition-all duration-300"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className=" p-8 mt-10 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.05)] ">
          {/* Header */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-1">Account</p>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300 transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
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
                readOnly={!isEditing}
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
                readOnly={!isEditing}
              />
            </div>

            {/* Language */}
            <div>
              <label className={labelCls}><Globe size={12} />Preferred Language</label>
              <select
                className={inputCls}
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                disabled={!isEditing}
              >
                {[
                  ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"],
                  ["kn", "Kannada"], ["mr", "Marathi"], ["bn", "Bengali"], ["gu", "Gujarati"],
                  ["pa", "Punjabi"], ["or", "Odia"], ["ml", "Malayalam"],
                ].map(([v, l]) => <option key={v} value={v} className="bg-white">{l}</option>)}
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
                {isEditing && (
                  <button
                    type="button"
                    onClick={setLocation}
                    className="px-3 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
                  >
                    Get GPS
                  </button>
                )}
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

            {isEditing && (
              <>
                {/* Divider */}
                <div className="h-px bg-slate-200 my-8" />

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-slate-700 font-bold text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <X size={16} strokeWidth={2.5} />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Save size={16} strokeWidth={2.5} />
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
