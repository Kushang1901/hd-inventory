"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Script from "next/script";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let token = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          token = await new Promise<string>((resolve, reject) => {
            (window as any).grecaptcha.ready(() => {
              (window as any).grecaptcha
                .execute("6LffN_osAAAAAOHid-cO91BJ-0a4KPANDgW5HEWD", { action: "login" })
                .then((t: string) => resolve(t))
                .catch((err: any) => reject(err));
            });
          });
        } catch (err) {
          console.error("reCAPTCHA execution failed:", err);
          setError("reCAPTCHA verification failed. Please try again.");
          setLoading(false);
          return;
        }
      }

      if (!token) {
        setError("reCAPTCHA is still initializing. Please try again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, recaptchaToken: token }),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Invalid username or password");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js?render=6LffN_osAAAAAOHid-cO91BJ-0a4KPANDgW5HEWD"
        strategy="afterInteractive"
      />
      
      {/* Full-page background: deep royal blue gradient matching logo */}
      <div 
        className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D1B4A 0%, #1A2F72 40%, #132254 70%, #0D1B4A 100%)" }}
      >
        {/* ── Decorative mandala/lotus petal SVG background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          {/* Concentric rings inspired by the logo flower petals */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[900px] w-[900px] rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.3)" }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full"
            style={{ border: "1px solid rgba(220,38,38,0.4)" }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.3)" }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full"
            style={{ border: "1px solid rgba(220,38,38,0.4)" }}
          />
        </div>

        {/* Floating subtle orbs */}
        <div 
          className="absolute top-[15%] left-[10%] h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{ background: "#DC2626" }}
        />
        <div 
          className="absolute bottom-[15%] right-[10%] h-64 w-64 rounded-full blur-3xl opacity-15"
          style={{ background: "#2563EB" }}
        />

        {/* ── Login Card ── */}
        <div className="w-full max-w-[420px] relative z-10">
          
          {/* Outer glow ring */}
          <div 
            className="absolute -inset-1 rounded-3xl blur-xl opacity-40"
            style={{ background: "linear-gradient(135deg, #DC2626, #1D4ED8)" }}
          />
          
          {/* Card */}
          <div 
            className="relative overflow-hidden rounded-3xl text-white"
            style={{ 
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset"
            }}
          >
            {/* Top accent gradient bar */}
            <div 
              className="h-1 w-full"
              style={{ background: "linear-gradient(90deg, #DC2626 0%, #1D4ED8 50%, #DC2626 100%)" }}
            />

            <div className="p-8">
              {/* ── Header / Logo ── */}
              <div className="text-center mb-8">
                {/* Mandala-inspired logo mark */}
                <div className="inline-flex relative mb-5">
                  {/* Outer petals ring */}
                  <div 
                    className="h-20 w-20 rounded-full flex items-center justify-center"
                    style={{ 
                      background: "linear-gradient(135deg, rgba(220,38,38,0.2), rgba(29,78,216,0.2))",
                      border: "1px solid rgba(255,255,255,0.15)",
                      boxShadow: "0 0 30px rgba(220,38,38,0.2), inset 0 0 20px rgba(29,78,216,0.1)"
                    }}
                  >
                    {/* Inner petal ring */}
                    <div 
                      className="h-14 w-14 rounded-full flex items-center justify-center"
                      style={{ 
                        background: "linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)",
                        boxShadow: "0 4px 16px rgba(220,38,38,0.4)"
                      }}
                    >
                      <span 
                        className="text-white font-bold text-xl"
                        style={{ fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}
                      >
                        HD
                      </span>
                    </div>
                  </div>
                </div>
                
                <h1 
                  className="text-2xl font-bold tracking-widest text-white"
                  style={{ fontFamily: "Georgia, serif", letterSpacing: "0.15em" }}
                >
                  HOTEL DEVANG
                </h1>
                <p 
                  className="text-xs tracking-widest uppercase mt-2 font-medium"
                  style={{ color: "rgba(147,197,253,0.8)", letterSpacing: "0.25em" }}
                >
                  Admin Inventory Dashboard
                </p>
                
                {/* Divider */}
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-1 w-1 rounded-full" style={{ background: "#DC2626" }} />
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
              </div>

              {/* ── Login Form ── */}
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div 
                    className="rounded-xl p-3.5 text-sm text-center"
                    style={{ 
                      background: "rgba(220,38,38,0.12)",
                      border: "1px solid rgba(220,38,38,0.3)",
                      color: "#FCA5A5"
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Username */}
                <div>
                  <label 
                    className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "rgba(147,197,253,0.9)", letterSpacing: "0.2em" }}
                  >
                    Administrator User
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-300"
                    style={{ 
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "1px solid rgba(29,78,216,0.6)";
                      e.target.style.background = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                      e.target.style.background = "rgba(255,255,255,0.05)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label 
                    className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: "rgba(147,197,253,0.9)", letterSpacing: "0.2em" }}
                  >
                    Security Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-300"
                      style={{ 
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid rgba(29,78,216,0.6)";
                        e.target.style.background = "rgba(255,255,255,0.08)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.15)";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                        e.target.style.background = "rgba(255,255,255,0.05)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer transition-colors"
                      style={{ color: "rgba(147,197,253,0.6)" }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3.5 text-sm font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                  style={{ 
                    background: loading 
                      ? "rgba(255,255,255,0.1)" 
                      : "linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)",
                    color: "white",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(220,38,38,0.3), 0 2px 8px rgba(30,58,138,0.3)",
                    letterSpacing: "0.2em"
                  }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    "Access Dashboard"
                  )}
                </button>
              </form>

              {/* Footer */}
              <div 
                className="text-center mt-7 pt-5 text-[10px] tracking-widest"
                style={{ 
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(148,163,184,0.5)"
                }}
              >
                SECURE ACCESS ONLY &bull; IP LOGGED &bull; DWARKA, GUJARAT
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
