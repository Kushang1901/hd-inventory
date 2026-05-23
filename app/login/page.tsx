"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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
    <div 
      className="flex min-h-screen items-center justify-center p-4 bg-radial"
      style={{
        backgroundImage: "radial-gradient(circle at center, #2e0000 0%, #0c0000 100%)",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Dynamic Background Particles Effect using CSS animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute w-[2px] h-[2px] bg-yellow-400 rounded-full top-[10%] left-[20%] animate-pulse"></div>
        <div className="absolute w-[3px] h-[3px] bg-yellow-400 rounded-full top-[40%] left-[80%] animate-pulse delay-1000"></div>
        <div className="absolute w-[2px] h-[2px] bg-yellow-400 rounded-full top-[70%] left-[15%] animate-pulse delay-2000"></div>
        <div className="absolute w-[4px] h-[4px] bg-yellow-400 rounded-full top-[85%] left-[65%] animate-pulse delay-1500"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Glowing aura effect */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-800 via-amber-600 to-red-900 opacity-20 blur-xl"></div>
        
        {/* Core Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 text-white backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 mb-4 shadow-[0_0_15px_rgba(202,160,53,0.1)]">
              <span className="text-3xl text-amber-500 font-serif">ॐ</span>
            </div>
            <h1 className="text-2xl font-serif tracking-wide text-amber-400">HOTEL DEVANG</h1>
            <p className="text-xs tracking-widest text-zinc-500 uppercase mt-1">Admin Inventory Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center animate-shake">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500/80 mb-2">
                Administrator User
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-300 focus:border-amber-500/50 focus:bg-zinc-950 focus:shadow-[0_0_10px_rgba(202,160,53,0.1)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-500/80 mb-2">
                Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-300 focus:border-amber-500/50 focus:bg-zinc-950 focus:shadow-[0_0_10px_rgba(202,160,53,0.1)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-red-800 to-amber-600 hover:from-red-700 hover:to-amber-500 text-white font-medium py-3 text-sm tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-lg hover:shadow-red-950/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </div>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center mt-8 pt-6 border-t border-white/5 text-[10px] text-zinc-600 tracking-wider">
            SECURE ACCESS ONLY &bull; IP LOGGED
          </div>
        </div>
      </div>
    </div>
  );
}
