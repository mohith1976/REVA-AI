'use client';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { Shield } from "lucide-react";

const termsPdf = "/terms.pdf";

const LANGUAGES = [
  { code: "en", native: "English" }, { code: "hi", native: "हिंदी" },
  { code: "ta", native: "தமிழ்" }, { code: "te", native: "తెలుగు" },
  { code: "kn", native: "ಕನ್ನಡ" }, { code: "mr", native: "मराठी" },
  { code: "bn", native: "বাংলা" }, { code: "gu", native: "ગુજરાતી" },
  { code: "pa", native: "ਪੰਜਾਬੀ" }, { code: "or", native: "ଓଡ଼ିଆ" },
  { code: "ml", native: "മലയാളം" },
];

const INPUT = "w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 text-sm placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition-colors";
const BTN_PRIMARY = "w-full h-[50px] bg-neutral-900 text-white font-bold text-sm rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm";
const BTN_GHOST = "w-full py-3 text-sm text-neutral-500 font-semibold hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors";

export default function LoginPage() {
  const [loginType, setLoginType] = useState("aadhaar");
  const [step, setStep] = useState("form");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [mobile, setMobile] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [masked, setMasked] = useState("");
  const [otpCells, setOtpCells] = useState(["", "", "", "", "", ""]);
  const [verifiedDetails, setVerifiedDetails] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const router = useRouter();
  const auth = useAuth();
  const loginCitizen = auth?.loginCitizen;
  const updateUser = auth?.updateUser;
  const user = auth?.user;
  const authLoading = auth?.loading;
  const { t, i18n } = useTranslation();

  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const pendingSessionRef = useRef(null);

  useEffect(() => {
    if (!authLoading && user) router.push("/complaint", { replace: true });
  }, [user, authLoading, router]);

  if (authLoading) return null;

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

  const sendAadhaarOtp = async () => {
    const digits = rawAadhaar();
    if (digits.length !== 12) { toast.error("Enter valid 12-digit Aadhaar"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/send-otp", { aadhaar: digits, language });
      setMasked(res.data.aadhaarMasked); setStep("otp"); setOtpCells(["", "", "", "", "", ""]);
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send Aadhaar OTP"); }
    finally { setLoading(false); }
  };

  const verifyAadhaarOtp = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", { aadhaar: rawAadhaar(), otp: fullOtp, language });
      loginCitizen(res.data.user, res.data.accessToken);
      if (!res.data.user.name) {
        pendingSessionRef.current = { user: res.data.user, token: res.data.accessToken };
        setStep("name");
      } else {
        toast.success("Identity Verified Successfully"); router.push("/complaint");
      }
    } catch (err) { toast.error(err.response?.data?.error || "OTP Verification Failed"); }
    finally { setLoading(false); }
  };

  const getPanDetails = async () => {
    if (pan.length !== 10) return toast.error("Enter valid 10-character PAN");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/pan/details", { pan });
      setVerifiedDetails(res.data); setStep("pan_details");
    } catch (err) { toast.error(err.response?.data?.error || "PAN verification failed"); }
    finally { setLoading(false); }
  };

  const sendMobileOtp = async (forPan = false) => {
    if (mobile.length !== 10) return toast.error("Enter valid 10-digit mobile number");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/send-mobile-otp", { mobile });
      setStep("otp"); setMasked(`+91 ${mobile.slice(0, 2)}******${mobile.slice(-2)}`);
      toast.success(res.data.message || "OTP sent to your mobile");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const loginWithPan = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/pan/login", { pan, mobile, otp: fullOtp, name: verifiedDetails?.name, language });
      loginCitizen(res.data.user, res.data.accessToken);
      if (!res.data.user.name) {
        pendingSessionRef.current = { user: res.data.user, token: res.data.accessToken };
        setStep("name");
      } else {
        toast.success("Login Successful"); router.push("/complaint");
      }
    } catch (err) { toast.error(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  const loginWithMobile = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/mobile/login", { mobile, otp: fullOtp, language });
      loginCitizen(res.data.user, res.data.accessToken);
      if (!res.data.user.name) {
        pendingSessionRef.current = { user: res.data.user, token: res.data.accessToken };
        setStep("name");
      } else {
        toast.success("Login Successful"); router.push("/complaint");
      }
    } catch (err) { toast.error(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return toast.error("Please enter your name");
    setNameSaving(true);
    try {
      const res = await api.patch("/api/users/profile", { name: nameInput.trim() });
      updateUser({ name: res.data.user.name });
      toast.success("Welcome, " + res.data.user.name + "!");
      router.push("/complaint");
    } catch (err) {
      // Even if DB save fails, continue — name will be asked again next visit
      toast.error("Couldn't save name, you can update it later.");
      router.push("/complaint");
    } finally {
      setNameSaving(false);
    }
  };

  const continueAnonymous = async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/auth/anonymous", { language });
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Entering as Anonymous"); router.push("/complaint");
    } catch { toast.error("Failed to create anonymous session"); }
    finally { setLoading(false); }
  };

  // ── Terms checkbox helper ──
  const TermsCheck = ({ id }) => (
    <div className="flex gap-3 items-start mb-5">
      <input type="checkbox" id={id} checked={acceptedTerms}
        onChange={(e) => setAcceptedTerms(e.target.checked)}
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

  // ── Mobile prefix input ──
  const MobileInput = () => (
    <div className="flex gap-2 mb-5">
      <div className="px-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center text-sm font-bold text-neutral-600">+91</div>
      <input type="text" className={`${INPUT} flex-1`} value={mobile}
        onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder="Enter 10-digit mobile" />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-8 h-auto sm:h-[60px] flex flex-col justify-end">
          <h1 className="text-[24px] sm:text-[22px] font-extrabold text-neutral-900 mb-1">
            {step === "otp" ? t("login.verifyOtp") : t("login.signIn")}
          </h1>
          <p className="text-sm text-neutral-500 h-auto sm:h-[20px] px-4">
            {step === "form" ? t("login.subheading")
              : step === "pan_details" ? "Confirm your identity details"
                : `${t("login.otpSentTo")} ${masked}`}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-100 rounded-[28px] p-6 sm:p-10 min-h-[440px] shadow-2xl shadow-black/5 flex flex-col mx-2 sm:mx-0">

          {/* ── FORM STEP ── */}
          {step === "form" && (
            <div className="flex-1 flex flex-col">
              {/* Tab switcher */}
              <div className="flex bg-neutral-50 p-1.5 rounded-2xl mb-8 flex-shrink-0">
                {[["aadhaar", t("login.aadhaarTab")], ["pan", t("login.panTab")], ["mobile", t("login.mobileTab")]].map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => { setLoginType(type); setAcceptedTerms(false); }}
                    className={`flex-1 py-2 text-[11px] sm:text-[12px] font-bold rounded-xl transition-all ${loginType === type ? "bg-white text-neutral-900 shadow-lg shadow-black/5 border border-neutral-100" : "text-neutral-400 hover:text-neutral-600"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <div className="flex-1">
                {/* Aadhaar */}
                {loginType === "aadhaar" && (
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">Aadhaar Number</label>
                    <input type="text" className={`${INPUT} text-center tracking-[0.15em] text-xl font-mono mb-5 border-neutral-200 focus:border-neutral-900 bg-neutral-50/30`}
                      value={aadhaar} onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                      placeholder="XXXX-XXXX-XXXX" maxLength={14} />
                    <TermsCheck id="acceptedTermsAadhaar" />
                    <button className={BTN_PRIMARY} onClick={sendAadhaarOtp}
                      disabled={loading || rawAadhaar().length !== 12 || !acceptedTerms}>
                      {loading ? t("login.requestingOtp") : t("login.getAadhaarOtp")}
                    </button>
                  </div>
                )}

                {/* PAN */}
                {loginType === "pan" && (
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">PAN Number</label>
                    <input type="text" className={`${INPUT} text-center tracking-[0.2em] text-xl font-mono uppercase mb-5 border-neutral-200 focus:border-neutral-900 bg-neutral-50/30`}
                      value={pan} onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F" maxLength={10} />
                    <TermsCheck id="acceptedTermsPan" />
                    <button className={BTN_PRIMARY} onClick={getPanDetails}
                      disabled={loading || pan.length !== 10 || !acceptedTerms}>
                      {loading ? t("login.verifyingRecord") : t("login.verifyPan")}
                    </button>
                  </div>
                )}

                {/* Mobile */}
                {loginType === "mobile" && (
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">Mobile Number</label>
                    <MobileInput />
                    <TermsCheck id="acceptedTermsMobile" />
                    <button className={BTN_PRIMARY} onClick={() => sendMobileOtp(false)}
                      disabled={loading || mobile.length !== 10 || !acceptedTerms}>
                      {loading ? t("login.loading") : t("login.getMobileOtp")}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 flex-shrink-0">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 h-px bg-neutral-100" />
                  <span className="text-[10px] font-bold tracking-[2px] text-neutral-300 uppercase">OR</span>
                  <div className="flex-1 h-px bg-neutral-100" />
                </div>
                <button className={BTN_GHOST} onClick={continueAnonymous}
                  disabled={!acceptedTerms} style={{ opacity: !acceptedTerms ? 0.5 : 1 }}>
                  {t("login.fileAnonymously")}
                </button>
              </div>
            </div>
          )}

          {/* ── PAN DETAILS STEP ── */}
          {step === "pan_details" && verifiedDetails && (
            <div className="animate-fade-in">
              <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 mb-6">
                <div className="text-[10px] font-bold uppercase text-neutral-400 mb-4 tracking-wider">Verified Identity Found</div>
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-tight">Full Name</div>
                  <div className="font-bold text-neutral-900 text-lg">{verifiedDetails.name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-tight">Relative Name</div>
                  <div className="font-semibold text-neutral-900">{verifiedDetails.fathersName || "—"}</div>
                </div>
              </div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2 px-1">Verify your Contact Number</label>
              <MobileInput />
              <button className={BTN_PRIMARY} onClick={() => sendMobileOtp(true)} disabled={loading || mobile.length !== 10}>
                {loading ? t("login.sendingVerification") : t("login.verifyMobile")}
              </button>
              <button className={`${BTN_GHOST} mt-3`} onClick={() => setStep("form")}>
                {t("login.switchAccount")}
              </button>
            </div>
          )}

          {/* ── OTP STEP ── */}
          {step === "otp" && (
            <div className="animate-fade-in">
              <label className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 text-center mb-6">{t("login.enterOtp")}</label>
              <div className="grid grid-cols-6 gap-2 sm:gap-3 justify-center mb-8">
                {otpCells.map((cell, i) => (
                  <input
                    key={i}
                    id={`otp-cell-${i}`}
                    type="text"
                    className={`w-full aspect-square text-center text-xl sm:text-2xl font-bold rounded-2xl border outline-none transition-all ${cell ? "bg-neutral-900 border-neutral-900 text-white" : "bg-neutral-50/50 border-neutral-100 text-neutral-900"
                      } focus:border-neutral-900 shadow-sm`}
                    value={cell}
                    onChange={(e) => handleOtpCell(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
              <button className={BTN_PRIMARY} onClick={loginType === "aadhaar" ? verifyAadhaarOtp : loginType === "pan" ? loginWithPan : loginWithMobile}
                disabled={loading || otpCells.join("").length !== 6}>
                {loading ? t("login.verifying") : t("login.verifyOtp")}
              </button>
              <button className={`${BTN_GHOST} mt-3`} onClick={() => setStep("form")}>← Back</button>
            </div>
          )}

          {/* ── NAME STEP ── */}
          {step === "name" && (
            <div className="animate-fade-in flex flex-col gap-4">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-neutral-900 rounded-[20px] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-black/10">
                  <Shield size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-extrabold text-neutral-900 mb-1">One last thing!</h2>
                <p className="text-sm text-neutral-500 leading-relaxed">What should we call you during your complaint session?</p>
              </div>
              <input
                type="text"
                className={INPUT}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                placeholder="Your full name"
                autoFocus
              />
              <button
                className={BTN_PRIMARY}
                onClick={handleSaveName}
                disabled={nameSaving || !nameInput.trim()}
              >
                {nameSaving ? "Saving…" : "Continue →"}
              </button>
              <button
                className={BTN_GHOST}
                onClick={() => router.push("/complaint")}
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
