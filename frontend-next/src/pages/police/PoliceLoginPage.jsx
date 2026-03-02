'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { Shield, Lock } from "lucide-react";

export default function PoliceLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const loginPolice = auth?.loginPolice;
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Email and password required"); return; }
    setLoading(true);
    try {
      const res = await api.post("/api/police/auth/login", { email, password });
      loginPolice(res.data.officer, res.data.accessToken);
      toast.success(`Welcome, ${res.data.officer.name}`);
      router.push("/police/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-neutral-900 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black/10 scale-110">
            <Shield size={36} color="white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">REVA Police Portal</h1>
          <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">Authorized Access Only</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-neutral-200/60 rounded-[32px] p-10 shadow-xl shadow-black/5">
          {/* Security notice */}
          <div className="flex items-center gap-3 bg-neutral-900 rounded-2xl px-4 py-3 mb-8 shadow-lg shadow-black/10">
            <Lock size={14} className="text-white opacity-60 flex-shrink-0" />
            <span className="text-[11px] font-bold text-white tracking-wide">SECURED BY REVA QUANTUM ENCRYPTION</span>
          </div>

          <div className="mb-6">
            <label htmlFor="police-email" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">Official Identifier</label>
            <input
              id="police-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="officer_id@reva.gov.in"
              className="w-full px-5 py-4 bg-neutral-50/50 border border-neutral-200/80 rounded-[20px] text-neutral-900 text-[14px] font-medium placeholder:text-neutral-300 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 transition-all"
            />
          </div>

          <div className="mb-8">
            <label htmlFor="police-password" className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">Security Key</label>
            <input
              id="police-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-neutral-50/50 border border-neutral-200/80 rounded-[20px] text-neutral-900 text-[14px] font-medium placeholder:text-neutral-300 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 transition-all"
            />
          </div>

          <button
            id="police-login-btn"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-neutral-900 text-white font-bold text-[14px] rounded-[20px] hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10 active:scale-[0.98] cursor-pointer border-none"
          >
            {loading ? "Authenticating..." : "Establish Secure Session →"}
          </button>
        </div>

        <p className="text-center mt-8 text-[13px] font-medium text-neutral-400">
          Citizen?{" "}
          <Link href="/login" className="text-neutral-900 font-bold hover:underline transition-all no-underline">
            File a report
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-8 bg-neutral-100/50 border border-neutral-200/60 rounded-2xl px-5 py-4 text-[11px] font-medium text-neutral-400 text-center leading-relaxed">
          <span className="font-bold text-neutral-500 uppercase tracking-widest block mb-1">Sandbox Environment</span>
          admin@station.gov.in / Admin@123
        </div>
      </div>
    </div>
  );
}
