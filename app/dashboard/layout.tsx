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
  ExternalLink,
  Crown,
  Calendar,
  Coins
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
        className="flex min-h-screen items-center justify-center text-white"
        style={{ backgroundColor: "#070000" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">Securing Session...</p>
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
    { name: "Calendar View", href: "/dashboard/calendar", icon: Calendar },
    { name: "Set Price", href: "/dashboard/set-price", icon: Coins },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-zinc-800 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
              <span className="text-xl font-serif">ॐ</span>
            </div>
            <div>
              <h2 className="text-sm font-serif tracking-wider text-amber-400">DEVANG</h2>
              <p className="text-[9px] tracking-wider text-zinc-500 uppercase">Dashboard</p>
            </div>
          </Link>
        </div>

        {/* User profile */}
        <div className="px-6 py-6 border-b border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-800 to-amber-600 flex items-center justify-center border border-amber-500/30">
              <Crown className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Kushang (Owner)</p>
              <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Owner
              </p>
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(202,160,53,0.05)]"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Custom Set Price item is now dynamically mapped inside menuItems */}
        </nav>

        {/* Log Out */}
        <div className="border-t border-zinc-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/5 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navbar Header */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
              <span className="text-lg font-serif">ॐ</span>
            </div>
            <h1 className="text-sm font-serif tracking-wider text-amber-400">HOTEL DEVANG</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative flex w-64 max-w-xs flex-col bg-zinc-950 border-r border-zinc-800 p-6 z-50">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
                  <span className="text-xl font-serif">ॐ</span>
                </div>
                <div>
                  <h2 className="text-sm font-serif tracking-wider text-amber-400">DEVANG</h2>
                  <p className="text-[9px] tracking-wider text-zinc-500 uppercase">Dashboard</p>
                </div>
              </div>

              <nav className="flex-1 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
                        isActive
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-zinc-800 pt-4 mt-6">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/5 hover:text-red-300"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content view portal */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
