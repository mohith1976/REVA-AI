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
  const { loginPolice } = useAuth();
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Glow orb */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)]" />

      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(59,130,246,0.3)]">
            <Shield size={32} color="white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Police Station Portal</h1>
          <p className="text-sm text-slate-500">Restricted access — Authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-blue-500/20 rounded-2xl p-8">
          {/* Security notice */}
          <div className="flex items-center gap-2 bg-blue-500/8 border border-blue-500/15 rounded-lg px-3.5 py-2.5 mb-6">
            <Lock size={13} className="text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-500">Secured by JWT · All access logged and audited</span>
          </div>

          <div className="mb-5">
            <label htmlFor="police-email" className="block text-sm font-medium text-slate-500 mb-2">Official Email</label>
            <input
              id="police-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="officer@police.gov.in"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="police-password" className="block text-sm font-medium text-slate-500 mb-2">Password</label>
            <input
              id="police-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
          </div>

          <button
            id="police-login-btn"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In to Dashboard →"}
          </button>
        </div>

        <p className="text-center mt-5 text-xs text-slate-400">
          Citizen?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            File a complaint →
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-4 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400">
          <strong>Demo:</strong> admin@station.gov.in / Admin@123
        </div>
      </div>
    </div>
  );
}
