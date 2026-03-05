'use client';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { Shield, MapPin } from "lucide-react";

const termsPdf = "/terms.pdf";

const INPUT = "w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 text-sm placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition-colors";
const BTN_PRIMARY = "w-full h-[50px] bg-neutral-900 text-white font-bold text-sm rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm";
const BTN_GHOST = "w-full py-3 text-sm text-neutral-500 font-semibold hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors";

const TermsCheck = ({ id, checked, onChange, t }) => (
  <div className="flex gap-3 items-start mb-5">
    <input type="checkbox" id={id} checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 cursor-pointer accent-neutral-900 flex-shrink-0"
    />
    <label htmlFor={id} className="text-xs text-neutral-500 cursor-pointer leading-relaxed">
      {t("login.termsAgree")}{" "}
      <a href={termsPdf} target="_blank" rel="noopener noreferrer"
        className="text-neutral-900 font-bold underline hover:text-black">
        {t("login.termsLink")}
      </a>
    </label>
  </div>
);

const OtpGrid = ({ cells, onChange, onKeyDown }) => (
  <div className="grid grid-cols-6 gap-2 sm:gap-3 justify-center mb-8">
    {cells.map((cell, i) => (
      <input
        key={i}
        id={`otp-cell-${i}`}
        type="text"
        inputMode="numeric"
        className={`w-full aspect-square text-center text-xl sm:text-2xl font-bold rounded-2xl border outline-none transition-all ${cell ? "bg-neutral-900 border-neutral-900 text-white" : "bg-neutral-50/50 border-neutral-100 text-neutral-900"} focus:border-neutral-900 shadow-sm`}
        value={cell}
        onChange={(e) => onChange(i, e.target.value)}
        onKeyDown={(e) => onKeyDown(i, e)}
      />
    ))}
  </div>
);

export default function LoginPage() {
  // "register" = new account via Aadhaar, "login" = returning user via phone
  const [tab, setTab] = useState("register");

  // Register flow steps: "aadhaar" → "aadhaar-otp" → "phone" → "phone-otp"
  // Login flow steps: "phone" → "otp"
  const [step, setStep] = useState("aadhaar");

  const [aadhaar, setAadhaar] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [masked, setMasked] = useState("");
  const [otpCells, setOtpCells] = useState(["", "", "", "", "", ""]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState(null); // {latitude, longitude}

  // Temp token received after Aadhaar verification — needed for phone registration step
  const tempTokenRef = useRef(null);
  // KYC name returned from Aadhaar verification
  const [kycName, setKycName] = useState("");

  const router = useRouter();
  const auth = useAuth();
  const { loginCitizen } = auth || {};
  const user = auth?.user;
  const authLoading = auth?.loading;
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && user) router.push("/complaint", { replace: true });
  }, [user, authLoading, router]);

  if (authLoading) return null;

  // ── Helpers ──
  const formatAadhaar = (val) => {
    const d = val.replace(/\D/g, "").slice(0, 12);
    return d.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a, b, c].filter(Boolean).join("-"));
  };
  const rawAadhaar = () => aadhaar.replace(/-/g, "");

  const handleOtpCell = (i, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const cells = [...otpCells]; cells[i] = v; setOtpCells(cells);
    if (v && i < 5) document.getElementById(`otp-cell-${i + 1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpCells[i] && i > 0)
      document.getElementById(`otp-cell-${i - 1}`)?.focus();
  };

  const switchTab = (t) => {
    setTab(t);
    setStep(t === "register" ? "aadhaar" : "phone");
    setOtpCells(["", "", "", "", "", ""]);
    setMobile("");
    setAadhaar("");
    setMasked("");
    setAcceptedTerms(false);
    tempTokenRef.current = null;
  };

  const grabLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setLocationLoading(false); toast.success("Location captured!"); },
      () => { setLocationLoading(false); toast.error("Location permission denied — you can update it later from your profile."); }
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  const sendAadhaarOtp = async () => {
    const digits = rawAadhaar();
    if (digits.length !== 12) { toast.error("Enter valid 12-digit Aadhaar"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/send-otp", { aadhaar: digits });
      setMasked(res.data.aadhaarMasked);
      setStep("aadhaar-otp");
      setOtpCells(["", "", "", "", "", ""]);
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send Aadhaar OTP"); }
    finally { setLoading(false); }
  };

  const verifyAadhaarOtp = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", { aadhaar: rawAadhaar(), otp: fullOtp });

      if (!res.data.needsPhone) {
        // Existing user with phone already registered — logged in
        loginCitizen(res.data.user, res.data.accessToken);
        toast.success("Welcome back, " + (res.data.user.name || "Citizen") + "!");
        router.push("/complaint");
        return;
      }

      // New / incomplete account → proceed to phone step
      tempTokenRef.current = res.data.tempToken;
      setKycName(res.data.user?.name || "");
      setStep("phone");
      setOtpCells(["", "", "", "", "", ""]);
      setMobile("");
      toast.success("Identity verified! Now link your phone number.");
    } catch (err) { toast.error(err.response?.data?.error || "OTP Verification Failed"); }
    finally { setLoading(false); }
  };

  const sendRegisterPhoneOtp = async () => {
    if (mobile.length !== 10) return toast.error("Enter valid 10-digit mobile number");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register/send-phone-otp", {
        tempToken: tempTokenRef.current,
        mobile,
      });
      setMasked(`+91 ${mobile.slice(0, 2)}******${mobile.slice(-2)}`);
      setStep("phone-otp");
      setOtpCells(["", "", "", "", "", ""]);
      if (res.data.devOtp) {
        toast((t_inner) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">Trial OTP:</span>
            <span className="text-lg font-mono tracking-widest bg-neutral-50 px-2 py-1 rounded border">{res.data.devOtp}</span>
          </div>
        ), { duration: 10000, icon: "🛡️" });
      }
      toast.success(res.data.message || "OTP sent");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const completeRegistration = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const payload = { tempToken: tempTokenRef.current, mobile, otp: fullOtp };
      if (coords) { payload.latitude = coords.latitude; payload.longitude = coords.longitude; }
      const res = await api.post("/api/auth/register/complete", payload);
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Account created! Welcome, " + (res.data.user.name || "Citizen") + "!");
      router.push("/complaint");
    } catch (err) { toast.error(err.response?.data?.error || "Registration failed"); }
    finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN FLOW (returning users)
  // ═══════════════════════════════════════════════════════════════════════════

  const sendLoginPhoneOtp = async () => {
    if (mobile.length !== 10) return toast.error("Enter valid 10-digit mobile number");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/phone/send-otp", { mobile });
      setMasked(`+91 ${mobile.slice(0, 2)}******${mobile.slice(-2)}`);
      setStep("otp");
      setOtpCells(["", "", "", "", "", ""]);
      if (res.data.devOtp) {
        toast((t_inner) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">Trial OTP:</span>
            <span className="text-lg font-mono tracking-widest bg-neutral-50 px-2 py-1 rounded border">{res.data.devOtp}</span>
          </div>
        ), { duration: 10000, icon: "🛡️" });
      }
      toast.success(res.data.message || "OTP sent");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const loginWithPhone = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/phone/login", { mobile, otp: fullOtp });
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Welcome back, " + (res.data.user.name || "Citizen") + "!");
      router.push("/complaint");
    } catch (err) { toast.error(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  const continueAnonymous = async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    try {
      const res = await api.post("/api/auth/anonymous");
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Entering as Anonymous"); router.push("/complaint");
    } catch { toast.error("Failed to create anonymous session"); }
    finally { setLoading(false); }
  };

  // ─── Step labels for header ───
  const stepLabel = () => {
    if (tab === "register") {
      if (step === "aadhaar") return { title: "Create Account", sub: "Verify your identity with Aadhaar" };
      if (step === "aadhaar-otp") return { title: "Verify Aadhaar OTP", sub: `OTP sent to your Aadhaar-linked number (${masked})` };
      if (step === "phone") return { title: "Link Your Phone", sub: kycName ? `Welcome, ${kycName}! One last step.` : "Register your mobile number" };
      if (step === "phone-otp") return { title: "Verify Phone OTP", sub: `OTP sent to ${masked}` };
    }
    if (step === "phone") return { title: "Welcome Back", sub: "Enter your registered mobile number" };
    if (step === "otp") return { title: "Verify OTP", sub: `OTP sent to ${masked}` };
    return { title: "", sub: "" };
  };
  const { title, sub } = stepLabel();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-neutral-900 rounded-[20px] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-black/10">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-[22px] font-extrabold text-neutral-900 mb-1">{title}</h1>
          <p className="text-sm text-neutral-500 px-4">{sub}</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-100 rounded-[28px] p-6 sm:p-10 shadow-2xl shadow-black/5 flex flex-col mx-2 sm:mx-0">

          {/* Tab switcher — only show on first step of each tab */}
          {(step === "aadhaar" || step === "phone") && (
            <div className="flex bg-neutral-50 p-1.5 rounded-2xl mb-8">
              {[["register", "New Account"], ["login", "Login"]].map(([type, label]) => (
                <button key={type} onClick={() => switchTab(type)}
                  className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-xl transition-all ${tab === type ? "bg-white text-neutral-900 shadow-lg shadow-black/5 border border-neutral-100" : "text-neutral-400 hover:text-neutral-600"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── REGISTER: step = "aadhaar" ── */}
          {tab === "register" && step === "aadhaar" && (
            <div className="flex flex-col">
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">Aadhaar Number</label>
              <input type="text"
                className={`${INPUT} text-center tracking-[0.15em] text-xl font-mono mb-5`}
                value={aadhaar} onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                placeholder="XXXX-XXXX-XXXX" maxLength={14}
              />
              <TermsCheck id="terms-register" checked={acceptedTerms} onChange={setAcceptedTerms} t={t} />
              <button className={BTN_PRIMARY} onClick={sendAadhaarOtp}
                disabled={loading || rawAadhaar().length !== 12 || !acceptedTerms}>
                {loading ? "Sending OTP…" : "Get Aadhaar OTP"}
              </button>
              <div className="mt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-neutral-100" />
                  <span className="text-[10px] font-bold tracking-[2px] text-neutral-300 uppercase">OR</span>
                  <div className="flex-1 h-px bg-neutral-100" />
                </div>
                <button className={BTN_GHOST} onClick={continueAnonymous} disabled={!acceptedTerms} style={{ opacity: !acceptedTerms ? 0.5 : 1 }}>
                  {t("login.fileAnonymously")}
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTER: step = "aadhaar-otp" ── */}
          {tab === "register" && step === "aadhaar-otp" && (
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 text-center mb-6">Enter OTP</label>
              <OtpGrid cells={otpCells} onChange={handleOtpCell} onKeyDown={handleOtpKeyDown} />
              <button className={BTN_PRIMARY} onClick={verifyAadhaarOtp}
                disabled={loading || otpCells.join("").length !== 6}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>
              <button className={`${BTN_GHOST} mt-3`} onClick={() => setStep("aadhaar")}>← Back</button>
            </div>
          )}

          {/* ── REGISTER: step = "phone" ── */}
          {tab === "register" && step === "phone" && (
            <div className="flex flex-col">
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">Mobile Number</label>
              <div className="flex gap-2 mb-5">
                <div className="px-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center text-sm font-bold text-neutral-600">+91</div>
                <input type="text" className={`${INPUT} flex-1`} value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number" />
              </div>

              {/* Location capture */}
              <div className="mb-5 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-neutral-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Your Location</span>
                  </div>
                  <button type="button" onClick={grabLocation} disabled={locationLoading}
                    className="text-[11px] font-bold text-neutral-900 border border-neutral-200 px-3 py-1 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                    {locationLoading ? "Getting…" : coords ? "Refresh" : "Detect"}
                  </button>
                </div>
                {coords ? (
                  <p className="text-xs font-mono text-neutral-500">{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</p>
                ) : (
                  <p className="text-xs text-neutral-400">Optional — allows nearest police station assignment.</p>
                )}
              </div>

              <button className={BTN_PRIMARY} onClick={sendRegisterPhoneOtp}
                disabled={loading || mobile.length !== 10}>
                {loading ? "Sending OTP…" : "Send Verification OTP"}
              </button>
            </div>
          )}

          {/* ── REGISTER: step = "phone-otp" ── */}
          {tab === "register" && step === "phone-otp" && (
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 text-center mb-6">Enter OTP</label>
              <OtpGrid cells={otpCells} onChange={handleOtpCell} onKeyDown={handleOtpKeyDown} />
              <button className={BTN_PRIMARY} onClick={completeRegistration}
                disabled={loading || otpCells.join("").length !== 6}>
                {loading ? "Creating Account…" : "Complete Registration →"}
              </button>
              <button className={`${BTN_GHOST} mt-3`} onClick={() => { setStep("phone"); setOtpCells(["", "", "", "", "", ""]); }}>← Back</button>
            </div>
          )}

          {/* ── LOGIN: step = "phone" ── */}
          {tab === "login" && step === "phone" && (
            <div className="flex flex-col">
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">Registered Mobile</label>
              <div className="flex gap-2 mb-5">
                <div className="px-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center text-sm font-bold text-neutral-600">+91</div>
                <input type="text" className={`${INPUT} flex-1`} value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number" />
              </div>
              <TermsCheck id="terms-login" checked={acceptedTerms} onChange={setAcceptedTerms} t={t} />
              <button className={BTN_PRIMARY} onClick={sendLoginPhoneOtp}
                disabled={loading || mobile.length !== 10 || !acceptedTerms}>
                {loading ? "Sending OTP…" : "Get Login OTP"}
              </button>
              <div className="mt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-neutral-100" />
                  <span className="text-[10px] font-bold tracking-[2px] text-neutral-300 uppercase">OR</span>
                  <div className="flex-1 h-px bg-neutral-100" />
                </div>
                <button className={BTN_GHOST} onClick={continueAnonymous} disabled={!acceptedTerms} style={{ opacity: !acceptedTerms ? 0.5 : 1 }}>
                  {t("login.fileAnonymously")}
                </button>
              </div>
            </div>
          )}

          {/* ── LOGIN: step = "otp" ── */}
          {tab === "login" && step === "otp" && (
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 text-center mb-6">Enter OTP</label>
              <OtpGrid cells={otpCells} onChange={handleOtpCell} onKeyDown={handleOtpKeyDown} />
              <button className={BTN_PRIMARY} onClick={loginWithPhone}
                disabled={loading || otpCells.join("").length !== 6}>
                {loading ? "Logging in…" : "Login →"}
              </button>
              <button className={`${BTN_GHOST} mt-3`} onClick={() => setStep("phone")}>← Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
