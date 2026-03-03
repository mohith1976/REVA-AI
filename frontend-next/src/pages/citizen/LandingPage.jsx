'use client';
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  Shield, Mic, MapPin, Zap, FileText, Lock,
  Phone, ArrowRight, AlertTriangle, User, ChevronDown
} from "lucide-react";

const STATS = [
  { value: "2.4M+", labelKey: "stats.complaintsLabel" },
  { value: "98%", labelKey: "stats.resolutionLabel" },
  { value: "11", labelKey: "stats.languagesLabel" },
  { value: "< 2.5s", labelKey: "stats.responseLabel" },
];

const FEATURES = [
  { key: "voice", Icon: Mic },
  { key: "aadhaar", Icon: Shield },
  { key: "geofence", Icon: MapPin },
  { key: "risk", Icon: Zap },
  { key: "fir", Icon: FileText },
  { key: "security", Icon: Lock },
];

const LANGUAGES = [
  { label: "English", code: "en" },
  { label: "हिंदी", code: "hi" },
  { label: "தமிழ்", code: "ta" },
  { label: "తెలుగు", code: "te" },
  { label: "ಕನ್ನಡ", code: "kn" },
  { label: "मराठी", code: "mr" },
  { label: "বাংলা", code: "bn" },
  { label: "ગુજરાતી", code: "gu" },
  { label: "ਪੰਜਾਬੀ", code: "pa" },
  { label: "ଓଡ଼ିଆ", code: "or" },
  { label: "മലയാളം", code: "ml" },
];

export default function LandingPage() {
  const auth = useAuth();
  const user = auth?.user;
  const { t, i18n } = useTranslation();
  const [activeLang, setActiveLang] = useState(i18n.language || "en");
  const [hoverFeature, setHoverFeature] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLangChange(code) {
    auth?.setLanguage?.(code);
    setActiveLang(code);
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-santoshi">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-slate-50/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-between h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-wide text-slate-900">REVA AI</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-2">
            {/* Navigation Links */}
            <Link href="/track" className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
              {t("nav.track")}
            </Link>
            {user && (
              <>
                <Link href="/my-complaints" className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                  {t("nav.myCases")}
                </Link>
                <Link href="/complaint" className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                  {t("nav.fileComplaint")}
                </Link>
              </>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="px-3.5 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-slate-100">
                  <User size={16} strokeWidth={2.5} />
                </Link>
                <button
                  onClick={() => auth?.logoutCitizen?.()}
                  className="px-4 py-1.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Signout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" id="login-nav" className="px-4 py-1.5 text-sm font-semibold text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                  {t("nav.signIn")}
                </Link>
                <Link href="/police/login" id="police-login-nav" className="px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                  {t("nav.policePortal")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors border-none bg-transparent"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 py-4 px-6 animate-in slide-in-from-top duration-300">
            <div className="flex flex-col gap-4">
              <Link href="/track" className="text-sm font-medium text-slate-600 no-underline" onClick={() => setMobileMenuOpen(false)}>
                {t("nav.track")}
              </Link>
              {user ? (
                <>
                  <Link href="/my-complaints" className="text-sm font-medium text-slate-600 no-underline" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.myCases")}
                  </Link>
                  <Link href="/complaint" className="text-sm font-medium text-slate-600 no-underline" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.fileComplaint")}
                  </Link>
                  <Link href="/profile" className="text-sm font-medium text-slate-600 no-underline" onClick={() => setMobileMenuOpen(false)}>
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-semibold text-slate-900 no-underline" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.signIn")}
                  </Link>
                  <Link href="/police/login" className="text-sm font-medium text-slate-600 no-underline" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.policePortal")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-[88vh] flex items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-3xl relative z-10">

          <h1 className="text-[clamp(2.8rem,6vw,4.5rem)] font-extrabold leading-[1.08] tracking-[-1.5px] mb-6 text-slate-900">
            {t("hero.title1")}
            <br />
            <span className="text-slate-500">{t("hero.title2")}</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-[560px] mx-auto mb-10 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex gap-3 justify-center flex-col sm:flex-row items-center sm:flex-wrap px-4">
            <Link
              href={user ? "/complaint" : "/login"}
              id="hero-file-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-[10px] hover:bg-slate-800 transition-opacity"
            >
              <Mic size={16} strokeWidth={2.5} />
              {t("hero.fileBtn")}
            </Link>
            <Link
              href="/track"
              id="hero-track-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-transparent text-slate-900 font-semibold text-sm rounded-[10px] border border-slate-200 hover:border-white/40 transition-colors"
            >
              {t("hero.trackBtn")}
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Language pills */}
          <div className="mt-14 flex flex-wrap gap-2 justify-center">
            {LANGUAGES.map(({ label, code }) => (
              <button
                key={code}
                onClick={() => handleLangChange(code)}
                className={`px-3 py-1 text-xs rounded-full border transition-all font-sans cursor-pointer ${activeLang === code
                  ? "bg-slate-100 border-slate-200 text-slate-900 font-semibold"
                  : "bg-transparent border-slate-200 text-slate-500 hover:text-slate-500 hover:border-slate-200 font-normal"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
