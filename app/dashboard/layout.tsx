"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Home, 
  CalendarDays, 
  CalendarOff, 
  LogOut, 
  Menu, 
  X,
  Calendar,
  Coins,
  Bot,
  ShieldOff
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeVal, setTimeVal] = useState("");
  const [ampmVal, setAmpmVal] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [showTooltip, setShowTooltip] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const timeStr = timeFormatter.format(now);
      const cleanTimeStr = timeStr.replace(/\u202f/g, " ");
      const parts = cleanTimeStr.split(/\s+/);
      if (parts.length === 2) {
        setTimeVal(parts[0]);
        setAmpmVal(parts[1]);
      } else {
        setTimeVal(timeStr);
        setAmpmVal("");
      }

      const dateFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      setDateVal(dateFormatter.format(now));
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check");
        if (res.ok) {
          setAuthenticated(true);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      alert("Logout failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div 
        className="flex min-h-screen items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0D1B4A 0%, #1E3A8A 50%, #132254 100%)" }}
      >
        <div className="text-center">
          {/* Logo mandala spinner */}
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div 
              className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: "#DC2626", borderRightColor: "#2563EB" }}
            />
            <div 
              className="absolute inset-2 rounded-full border-2 border-transparent animate-spin"
              style={{ borderBottomColor: "#DC2626", animationDirection: "reverse", animationDuration: "0.8s" }}
            />
            <div 
              className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg"
              style={{ fontFamily: "serif" }}
            >
              HD
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#93C5FD" }}>
            Securing Session...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const menuItems = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { name: "Blocked Dates", href: "/dashboard/blocked-dates", icon: CalendarOff },
    { name: "Room Restrictions", href: "/dashboard/room-restrictions", icon: ShieldOff },
    { name: "Calendar View", href: "/dashboard/calendar", icon: Calendar },
    { name: "Set Price", href: "/dashboard/set-price", icon: Coins },
  ];

  return (
    <div className="flex min-h-screen font-sans" style={{ background: "#FAFBFF" }}>

      {/* ══════════════════════════════════════════
          SIDEBAR — Desktop (Royal Blue brand sidebar)
          ══════════════════════════════════════════ */}
      <aside 
        className="hidden md:flex md:w-64 flex-col"
        style={{ 
          background: "linear-gradient(180deg, #0D1B4A 0%, #132254 60%, #1A2F72 100%)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "4px 0 24px rgba(13,27,74,0.4)"
        }}
      >
        {/* ── Brand Logo Area ── */}
        <div 
          className="flex h-[72px] items-center gap-4 px-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-3 group">
            {/* Mandala-inspired logo mark */}
            <div 
              className="relative flex h-11 w-11 items-center justify-center rounded-full shrink-0 transition-transform duration-300 group-hover:scale-105"
              style={{ 
                background: "linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)",
                boxShadow: "0 0 0 2px rgba(255,255,255,0.15), 0 4px 12px rgba(220,38,38,0.3)"
              }}
            >
              {/* Decorative ring */}
              <div 
                className="absolute inset-1 rounded-full"
                style={{ border: "1px solid rgba(255,255,255,0.25)" }}
              />
              <span 
                className="relative text-white font-bold text-sm tracking-tight"
                style={{ fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}
              >
                HD
              </span>
            </div>
            <div>
              <h2 
                className="text-sm font-bold tracking-widest text-white leading-tight"
                style={{ fontFamily: "Georgia, serif", letterSpacing: "0.12em" }}
              >
                HOTEL DEVANG
              </h2>
              <p 
                className="text-[9px] font-semibold uppercase tracking-widest mt-0.5"
                style={{ color: "#93C5FD", letterSpacing: "0.2em" }}
              >
                Inventory System
              </p>
            </div>
          </Link>
        </div>

        {/* ── Real-time IST Clock ── */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div 
            className="rounded-xl p-4 relative overflow-hidden"
            style={{ 
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            {/* Subtle red accent line */}
            <div 
              className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
              style={{ background: "linear-gradient(90deg, #DC2626, #1D4ED8)" }}
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase" style={{ color: "#93C5FD" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  IST Live
                </span>
                <span className="text-[10px] font-medium tracking-wide" style={{ color: "#CBD5E1" }}>
                  {dateVal || "---"}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span 
                  className="text-2xl font-semibold tracking-tight font-mono tabular-nums text-white"
                >
                  {timeVal || "00:00:00"}
                </span>
                <span className="text-xs font-bold font-mono uppercase" style={{ color: "#F87171" }}>
                  {ampmVal || "AM"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation Menu ── */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p 
            className="px-3 mb-3 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(147,197,253,0.5)" }}
          >
            Navigation
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive 
                    ? "linear-gradient(135deg, rgba(220,38,38,0.2) 0%, rgba(29,78,216,0.15) 100%)" 
                    : "transparent",
                  border: isActive 
                    ? "1px solid rgba(220,38,38,0.3)" 
                    : "1px solid transparent",
                  color: isActive ? "#FFFFFF" : "rgba(203,213,225,0.75)",
                  boxShadow: isActive ? "0 2px 12px rgba(220,38,38,0.1), inset 0 1px 0 rgba(255,255,255,0.05)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(203,213,225,0.75)";
                    (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                  }
                }}
              >
                {/* Active indicator stripe */}
                {isActive && (
                  <div 
                    className="absolute left-0 h-6 w-0.5 rounded-r-full"
                    style={{ background: "#DC2626" }}
                  />
                )}
                <Icon 
                  className="h-4 w-4 shrink-0 transition-colors"
                  style={{ color: isActive ? "#F87171" : "inherit" }}
                />
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "#DC2626" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Sign Out ── */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer group"
            style={{ 
              color: "#FCA5A5", 
              border: "1px solid transparent",
              background: "transparent"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.12)";
              (e.currentTarget as HTMLElement).style.border = "1px solid rgba(220,38,38,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE HEADER
          ══════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header 
          className="flex h-16 items-center justify-between px-4 md:hidden"
          style={{ 
            background: "linear-gradient(135deg, #0D1B4A 0%, #1E3A8A 100%)",
            borderBottom: "2px solid rgba(220,38,38,0.4)"
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ 
                background: "linear-gradient(135deg, #DC2626, #1E3A8A)",
                boxShadow: "0 0 0 1.5px rgba(255,255,255,0.2)"
              }}
            >
              <span className="text-white font-bold text-xs" style={{ fontFamily: "Georgia, serif" }}>HD</span>
            </div>
            <h1 
              className="text-sm font-bold tracking-widest text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              HOTEL DEVANG
            </h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-blue-200 hover:text-white transition-colors outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* ── Mobile Drawer ── */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div 
              className="fixed inset-0 backdrop-blur-sm"
              style={{ background: "rgba(13,27,74,0.7)" }}
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div 
              className="relative flex w-64 max-w-xs flex-col p-5 z-50"
              style={{ 
                background: "linear-gradient(180deg, #0D1B4A 0%, #132254 100%)",
                borderRight: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              {/* Brand */}
              <div className="flex items-center gap-3 mb-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ 
                    background: "linear-gradient(135deg, #DC2626, #1E3A8A)",
                    boxShadow: "0 0 0 2px rgba(255,255,255,0.15)"
                  }}
                >
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "Georgia, serif" }}>HD</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-widest text-white" style={{ fontFamily: "Georgia, serif" }}>HOTEL DEVANG</h2>
                  <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#93C5FD" }}>Dashboard</p>
                </div>
              </div>

              {/* Clock - Mobile */}
              <div 
                className="mb-5 rounded-xl p-3.5 relative overflow-hidden"
                style={{ 
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: "linear-gradient(90deg, #DC2626, #1D4ED8)" }} />
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase" style={{ color: "#93C5FD" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    IST Live
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: "#CBD5E1" }}>{dateVal || "---"}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold tracking-tight font-mono text-white tabular-nums">{timeVal || "00:00:00"}</span>
                  <span className="text-xs font-bold font-mono uppercase" style={{ color: "#F87171" }}>{ampmVal || "AM"}</span>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                      style={{
                        background: isActive ? "linear-gradient(135deg, rgba(220,38,38,0.2), rgba(29,78,216,0.15))" : "transparent",
                        border: isActive ? "1px solid rgba(220,38,38,0.3)" : "1px solid transparent",
                        color: isActive ? "#FFFFFF" : "rgba(203,213,225,0.75)"
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? "#F87171" : "inherit" }} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Sign out - mobile */}
              <div className="pt-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200"
                  style={{ color: "#FCA5A5", background: "transparent", border: "1px solid transparent" }}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            MAIN CONTENT AREA
            ══════════════════════════════════════════ */}
        <main 
          className="flex-1 overflow-y-auto relative"
          style={{ 
            background: "linear-gradient(180deg, #FAFBFF 0%, #F1F5F9 100%)",
            padding: "clamp(1rem, 3vw, 2rem)"
          }}
        >
          {/* Subtle top accent border */}
          <div 
            className="fixed top-0 left-64 right-0 h-0.5 z-30 hidden md:block"
            style={{ background: "linear-gradient(90deg, #DC2626, #1D4ED8, #DC2626)" }}
          />

          {children}

          {/* FRIDAY tooltip */}
          {showTooltip && (
            <div className="fixed bottom-[96px] right-6 z-50 transition-all duration-500 animate-fadeIn font-sans">
              <div 
                className="relative rounded-2xl p-4 max-w-[270px]"
                style={{ 
                  background: "white",
                  border: "1px solid rgba(29,78,216,0.2)",
                  boxShadow: "0 10px 40px rgba(13,27,74,0.15), 0 0 0 1px rgba(29,78,216,0.08)"
                }}
              >
                <div className="flex gap-3 items-start">
                  <Bot className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" style={{ color: "#1D4ED8" }} />
                  <div className="space-y-1">
                    <p className="font-bold text-[10px] uppercase tracking-[0.2em]" style={{ color: "#DC2626" }}>FRIDAY AI</p>
                    <p className="text-[13px] leading-relaxed font-normal" style={{ color: "#334155" }}>
                      Hi Owner, I am FRIDAY. Ask me about your inventory, occupancies, or restrictions!
                    </p>
                  </div>
                </div>
                <div 
                  className="absolute -bottom-[6px] right-[22px] h-2.5 w-2.5 rotate-45 bg-white"
                  style={{ border: "0 solid transparent", borderRight: "1px solid rgba(29,78,216,0.2)", borderBottom: "1px solid rgba(29,78,216,0.2)" }}
                />
              </div>
            </div>
          )}

          {/* FRIDAY Floating Button */}
          <Link
            href="/assistant"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 animate-bob"
            title="Chat with FRIDAY"
            style={{ 
              background: "linear-gradient(135deg, #1E3A8A, #DC2626)",
              boxShadow: "0 4px 20px rgba(30,58,138,0.4), 0 0 0 2px rgba(255,255,255,0.9)",
              color: "white"
            }}
          >
            <Bot className="h-6 w-6" />
          </Link>
        </main>
      </div>
    </div>
  );
}
