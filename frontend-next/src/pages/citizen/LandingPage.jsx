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

  function handleLangChange(code) {
    i18n.changeLanguage(code);
    localStorage.setItem("reva_language", code);
    setActiveLang(code);
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-slate-50/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-wide text-slate-900">REVA AI</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-2">
            {/* Services Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
                Complaints <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>

              <div className="absolute top-full mt-1 -right-4 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top scale-95 group-hover:scale-100 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl overflow-hidden py-1.5 z-50">
                <Link href="/track" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  {t("nav.track")}
                </Link>
                {user && (
                  <>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <Link href="/my-complaints" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      {t("nav.myCases")}
                    </Link>
                    <Link href="/complaint" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      {t("nav.fileComplaint")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {user ? (
              <Link href="/profile" className="px-3.5 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors rounded-lg hover:bg-slate-100">
                <User size={16} strokeWidth={2.5} />
              </Link>
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
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-[88vh] flex items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-3xl relative z-10">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 border border-white/12 rounded-full mb-8 text-xs font-medium text-slate-500 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {t("hero.badge")}
          </div>

          <h1 className="text-[clamp(2.8rem,6vw,4.5rem)] font-extrabold leading-[1.08] tracking-[-1.5px] mb-6 text-slate-900">
            {t("hero.title1")}
            <br />
            <span className="text-slate-500">{t("hero.title2")}</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-[560px] mx-auto mb-10 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={user ? "/complaint" : "/login"}
              id="hero-file-btn"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-[10px] hover:bg-slate-800 transition-opacity"
            >
              <Mic size={16} strokeWidth={2.5} />
              {t("hero.fileBtn")}
            </Link>
            <Link
              href="/track"
              id="hero-track-btn"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent text-slate-900 font-semibold text-sm rounded-[10px] border border-slate-200 hover:border-white/40 transition-colors"
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

      {/* ── Stats ── */}
      <section className="py-12 px-8 border-t border-b border-white/7">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(({ value, labelKey }) => (
            <div key={labelKey}>
              <div className="text-[2.4rem] font-extrabold tracking-[-1px] text-slate-900 leading-none mb-1.5">{value}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-[0.4px]">{t(labelKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[0.72rem] font-bold tracking-[2px] uppercase text-slate-500 mb-3">Platform Features</div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-[-0.8px] text-slate-900 mb-3">
              {t("features.heading")}
            </h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{t("features.subheading")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-100 border border-white/7 rounded-2xl overflow-hidden">
            {FEATURES.map(({ key, Icon }, i) => (
              <div
                key={key}
                className={`p-8 transition-colors duration-200 cursor-default ${hoverFeature === i ? "bg-white" : "bg-slate-50"}`}
                onMouseEnter={() => setHoverFeature(i)}
                onMouseLeave={() => setHoverFeature(null)}
              >
                <div className="w-10 h-10 rounded-[10px] bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                  <Icon size={18} color="rgba(255,255,255,0.7)" strokeWidth={1.75} />
                </div>
                <div className="font-bold text-[0.95rem] text-slate-900 mb-2 tracking-[-0.2px]">
                  {t(`features.${key}.title`)}
                </div>
                <p className="text-[0.84rem] text-slate-500 leading-relaxed">{t(`features.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Emergency CTA ── */}
      <section className="pb-20 px-8">
        <div className="max-w-3xl mx-auto bg-white border border-white/9 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={22} color="#f87171" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-[-0.4px] mb-2">{t("emergency.title")}</h3>
          <p className="text-sm text-slate-500 mb-7 leading-relaxed">{t("emergency.subtitle")}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="tel:112"
              id="emergency-call-112"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/12 text-red-400 font-bold text-sm rounded-[10px] border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              <Phone size={15} strokeWidth={2.5} />
              {t("emergency.call112")}
            </a>
            <a
              href="tel:100"
              id="emergency-call-100"
              className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-slate-900 font-semibold text-sm rounded-[10px] border border-slate-200 hover:border-white/40 transition-colors"
            >
              <Phone size={15} strokeWidth={2.5} />
              {t("emergency.call100")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/7 py-10 px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={14} color="rgba(255,255,255,0.25)" strokeWidth={2} />
            <span className="font-bold text-sm text-slate-500">REVA AI</span>
          </div>
          <span className="text-xs text-slate-500">{t("footer.copyright")}</span>
          <div className="flex gap-6">
            <Link href="/police/login" className="text-xs text-slate-500 hover:text-slate-500 transition-colors">{t("footer.policePortal")}</Link>
            <Link href="/track" className="text-xs text-slate-500 hover:text-slate-500 transition-colors">{t("footer.track")}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
