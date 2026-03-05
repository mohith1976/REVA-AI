'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { User, Phone, MapPin, Globe, Save, ArrowLeft, Shield, Edit2, X, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user;
  const loginCitizen = auth?.loginCitizen;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      // Apply language globally if it changed
      if (formData.language && formData.language !== auth?.language) {
        auth?.setLanguage?.(formData.language);
      }
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

  const inputCls = `w-full px-4 py-3 border rounded-xl text-sm transition-all ${isEditing
    ? "bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 shadow-sm"
    : "bg-neutral-50/50 border-neutral-100 text-neutral-500 cursor-not-allowed select-none focus:outline-none"
    }`;

  const labelCls = "flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-[1.5px] mb-2 px-1";

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

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.delete("/api/users/account");
      auth?.logoutCitizen?.();
      toast.success("Account deleted successfully.");
      router.push("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

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
              {t("nav.track")}
            </Link>
            {user && (
              <>
                <Link href="/my-complaints" className="px-3 py-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">
                  {t("nav.myCases")}
                </Link>
                <Link href="/complaint" className="px-3 py-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-50">
                  {t("nav.fileComplaint")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto py-12 sm:py-14 px-4 sm:px-6">
        {/* Fixed Back Button */}
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 sm:top-[88px] sm:left-8 z-[60] flex items-center gap-1.5 bg-white/85 backdrop-blur-md border border-neutral-200 rounded-[10px] px-2.5 py-1 sm:px-3.5 sm:py-[7px] text-[12px] sm:text-[13px] font-semibold text-neutral-600 cursor-pointer shadow-sm"
        >
          <ArrowLeft size={14} /> <span className="hidden xs:inline">{t("common.back")}</span>
        </button>

        <div className="bg-white border border-neutral-100 rounded-[28px] p-6 sm:p-10 shadow-2xl shadow-black/5 mt-10">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[0.72rem] font-bold tracking-[2px] uppercase text-neutral-400 mb-1">{t("profile.account")}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">{t("profile.heading")}</h1>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white text-[13px] font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-black/10"
              >
                <Edit2 size={14} />
                <span className="hidden xs:inline">{t("profile.edit")}</span>
              </button>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleUpdate}>
            {/* Name */}
            <div>
              <label className={labelCls}><User size={12} />{t("profile.name")}</label>
              <input
                type="text"
                className={inputCls}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("profile.namePlaceholder")}
                readOnly={!isEditing}
              />
            </div>

            {/* Mobile */}
            <div>
              <label className={labelCls}><Phone size={12} />{t("profile.mobile")}</label>
              <input
                type="text"
                className={inputCls}
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                placeholder={t("profile.mobilePlaceholder")}
                readOnly={!isEditing}
              />
            </div>

            {/* Language */}
            <div>
              <label className={labelCls}><Globe size={12} />{t("profile.language")}</label>
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
              <label className={labelCls}><MapPin size={12} />{t("profile.location")}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${inputCls} flex-1 font-mono tracking-tight`}
                  value={formData.latitude ? `${Number(formData.latitude).toFixed(4)}, ${Number(formData.longitude).toFixed(4)}` : ""}
                  readOnly
                  placeholder={t("profile.noLocation")}
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={setLocation}
                    className="px-4 py-2 bg-neutral-900 text-white text-[13px] font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-sm"
                  >
                    {t("profile.getGps")}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 px-1">{t("profile.locationNote")}</p>
            </div>

            {/* Assigned station badge */}
            {user?.policeStation && (
              <div className="p-5 bg-neutral-50 border border-neutral-100 rounded-[20px]">
                <div className="text-[10px] font-bold uppercase text-neutral-400 tracking-[1.5px] mb-2 px-1">{t("profile.assignedStation")}</div>
                <div className="font-bold text-neutral-900 text-base">{user.policeStation.stationName}</div>
                <div className="text-[13px] text-neutral-500">{user.policeStation.district}, {user.policeStation.state}</div>
              </div>
            )}

            {isEditing && (
              <>
                {/* Divider */}
                <div className="h-px bg-neutral-100 my-8" />

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white text-neutral-600 font-bold text-[13px] border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors"
                  >
                    {t("profile.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-neutral-900 text-white font-bold text-[13px] rounded-2xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10"
                  >
                    <Save size={16} strokeWidth={2.5} />
                    {loading ? t("profile.saving") : t("profile.save")}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* ── Danger Zone ── */}
          <div className="mt-8 pt-6 border-t border-neutral-100">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-[13px] font-bold text-red-500 hover:text-red-700 transition-colors px-1"
              >
                <Trash2 size={15} />
                Delete Account
              </button>
            ) : (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-sm font-bold text-red-700 mb-1">Are you absolutely sure?</p>
                <p className="text-xs text-red-500 mb-4">This will permanently delete your account and all associated data. This action cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 text-[13px] font-bold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 text-[13px] font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteLoading ? "Deleting…" : "Yes, Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}