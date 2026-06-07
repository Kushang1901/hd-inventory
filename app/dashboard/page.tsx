"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  IndianRupee, 
  BookmarkCheck, 
  CalendarRange, 
  ArrowRight,
  TrendingUp,
  Clock,
  Unlock,
  AlertCircle,
  Bot
} from "lucide-react";

type BookingRecord = {
  _id: string;
  bookingId: string;
  guestName: string;
  roomType: string;
  checkIn: string;
  totalAmount: number;
  paidAmount?: number;
  dueAmount: number;
  bookingStatus: string;
};

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    outstandingRevenue: 0,
    activeStays: 0
  });
  const [recentBookings, setRecentBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/bookings");
        if (!response.ok) throw new Error("Failed to load dashboard metrics");
        
        const resData = await response.json();
        const bookingsList = (resData.data || []) as BookingRecord[];

        // Compute stats dynamically from live MongoDB entries
        let revenue = 0;
        let outstanding = 0;
        let active = 0;

        bookingsList.forEach((b) => {
          if (b.bookingStatus !== "Cancelled") {
            revenue += b.paidAmount || 0;
            outstanding += b.dueAmount || 0;
            
            if (b.bookingStatus === "Checked In") {
              active += 1;
            }
          }
        });

        setStats({
          totalBookings: bookingsList.length,
          totalRevenue: revenue,
          outstandingRevenue: outstanding,
          activeStays: active
        });

        setRecentBookings(bookingsList.slice(0, 5));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred fetching dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-sm text-zinc-400">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center text-red-400 max-w-lg mx-auto mt-10">
        <AlertCircle className="h-10 w-10 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">Metrics Loading Error</h3>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Bookings",
      value: stats.totalBookings,
      icon: BookmarkCheck,
      color: "from-blue-600/20 to-blue-800/10 border-blue-500/25 text-blue-400",
      description: "Lifetime reservations booked"
    },
    {
      name: "Advance Collected",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "from-emerald-600/20 to-emerald-800/10 border-emerald-500/25 text-emerald-400",
      description: "Verified pre-payments received"
    },
    {
      name: "Outstanding Balances",
      value: `₹${stats.outstandingRevenue.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "from-amber-600/20 to-amber-800/10 border-amber-500/25 text-amber-400",
      description: "Dues to be collected at check-in"
    },
    {
      name: "Active Hotel Stays",
      value: stats.activeStays,
      icon: Users,
      color: "from-red-600/20 to-red-800/10 border-red-500/25 text-red-400",
      description: "Guests currently checked in"
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white font-semibold">Dashboard Overview</h1>
          <p className="text-xs md:text-sm text-zinc-500">Live operational metrics and booking entries for Hotel Devang.</p>
        </div>
        <div className="text-xs text-zinc-500 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800 self-start md:self-auto font-mono">
          System Time: {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.name}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
              style={{ 
                borderColor: card.color.split(" ").find(c => c.startsWith("border-"))?.split("/")[0].replace("border-", "#").replace("-500", "caa035") || "rgba(202,160,53,0.15)",
                backgroundColor: "rgba(10,10,10,0.4)"
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">{card.name}</span>
                <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800`}>
                  <Icon className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-semibold text-white tracking-tight font-sans mb-1">{card.value}</div>
              <p className="text-[10px] text-zinc-500">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Split Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Bookings List */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
            <h2 className="text-lg font-serif text-white flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
              <span>Recent Hotel Reservations</span>
            </h2>
            <Link 
              href="/dashboard/bookings" 
              className="group flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              <span>See all bookings</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No reservations recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {recentBookings.map((b) => (
                <div key={b._id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium text-white">{b.guestName}</span>
                      <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-amber-400">{b.bookingId}</span>
                    </div>
                    <p className="text-xs text-zinc-500 font-sans">
                      {b.roomType} &bull; Check-in: {new Date(b.checkIn).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">₹{b.totalAmount}</div>
                      <div className="text-[10px] text-zinc-500 font-sans">₹{b.dueAmount} outstanding</div>
                    </div>
                    <span 
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                        b.bookingStatus === "Confirmed" 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                          : b.bookingStatus === "Checked In"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : b.bookingStatus === "Checked Out"
                          ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {b.bookingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations panel */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6">
          <h2 className="text-lg font-serif text-white flex items-center gap-2 border-b border-zinc-800/60 pb-4">
            <CalendarRange className="h-4.5 w-4.5 text-amber-500" />
            <span>Quick Operations</span>
          </h2>
          
          <div className="space-y-3">
            <Link 
              href="/dashboard/blocked-dates"
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 hover:bg-zinc-900 hover:border-amber-500/30 p-4 transition-all duration-300"
            >
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Block Dates</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Mark dates as full or block specific room types.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500" />
            </Link>

            <Link 
              href="/dashboard/bookings"
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 hover:bg-zinc-900 hover:border-amber-500/30 p-4 transition-all duration-300"
            >
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Manage Check-ins</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Check in incoming guests or print receipts.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500" />
            </Link>

            <a 
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 hover:bg-zinc-900 hover:border-amber-500/30 p-4 transition-all duration-300"
            >
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Public System</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Open public website booking module.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500" />
            </a>

            <a 
              href="/assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/60 hover:bg-zinc-900 hover:border-amber-500/30 p-4 transition-all duration-300"
            >
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Bot className="h-4 w-4 text-amber-500" />
                  AI Concierge
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">Open the live hotel assistant for pricing and availability.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500" />
            </a>
          </div>

          <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-4 flex gap-3 text-xs text-amber-500/80 leading-relaxed">
            <Unlock className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-semibold text-amber-400 block mb-1">Owner Privileges Enabled</span>
              You have full administrative control. Update reservations, handle payments, and manage availability restrictions instantly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
