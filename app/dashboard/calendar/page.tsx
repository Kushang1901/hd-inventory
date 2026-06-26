"use client";

import React, { useEffect, useState } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  User, 
  Phone, 
  CalendarOff,
  AlertTriangle,
  CheckCircle2,
  Lock,
  DoorOpen
} from "lucide-react";

const INDIAN_HOLIDAYS: { [key: number]: { date: number; name: string; type: "Gazetted" | "Restricted" | "Festival" }[] } = {
  0: [ // January
    { date: 14, name: "Makar Sankranti / Pongal", type: "Festival" },
    { date: 26, name: "Republic Day", type: "Gazetted" }
  ],
  1: [ // February
    { date: 15, name: "Maha Shivratri", type: "Festival" },
    { date: 21, name: "Vasant Panchami", type: "Festival" }
  ],
  2: [ // March
    { date: 3, name: "Holi (Dhulandi)", type: "Gazetted" },
    { date: 19, name: "Chaitra Navratri Starts", type: "Festival" },
    { date: 27, name: "Rama Navami", type: "Festival" },
    { date: 30, name: "Mahavir Jayanti", type: "Restricted" }
  ],
  3: [ // April
    { date: 3, name: "Good Friday", type: "Gazetted" },
    { date: 14, name: "Dr. B.R. Ambedkar Jayanti", type: "Restricted" },
    { date: 18, name: "Parashurama Jayanti / Akshaya Tritiya", type: "Festival" }
  ],
  4: [ // May
    { date: 1, name: "Buddha Purnima", type: "Gazetted" }
  ],
  5: [ // June
    { date: 16, name: "Kabir Jayanti", type: "Restricted" }
  ],
  6: [ // July
    { date: 15, name: "Muharram", type: "Gazetted" },
    { date: 26, name: "Ashadhi Ekadashi", type: "Festival" }
  ],
  7: [ // August
    { date: 15, name: "Independence Day", type: "Gazetted" },
    { date: 27, name: "Raksha Bandhan", type: "Festival" },
    { date: 31, name: "Sri Krishna Janmashtami", type: "Festival" }
  ],
  8: [ // September
    { date: 4, name: "Ganesh Chaturthi", type: "Festival" },
    { date: 5, name: "Teachers' Day", type: "Restricted" },
    { date: 15, name: "Milad un-Nabi", type: "Gazetted" }
  ],
  9: [ // October
    { date: 2, name: "Mahatma Gandhi Jayanti", type: "Gazetted" },
    { date: 19, name: "Durga Ashtami", type: "Festival" },
    { date: 20, name: "Maha Navami / Dussehra", type: "Gazetted" }
  ],
  10: [ // November
    { date: 8, name: "Diwali / Deepavali", type: "Gazetted" },
    { date: 9, name: "Govardhan Puja", type: "Festival" },
    { date: 10, name: "Bhai Dooj", type: "Festival" },
    { date: 24, name: "Guru Nanak Jayanti", type: "Gazetted" }
  ],
  11: [ // December
    { date: 25, name: "Christmas Day", type: "Gazetted" }
  ]
};

export default function CalendarDashboard() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [holidayCache, setHolidayCache] = useState<{ [key: string]: any }>({});
  const [currentHolidays, setCurrentHolidays] = useState<any[]>([]);

  // Capacities standard list
  const totalCapacities: { [key: string]: number } = {
    "Standard": 2,
    "Deluxe": 31,
    "Super Deluxe": 8,
    "Suite": 2
  };

  const [roomRates, setRoomRates] = useState<any>({
    "Standard": [{ name: "AC Room", price: 1500 }, { name: "Non-AC Room", price: 1200 }],
    "Deluxe": [{ name: "AC Room", price: 1700 }, { name: "Non-AC Room", price: 1400 }],
    "Super Deluxe": [{ name: "AC Room", price: 1900 }, { name: "Non-AC Room", price: 1600 }],
    "Suite": [{ name: "AC Room", price: 3000 }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, blocksRes, pricesRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/blocked-dates"),
          fetch("/api/room-prices")
        ]);
        
        const bookingsData = await bookingsRes.json();
        const blocksData = await blocksRes.json();
        const pricesData = await pricesRes.json();

        if (bookingsData.success) {
          setBookings(bookingsData.data || []);
        }
        if (blocksData.success) {
          setBlockedDates(blocksData.data || []);
        }
        if (pricesData.success && Array.isArray(pricesData.prices)) {
          const formatted: any = {
            "Standard": [{ name: "AC Room", price: 1500 }, { name: "Non-AC Room", price: 1200 }],
            "Deluxe": [{ name: "AC Room", price: 1700 }, { name: "Non-AC Room", price: 1400 }],
            "Super Deluxe": [{ name: "AC Room", price: 1900 }, { name: "Non-AC Room", price: 1600 }],
            "Suite": [{ name: "AC Room", price: 3000 }]
          };
          
          pricesData.prices.forEach((item: any) => {
            const { roomType, subtype, price } = item;
            if (formatted[roomType]) {
              const subIndex = formatted[roomType].findIndex((s: any) => s.name.startsWith(subtype));
              if (subIndex > -1) {
                formatted[roomType][subIndex].price = price;
              } else if (subtype === "AC") {
                formatted[roomType][0].price = price;
              }
            }
          });
          setRoomRates(formatted);
        }
      } catch (err) {
        console.error("Failed to load calendar data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      const yearStr = currentMonth.getFullYear();
      if (holidayCache[yearStr]) {
        setCurrentHolidays(holidayCache[yearStr][currentMonth.getMonth()] || []);
        return;
      }
      try {
        const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${yearStr}/IN`);
        if (!res.ok) throw new Error("Failed to fetch holidays");
        const data = await res.json();
        
        const formatted: { [key: number]: any[] } = {};
        data.forEach((h: any) => {
          const dateObj = new Date(h.date);
          const m = dateObj.getUTCMonth();
          const d = dateObj.getUTCDate();
          
          if (!formatted[m]) {
            formatted[m] = [];
          }
          
          let holidayType: "Gazetted" | "Restricted" | "Festival" = "Gazetted";
          const nameLower = h.name.toLowerCase();
          if (nameLower.includes("maha shivratri") || nameLower.includes("holi") || nameLower.includes("janmashtami") || nameLower.includes("diwali") || nameLower.includes("dussehra") || nameLower.includes("ram navami")) {
            holidayType = "Festival";
          } else if (h.types && h.types.includes("Optional")) {
            holidayType = "Restricted";
          }
          
          formatted[m].push({
            date: d,
            name: h.localName || h.name,
            type: holidayType
          });
        });
        
        for (const m in formatted) {
          formatted[m].sort((a, b) => a.date - b.date);
        }
        
        setHolidayCache(prev => ({ ...prev, [yearStr]: formatted }));
        setCurrentHolidays(formatted[currentMonth.getMonth()] || []);
      } catch (err) {
        console.warn("API failed, falling back to static map", err);
        setCurrentHolidays(INDIAN_HOLIDAYS[currentMonth.getMonth() as keyof typeof INDIAN_HOLIDAYS] || []);
      }
    };
    fetchHolidays();
  }, [currentMonth, holidayCache]);

  // Helper: Normalize local date to UTC midnight timestamp
  const normalizeLocalDate = (d: Date) => {
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Helper: Normalize DB UTC date to UTC midnight timestamp
  const normalizeDbDate = (d: string | Date) => {
    const date = new Date(d);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };

  // Helper: Get data for a specific date
  const getDateStats = (date: Date) => {
    const targetTime = normalizeLocalDate(date);

    // 1. Find overlapping bookings for this date (where checkIn <= date && checkOut > date)
    const dailyBookings = bookings.filter((b) => {
      if (b.bookingStatus === "Cancelled") return false;
      const checkInTime = normalizeDbDate(b.checkIn);
      const checkOutTime = normalizeDbDate(b.checkOut);
      return targetTime >= checkInTime && targetTime < checkOutTime;
    });

    // 2. Find overlapping blocks for this date (where startDate <= date && endDate >= date)
    const dailyBlocks = blockedDates.filter((block) => {
      const startTime = normalizeDbDate(block.startDate);
      const endTime = normalizeDbDate(block.endDate);
      return targetTime >= startTime && targetTime <= endTime;
    });

    const isHotelFullyBlocked = dailyBlocks.some((block) => block.roomType === "All");
    const blockedTypes = new Set(
      dailyBlocks
        .filter((block) => block.roomType !== "All")
        .map((block) => block.roomType)
    );

    // 3. Compute booked room quantities
    const bookedCounts: { [key: string]: number } = {
      "Standard": 0,
      "Deluxe": 0,
      "Super Deluxe": 0,
      "Suite": 0
    };

    dailyBookings.forEach((b: any) => {
      if (b.rooms && b.rooms.length > 0) {
        b.rooms.forEach((room: any) => {
          const type = room.roomType;
          if (bookedCounts[type] !== undefined) {
            bookedCounts[type] += Number(room.quantity) || 1;
          }
        });
      } else if (b.roomType) {
        const type = b.roomType;
        if (bookedCounts[type] !== undefined) {
          bookedCounts[type] += 1;
        }
      }
    });

    // 4. Assemble rooms inventory for this specific day
    const rooms = Object.keys(totalCapacities).map((type) => {
      const capacity = totalCapacities[type];
      const booked = bookedCounts[type] || 0;
      const isBlocked = isHotelFullyBlocked || blockedTypes.has(type);
      const available = isBlocked ? 0 : Math.max(0, capacity - booked);
      
      return {
        roomType: type,
        totalCapacity: capacity,
        bookedCount: booked,
        availableCount: available,
        isBlocked: isBlocked,
        blockReason: isBlocked 
          ? (isHotelFullyBlocked 
              ? dailyBlocks.find((b) => b.roomType === "All")?.reason 
              : dailyBlocks.find((b) => b.roomType === type)?.reason) || "Blocked"
          : null
      };
    });

    const totalRooms = Object.values(totalCapacities).reduce((sum, c) => sum + c, 0);
    const totalBooked = Object.values(bookedCounts).reduce((sum, b) => sum + b, 0);
    const totalBlockedCount = rooms.filter(r => r.isBlocked).length;
    
    // Status Code: "Fully Blocked", "Sold Out", "Partially Booked", "Available"
    let dayStatus = "Available";
    if (isHotelFullyBlocked) {
      dayStatus = "Fully Blocked";
    } else if (totalBooked >= totalRooms) {
      dayStatus = "Sold Out";
    } else if (totalBooked > 0 || totalBlockedCount > 0) {
      dayStatus = "Partially Booked";
    }

    return {
      rooms,
      bookings: dailyBookings,
      blocks: dailyBlocks,
      status: dayStatus,
      totalBooked,
      totalRooms,
      isBlocked: isHotelFullyBlocked
    };
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const prevMonthNumberOfDays = new Date(year, month, 0).getDate();

  const daysGrid: Date[] = [];

  // Add padding days from the previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push(new Date(year, month - 1, prevMonthNumberOfDays - i));
  }

  // Add current month days
  for (let i = 1; i <= numberOfDays; i++) {
    daysGrid.push(new Date(year, month, i));
  }

  // Add padding days for the next month to fill grid rows (42 blocks)
  const remainingSlots = 42 - daysGrid.length;
  for (let i = 1; i <= remainingSlots; i++) {
    daysGrid.push(new Date(year, month + 1, i));
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const selectedDateStats = getDateStats(selectedDate);

  return (
    <div className="space-y-6 animate-fadeIn text-sm text-slate-700">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 
          className="text-2xl md:text-3xl font-bold flex items-center gap-2.5"
          style={{ 
            fontFamily: "Georgia, serif",
            background: "linear-gradient(135deg, #0D1B4A, #1D4ED8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          <CalendarIcon className="h-6 w-6 shrink-0" style={{ color: "#DC2626" }} />
          <span>Interactive Availability Calendar</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-500">
          Monitor real-time reservations, blocked dates, and available room allocations day by day.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-28">
          <div 
            className="relative mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#DC2626", borderRightColor: "#1D4ED8" }}
          />
          <p className="text-slate-400 text-xs">Compiling occupancy calendar...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Column 1 & 2: Interactive Calendar Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div 
              className="rounded-2xl p-6 space-y-6"
              style={{ 
                background: "white",
                border: "1px solid rgba(29,78,216,0.1)",
                boxShadow: "0 4px 20px rgba(13,27,74,0.06)"
              }}
            >
              
              {/* Calendar Month Selector Header */}
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#F1F5F9" }}>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: "Georgia, serif" }}>
                  <span>{currentMonth.toLocaleString("default", { month: "long" })}</span>
                  <span className="font-mono font-bold" style={{ color: "#1D4ED8" }}>{year}</span>
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-2 border border-slate-200 bg-slate-50 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition cursor-pointer"
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(new Date());
                    }}
                    className="px-3.5 py-1 border border-slate-200 bg-slate-50 text-xs font-bold rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition cursor-pointer"
                    type="button"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    className="p-2 border border-slate-200 bg-slate-50 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition cursor-pointer"
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Calendar grid cells */}
              <div className="grid grid-cols-7 gap-2">
                {daysGrid.map((date, idx) => {
                  const dayStats = getDateStats(date);
                  const isCurrentMonth = date.getMonth() === month;
                  const daySelected = isSelected(date);
                  const dayToday = isToday(date);

                  // Color mapping based on occupancy status
                  let statusBorder = "border-slate-100";
                  let statusGlow = "";
                  let statusLabel = "";
                  let dotColor = "bg-slate-400";

                  if (isCurrentMonth) {
                    if (dayStats.status === "Fully Blocked") {
                      statusBorder = "border-red-200 bg-red-50 hover:bg-red-100/60";
                      statusGlow = "shadow-[inset_0_0_8px_rgba(239,68,68,0.02)]";
                      dotColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                      statusLabel = "Blocked";
                    } else if (dayStats.status === "Sold Out") {
                      statusBorder = "border-red-100 bg-red-50/50 hover:bg-red-100/60";
                      statusGlow = "shadow-[inset_0_0_8px_rgba(239,68,68,0.02)]";
                      dotColor = "bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                      statusLabel = "Sold Out";
                    } else if (dayStats.status === "Partially Booked") {
                      statusBorder = "border-amber-200 bg-amber-50 hover:bg-amber-100/60";
                      statusGlow = "shadow-[inset_0_0_8px_rgba(245,158,11,0.02)]";
                      dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                      statusLabel = `${dayStats.totalBooked} Room${dayStats.totalBooked > 1 ? "s" : ""} Booked`;
                    } else {
                      statusBorder = "border-slate-100 bg-white hover:bg-slate-50/50";
                      dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                      statusLabel = "All Available";
                    }
                  } else {
                    // Out-of-month padding
                    statusBorder = "border-slate-100 bg-slate-50 opacity-30";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => isCurrentMonth && setSelectedDate(date)}
                      disabled={!isCurrentMonth}
                      className={`relative min-h-[76px] flex flex-col items-start justify-between p-2.5 rounded-xl border text-left transition duration-200 outline-none ${
                        isCurrentMonth ? "cursor-pointer" : "cursor-default"
                      } ${statusBorder} ${statusGlow} ${
                        daySelected 
                          ? "!border-blue-600 ring-2 ring-blue-100 bg-blue-50/10 shadow-sm" 
                          : ""
                      }`}
                      type="button"
                    >
                      <div className="flex w-full justify-between items-center">
                        <span 
                          className={`font-bold text-xs ${
                            daySelected 
                              ? "text-blue-600" 
                              : dayToday 
                                ? "text-blue-600 border border-blue-200 rounded-lg px-2 py-0.5 bg-blue-50 text-[10px]" 
                                : isCurrentMonth 
                                  ? "text-slate-800" 
                                  : "text-slate-300"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        
                        {isCurrentMonth && (
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                        )}
                      </div>

                      {isCurrentMonth && (
                        <span className="text-[9px] text-slate-400 font-bold truncate w-full mt-1.5 leading-none block uppercase tracking-wide">
                          {statusLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span>Fully Available</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                  <span>Partially Booked</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                  <span>Sold Out / Blocked</span>
                </span>
              </div>

              {/* Indian Festivals & Holidays Panel */}
              <div className="mt-6 rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgba(29,78,216,0.12)", background: "rgba(29,78,216,0.02)" }}>
                <h3 className="text-xs uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: "#1D4ED8" }}>
                  <CalendarIcon className="h-4 w-4" />
                  <span>Indian Festivals & Holidays ({currentMonth.toLocaleString("default", { month: "long" })})</span>
                </h3>
                {(() => {
                  if (currentHolidays.length === 0) {
                    return <p className="text-xs text-slate-400 italic">No major holidays or festivals recorded for this month.</p>;
                  }
                  return (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentHolidays.map((holiday, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 transition-all duration-200"
                          style={{ borderColor: "rgba(29,78,216,0.08)" }}
                        >
                          <div 
                            className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-mono font-bold"
                            style={{ borderColor: "rgba(29,78,216,0.2)", background: "rgba(29,78,216,0.06)", color: "#1D4ED8" }}
                          >
                            {holiday.date}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{holiday.name}</p>
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                              holiday.type === "Gazetted"
                                ? "text-red-600"
                                : holiday.type === "Restricted"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                            style={{
                              color: holiday.type === "Gazetted" ? "#DC2626" : holiday.type === "Restricted" ? "#D97706" : "#059669"
                            }}
                            >
                              {holiday.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>

          {/* Column 3: Live Selected Date Occupancy Panel */}
          <div className="space-y-6">
            <div 
              className="rounded-2xl p-6 space-y-6"
              style={{ 
                background: "white",
                border: "1px solid rgba(29,78,216,0.1)",
                boxShadow: "0 4px 20px rgba(13,27,74,0.06)"
              }}
            >
              
              {/* Card Header displaying Date */}
              <div className="border-b pb-4" style={{ borderColor: "#F1F5F9" }}>
                <h3 className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Live Occupancy</h3>
                <h2 className="text-lg font-bold text-slate-800 mt-1" style={{ fontFamily: "Georgia, serif" }}>
                  {selectedDate.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric", 
                    year: "numeric" 
                  })}
                </h2>
              </div>

              {/* Day overall status banner */}
              <div 
                className="rounded-xl border p-3.5 flex items-center gap-3 text-xs"
                style={{ 
                  borderColor: selectedDateStats.status === "Fully Blocked" || selectedDateStats.status === "Sold Out"
                    ? "rgba(220,38,38,0.2)"
                    : selectedDateStats.status === "Partially Booked"
                      ? "rgba(217,119,6,0.2)"
                      : "rgba(5,150,105,0.2)",
                  background: selectedDateStats.status === "Fully Blocked" || selectedDateStats.status === "Sold Out"
                    ? "rgba(220,38,38,0.05)"
                    : selectedDateStats.status === "Partially Booked"
                      ? "rgba(217,119,6,0.05)"
                      : "rgba(5,150,105,0.05)",
                  color: selectedDateStats.status === "Fully Blocked" || selectedDateStats.status === "Sold Out"
                    ? "#DC2626"
                    : selectedDateStats.status === "Partially Booked"
                      ? "#D97706"
                      : "#059669"
                }}
              >
                {selectedDateStats.status === "Fully Blocked" ? (
                  <Lock className="h-5 w-5 shrink-0" />
                ) : selectedDateStats.status === "Sold Out" ? (
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                ) : selectedDateStats.status === "Partially Booked" ? (
                  <CalendarIcon className="h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                )}
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px]">{selectedDateStats.status}</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {selectedDateStats.status === "Fully Blocked"
                      ? "The entire hotel is blocked for public bookings."
                      : selectedDateStats.status === "Sold Out"
                        ? "Zero room availability remaining today."
                        : selectedDateStats.status === "Partially Booked"
                          ? `${selectedDateStats.totalBooked} of ${selectedDateStats.totalRooms} rooms allocated.`
                          : "All rooms are open and available."}
                  </p>
                </div>
              </div>

              {/* Rooms availability progress grids */}
              <div className="space-y-4">
                <h4 className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Room Allocation Breakdowns</h4>
                
                {selectedDateStats.rooms.map((room) => {
                  const percent = Math.min(100, Math.round((room.bookedCount / room.totalCapacity) * 100));
                  
                  return (
                    <div 
                      key={room.roomType} 
                      className="rounded-xl border p-3 space-y-2"
                      style={{ borderColor: "#F1F5F9", background: "#FAFBFF" }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800 text-xs">{room.roomType} Room</span>
                        </div>
                        <span 
                          className="text-[9px] rounded-full border px-2 py-0.5 font-bold uppercase tracking-wide"
                          style={{
                            borderColor: room.isBlocked || room.availableCount === 0
                              ? "rgba(220,38,38,0.2)"
                              : room.bookedCount > 0
                                ? "rgba(217,119,6,0.2)"
                                : "rgba(5,150,105,0.2)",
                            background: room.isBlocked || room.availableCount === 0
                              ? "rgba(220,38,38,0.06)"
                              : room.bookedCount > 0
                                ? "rgba(217,119,6,0.06)"
                                : "rgba(5,150,105,0.06)",
                            color: room.isBlocked || room.availableCount === 0
                              ? "#DC2626"
                              : room.bookedCount > 0
                                ? "#D97706"
                                : "#059669"
                          }}
                        >
                          {room.isBlocked 
                            ? "Blocked" 
                            : room.availableCount === 0 
                              ? "Sold Out" 
                              : `${room.availableCount} Available`}
                        </span>
                      </div>

                      {/* Info lines */}
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>Booked: {room.bookedCount} / {room.totalCapacity} unit{room.totalCapacity > 1 ? "s" : ""}</span>
                        {!room.isBlocked && (
                          <span>
                            Rates: ₹{roomRates[room.roomType as keyof typeof roomRates]?.[0]?.price}
                            {roomRates[room.roomType as keyof typeof roomRates]?.[1] && ` / ₹${roomRates[room.roomType as keyof typeof roomRates]?.[1]?.price}`}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${room.isBlocked ? 100 : percent}%`,
                            background: room.isBlocked 
                              ? "#DC2626" 
                              : percent >= 100 
                                ? "#DC2626" 
                                : percent > 0 
                                  ? "#D97706" 
                                  : "#059669"
                          }}
                        ></div>
                      </div>

                      {room.isBlocked && (
                        <div 
                          className="text-[10px] border rounded p-1.5 italic"
                          style={{ borderColor: "rgba(220,38,38,0.15)", background: "rgba(220,38,38,0.03)", color: "#DC2626" }}
                        >
                          Block Reason: {room.blockReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active Bookings List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Active Bookings Today</h4>
                {selectedDateStats.bookings.length === 0 ? (
                  <div className="text-center py-6 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs flex items-center justify-center gap-2 bg-slate-50/50">
                    <DoorOpen className="h-4 w-4 text-slate-300" />
                    <span>No check-ins hosted today.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {selectedDateStats.bookings.map((b) => (
                      <div 
                        key={b.id || b._id} 
                        className="rounded-xl border p-3 space-y-2 text-xs"
                        style={{ borderColor: "#F1F5F9", background: "#FAFBFF" }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800 text-xs">{b.guestName}</span>
                            <span className="block text-[9px] font-mono font-bold mt-0.5" style={{ color: "#DC2626" }}>{b.bookingId}</span>
                          </div>
                          <span 
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wide border"
                            style={{
                              borderColor: b.paymentStatus === "Paid" ? "rgba(5,150,105,0.2)" : "rgba(217,119,6,0.2)",
                              background: b.paymentStatus === "Paid" ? "rgba(5,150,105,0.05)" : "rgba(217,119,6,0.05)",
                              color: b.paymentStatus === "Paid" ? "#059669" : "#D97706"
                            }}
                          >
                            {b.paymentStatus}
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-500 text-[11px] font-medium">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>Room Config: {b.roomType}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>Phone: {b.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Blocks List */}
              {selectedDateStats.blocks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Active Date Blocks Today</h4>
                  <div className="space-y-2">
                    {selectedDateStats.blocks.map((block) => (
                      <div 
                        key={block.id || block._id} 
                        className="rounded-xl border p-3 space-y-1.5 text-xs"
                        style={{ borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", color: "#DC2626" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-[9px]">
                            {block.roomType === "All" ? "Entire Hotel Block" : `${block.roomType} Room Block`}
                          </span>
                          <CalendarOff className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-[11px] italic opacity-90">{block.reason || "No block note specified"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
