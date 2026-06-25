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
      
      <div className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[#0D1B4A]">
        {/* ── Left Side: Login Form (1/2 width on desktop) ── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 relative z-10">
          
          {/* Subtle background graphics for left side */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full border border-white"
            />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full border border-red-500"
            />
          </div>
          
          <div className="w-full max-w-[400px] space-y-8">
            {/* Header for mobile - only shows logo/brand on small screens where right panel is hidden */}
            <div className="text-center md:hidden space-y-4">
              <div className="inline-flex justify-center h-16 w-16 rounded-full bg-white p-2 shadow-lg">
                <img src="/logo.png" alt="Hotel Devang Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-widest text-white" style={{ fontFamily: "Georgia, serif" }}>
                  HOTEL DEVANG
                </h1>
                <p className="text-[10px] uppercase tracking-wider text-red-500 mt-1 font-bold" style={{ letterSpacing: "0.2em" }}>
                  Since 1998
                </p>
              </div>
            </div>

            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold tracking-wider text-white" style={{ fontFamily: "Georgia, serif" }}>
                Admin Portal
              </h2>
              <p className="text-xs text-slate-400">
                Please authenticate to access the inventory dashboard.
              </p>
            </div>

            {error && (
              <div 
                className="rounded-xl p-3.5 text-xs text-center border"
                style={{ 
                  background: "rgba(220,38,38,0.06)",
                  borderColor: "rgba(220,38,38,0.25)",
                  color: "#FCA5A5"
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username */}
              <div className="relative">
                <input
                  type="text"
                  id="username-input"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=" "
                  className="peer w-full rounded-xl px-4 pt-5 pb-2.5 text-sm text-white outline-none transition-all duration-200"
                  style={{ 
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.5)";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.background = "rgba(255,255,255,0.04)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <label 
                  htmlFor="username-input"
                  className="absolute left-3 -top-2 text-[10px] text-blue-200 bg-[#0D1B4A] px-1.5 font-bold uppercase tracking-widest transition-all duration-200 pointer-events-none
                             peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-4 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
                             peer-focus:-top-2 peer-focus:left-3 peer-focus:text-[10px] peer-focus:text-blue-300 peer-focus:bg-[#0D1B4A] peer-focus:px-1.5 peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest"
                  style={{ letterSpacing: "0.15em" }}
                >
                  Username
                </label>
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full rounded-xl pl-4 pr-11 pt-5 pb-2.5 text-sm text-white outline-none transition-all duration-200"
                  style={{ 
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.5)";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.background = "rgba(255,255,255,0.04)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <label 
                  htmlFor="password-input"
                  className="absolute left-3 -top-2 text-[10px] text-blue-200 bg-[#0D1B4A] px-1.5 font-bold uppercase tracking-widest transition-all duration-200 pointer-events-none
                             peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-4 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
                             peer-focus:-top-2 peer-focus:left-3 peer-focus:text-[10px] peer-focus:text-blue-300 peer-focus:bg-[#0D1B4A] peer-focus:px-1.5 peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest"
                  style={{ letterSpacing: "0.15em" }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-xs font-bold tracking-widest uppercase transition-all duration-250 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                style={{ 
                  background: loading 
                    ? "rgba(255,255,255,0.1)" 
                    : "linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)",
                  color: "white",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(220,38,38,0.25)",
                  letterSpacing: "0.15em"
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Access Dashboard"
                )}
              </button>
            </form>

            <div className="pt-6 border-t border-white/5 flex justify-between items-center text-[9px] tracking-widest text-slate-500">
              <span>SECURE ACCESS</span>
              <span>DWARKA, GUJARAT</span>
            </div>
          </div>

        </div>

        {/* ── Right Side: Banner (Hidden on mobile) ── */}
        <div className="hidden md:flex md:w-[45%] lg:w-[50%] xl:w-[55%] relative overflow-hidden items-center justify-center p-12 text-center select-none">
          {/* Background Image */}
          <img 
            src="/hero-login.jpeg" 
            alt="Hotel Devang Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark Blue Overlay */}
          <div 
            className="absolute inset-0"
            style={{ 
              background: "linear-gradient(135deg, rgba(13, 27, 74, 0.88) 0%, rgba(8, 15, 45, 0.94) 100%)",
              mixBlendMode: "multiply"
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-b from-[#0D1B4A]/30 via-transparent to-[#080f2d]/90"
          />

          {/* Banner Contents */}
          <div className="relative z-10 space-y-6 max-w-sm animate-fadeIn">
            {/* Logo */}
            <div className="relative mb-6 inline-flex">
              {/* Outer decorative glowing ring */}
              <div className="absolute -inset-4 rounded-full bg-blue-600/10 blur-xl"></div>
              {/* Brand logo container */}
              <div 
                className="relative h-28 w-28 rounded-full bg-white p-3 flex items-center justify-center shadow-[0_12px_36px_rgba(0,0,0,0.3)] border border-white/10"
              >
                <img 
                  src="/logo.png" 
                  alt="Hotel Devang Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* Brand Title */}
            <div className="space-y-3">
              <h2 
                className="text-3xl lg:text-4xl font-bold tracking-widest text-white uppercase drop-shadow-md"
                style={{ fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
              >
                HOTEL DEVANG
              </h2>
              <div className="flex items-center justify-center gap-3 w-28 mx-auto opacity-70">
                <div className="h-px bg-white/20 flex-1" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
                <div className="h-px bg-white/20 flex-1" />
              </div>
              <p 
                className="text-xs uppercase tracking-widest text-[#EF4444] font-bold"
                style={{ letterSpacing: "0.3em" }}
              >
                Since 1998
              </p>
            </div>
            
            <p className="text-[11px] text-slate-300 tracking-wide font-medium leading-relaxed pt-4 max-w-[280px] mx-auto opacity-75">
              Welcome to the administrative inventory control desk.
            </p>
          </div>

          {/* Bottom small ornament info */}
          <div className="absolute bottom-6 left-6 right-6 text-[9px] tracking-widest text-white/30 uppercase">
            © {new Date().getFullYear()} Hotel Devang Dwarka
          </div>
        </div>
      </div>
    </>
  );
}
