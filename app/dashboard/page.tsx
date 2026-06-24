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
          <div 
            className="relative mx-auto mb-4 h-12 w-12"
          >
            <div 
              className="absolute inset-0 rounded-full border-3 border-transparent animate-spin"
              style={{ borderTopColor: "#DC2626", borderRightColor: "#1D4ED8", borderWidth: "3px" }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="rounded-2xl p-6 text-center max-w-lg mx-auto mt-10"
        style={{ 
          background: "#FFF5F5",
          border: "1px solid rgba(220,38,38,0.2)",
          color: "#DC2626"
        }}
      >
        <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "#DC2626" }} />
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
      gradient: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)",
      iconBg: "rgba(29,78,216,0.12)",
      iconColor: "#1D4ED8",
      border: "rgba(29,78,216,0.15)",
      description: "Lifetime reservations booked"
    },
    {
      name: "Advance Collected",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      gradient: "linear-gradient(135deg, #065F46 0%, #059669 100%)",
      iconBg: "rgba(5,150,105,0.12)",
      iconColor: "#059669",
      border: "rgba(5,150,105,0.15)",
      description: "Verified pre-payments received"
    },
    {
      name: "Outstanding Balances",
      value: `₹${stats.outstandingRevenue.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #92400E 0%, #D97706 100%)",
      iconBg: "rgba(217,119,6,0.12)",
      iconColor: "#D97706",
      border: "rgba(217,119,6,0.15)",
      description: "Dues to be collected at check-in"
    },
    {
      name: "Active Hotel Stays",
      value: stats.activeStays,
      icon: Users,
      gradient: "linear-gradient(135deg, #991B1B 0%, #DC2626 100%)",
      iconBg: "rgba(220,38,38,0.12)",
      iconColor: "#DC2626",
      border: "rgba(220,38,38,0.15)",
      description: "Guests currently checked in"
    }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Confirmed":
        return { background: "rgba(217,119,6,0.1)", color: "#D97706", border: "1px solid rgba(217,119,6,0.2)" };
      case "Checked In":
        return { background: "rgba(5,150,105,0.1)", color: "#059669", border: "1px solid rgba(5,150,105,0.2)" };
      case "Checked Out":
        return { background: "rgba(100,116,139,0.1)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" };
      case "Cancelled":
        return { background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" };
      default:
        return { background: "rgba(100,116,139,0.1)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 
            className="text-2xl md:text-3xl font-bold"
            style={{ 
              fontFamily: "Georgia, serif",
              background: "linear-gradient(135deg, #0D1B4A, #1D4ED8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Dashboard Overview
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: "#64748B" }}>
            Live operational metrics and booking entries for Hotel Devang.
          </p>
        </div>
        <div 
          className="text-xs self-start md:self-auto font-mono px-4 py-2 rounded-xl"
          style={{ 
            background: "white",
            border: "1px solid rgba(29,78,216,0.15)",
            color: "#475569",
            boxShadow: "0 2px 8px rgba(13,27,74,0.06)"
          }}
        >
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.name}
              className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={{ 
                background: "white",
                border: `1px solid ${card.border}`,
                boxShadow: `0 4px 20px rgba(13,27,74,0.06), 0 1px 4px rgba(13,27,74,0.04)`
              }}
            >
              {/* Top gradient bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: card.gradient }}
              />
              
              <div className="flex items-center justify-between mb-4 mt-1">
                <span 
                  className="text-[10px] uppercase tracking-widest font-bold"
                  style={{ color: "#94A3B8" }}
                >
                  {card.name}
                </span>
                <div 
                  className="p-2.5 rounded-xl"
                  style={{ background: card.iconBg }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: card.iconColor }} />
                </div>
              </div>
              <div 
                className="text-2xl md:text-3xl font-bold tracking-tight mb-1"
                style={{ color: "#0F172A" }}
              >
                {card.value}
              </div>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* ── Content Split Panels ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        
        {/* Recent Bookings */}
        <div 
          className="rounded-2xl p-6 lg:col-span-2 space-y-5"
          style={{ 
            background: "white",
            border: "1px solid rgba(29,78,216,0.1)",
            boxShadow: "0 4px 20px rgba(13,27,74,0.06)"
          }}
        >
          <div 
            className="flex items-center justify-between pb-4"
            style={{ borderBottom: "1px solid #F1F5F9" }}
          >
            <h2 
              className="text-base font-bold flex items-center gap-2.5"
              style={{ color: "#0F172A", fontFamily: "Georgia, serif" }}
            >
              <div 
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(29,78,216,0.1)" }}
              >
                <Clock className="h-4 w-4" style={{ color: "#1D4ED8" }} />
              </div>
              <span>Recent Hotel Reservations</span>
            </h2>
            <Link 
              href="/dashboard/bookings" 
              className="group flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: "#DC2626" }}
            >
              <span>See all bookings</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color: "#94A3B8" }}>
              No reservations recorded yet.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F8FAFC" }}>
              {recentBookings.map((b) => (
                <div key={b._id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>{b.guestName}</span>
                      <span 
                        className="text-[9px] font-mono px-2 py-0.5 rounded font-bold"
                        style={{ 
                          background: "rgba(29,78,216,0.08)",
                          color: "#1D4ED8",
                          border: "1px solid rgba(29,78,216,0.15)"
                        }}
                      >
                        {b.bookingId}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                      {b.roomType} &bull; Check-in: {new Date(b.checkIn).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: "#0F172A" }}>₹{b.totalAmount}</div>
                      <div className="text-[10px]" style={{ color: "#94A3B8" }}>₹{b.dueAmount} outstanding</div>
                    </div>
                    <span 
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={getStatusStyle(b.bookingStatus)}
                    >
                      {b.bookingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations */}
        <div 
          className="rounded-2xl p-6 space-y-5"
          style={{ 
            background: "white",
            border: "1px solid rgba(29,78,216,0.1)",
            boxShadow: "0 4px 20px rgba(13,27,74,0.06)"
          }}
        >
          <h2 
            className="text-base font-bold flex items-center gap-2.5 pb-4"
            style={{ 
              color: "#0F172A", 
              fontFamily: "Georgia, serif",
              borderBottom: "1px solid #F1F5F9"
            }}
          >
            <div className="p-1.5 rounded-lg" style={{ background: "rgba(220,38,38,0.1)" }}>
              <CalendarRange className="h-4 w-4" style={{ color: "#DC2626" }} />
            </div>
            <span>Quick Operations</span>
          </h2>
          
          <div className="space-y-2.5">
            <Link 
              href="/dashboard/blocked-dates"
              className="flex items-center justify-between rounded-xl p-4 transition-all duration-200 group"
              style={{ 
                background: "#F8FAFC",
                border: "1px solid rgba(29,78,216,0.08)"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#EFF6FF";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(29,78,216,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(29,78,216,0.08)";
              }}
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1E293B" }}>Block Dates</h3>
                <p className="text-[10px] mt-1" style={{ color: "#94A3B8" }}>Mark dates as full or block specific room types.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#1D4ED8" }} />
            </Link>

            <Link 
              href="/dashboard/bookings"
              className="flex items-center justify-between rounded-xl p-4 transition-all duration-200 group"
              style={{ 
                background: "#F8FAFC",
                border: "1px solid rgba(29,78,216,0.08)"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#EFF6FF";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(29,78,216,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(29,78,216,0.08)";
              }}
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1E293B" }}>Manage Check-ins</h3>
                <p className="text-[10px] mt-1" style={{ color: "#94A3B8" }}>Check in incoming guests or print receipts.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#1D4ED8" }} />
            </Link>

            <a 
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl p-4 transition-all duration-200"
              style={{ 
                background: "#F8FAFC",
                border: "1px solid rgba(29,78,216,0.08)"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#EFF6FF";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(29,78,216,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(29,78,216,0.08)";
              }}
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1E293B" }}>Public System</h3>
                <p className="text-[10px] mt-1" style={{ color: "#94A3B8" }}>Open public website booking module.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#1D4ED8" }} />
            </a>
          </div>

          {/* Owner privileges info */}
          <div 
            className="rounded-xl p-4 flex gap-3 text-xs leading-relaxed"
            style={{ 
              background: "linear-gradient(135deg, rgba(30,58,138,0.05), rgba(220,38,38,0.04))",
              border: "1px solid rgba(29,78,216,0.12)"
            }}
          >
            <Unlock className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#1D4ED8" }} />
            <div>
              <span className="font-bold block mb-1" style={{ color: "#1E3A8A" }}>Owner Privileges Enabled</span>
              <span style={{ color: "#64748B" }}>
                You have full administrative control. Update reservations, handle payments, and manage availability instantly.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
