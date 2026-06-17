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
    <div className="space-y-8 animate-fadeIn text-sm text-zinc-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white font-semibold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-amber-500" />
            <span>Interactive Availability Calendar</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-500">
            Monitor real-time reservations, blocked dates, and available room allocations day by day.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-28">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-zinc-500">Compiling occupancy calendar...</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Column 1 & 2: Interactive Calendar Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6">
              
              {/* Calendar Month Selector Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
                <h2 className="text-lg font-serif font-medium text-white flex items-center gap-2">
                  <span>{currentMonth.toLocaleString("default", { month: "long" })}</span>
                  <span className="text-amber-500 font-mono font-bold">{year}</span>
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-2 border border-zinc-800 bg-zinc-950/60 rounded-lg hover:border-amber-500/30 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(new Date());
                    }}
                    className="px-3 py-1 border border-zinc-800 bg-zinc-950/60 text-xs font-medium rounded-lg hover:border-amber-500/30 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    className="p-2 border border-zinc-800 bg-zinc-950/60 rounded-lg hover:border-amber-500/30 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
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
                  let statusBorder = "border-zinc-800/40";
                  let statusGlow = "";
                  let statusLabel = "";
                  let dotColor = "bg-zinc-500";

                  if (isCurrentMonth) {
                    if (dayStats.status === "Fully Blocked") {
                      statusBorder = "border-red-950 bg-red-950/5 hover:bg-red-950/10";
                      statusGlow = "shadow-[inset_0_0_8px_rgba(239,68,68,0.05)]";
                      dotColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
                      statusLabel = "Blocked";
                    } else if (dayStats.status === "Sold Out") {
                      statusBorder = "border-red-900 bg-red-950/5 hover:bg-red-950/10";
                      statusGlow = "shadow-[inset_0_0_8px_rgba(239,68,68,0.05)]";
                      dotColor = "bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
                      statusLabel = "Sold Out";
                    } else if (dayStats.status === "Partially Booked") {
                      statusBorder = "border-amber-800/60 bg-amber-950/5 hover:bg-amber-950/10";
                      statusGlow = "shadow-[inset_0_0_8px_rgba(245,158,11,0.05)]";
                      dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]";
                      statusLabel = `${dayStats.totalBooked} Room${dayStats.totalBooked > 1 ? "s" : ""} Booked`;
                    } else {
                      statusBorder = "border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/20";
                      dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
                      statusLabel = "All Available";
                    }
                  } else {
                    // Out-of-month padding
                    statusBorder = "border-zinc-900/20 bg-zinc-950/10 opacity-25";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => isCurrentMonth && setSelectedDate(date)}
                      disabled={!isCurrentMonth}
                      className={`relative min-h-[76px] flex flex-col items-start justify-between p-2.5 rounded-lg border text-left transition duration-200 outline-none ${
                        isCurrentMonth ? "cursor-pointer" : "cursor-default"
                      } ${statusBorder} ${statusGlow} ${
                        daySelected 
                          ? "!border-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(202,160,53,0.15)] bg-zinc-900/40" 
                          : ""
                      }`}
                    >
                      <div className="flex w-full justify-between items-center">
                        <span 
                          className={`font-serif text-sm font-semibold ${
                            daySelected 
                              ? "text-amber-400" 
                              : dayToday 
                                ? "text-amber-500 border border-amber-500/40 rounded px-1.5 py-0.5 bg-amber-500/10 text-xs" 
                                : isCurrentMonth 
                                  ? "text-zinc-100" 
                                  : "text-zinc-700"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        
                        {isCurrentMonth && (
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                        )}
                      </div>

                      {isCurrentMonth && (
                        <span className="text-[9px] text-zinc-500 font-medium truncate w-full mt-1.5 leading-none block">
                          {statusLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-800/40 text-xs text-zinc-500">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <span>Fully Available</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                  <span>Partially Booked / Blocked</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  <span>Sold Out / Fully Blocked</span>
                </span>
              </div>

              {/* Indian Festivals & Holidays Panel */}
              <div className="mt-6 rounded-xl border border-amber-500/20 bg-zinc-950/40 p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-500 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-amber-500" />
                  <span>Indian Festivals & Holidays ({currentMonth.toLocaleString("default", { month: "long" })})</span>
                </h3>
                {(() => {
                  if (currentHolidays.length === 0) {
                    return <p className="text-xs text-zinc-500 italic">No major holidays or festivals recorded for this month.</p>;
                  }
                  return (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentHolidays.map((holiday, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/20 px-3.5 py-2.5 hover:border-amber-500/20 transition-all duration-200">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs font-mono font-bold text-amber-400">
                            {holiday.date}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-white truncate">{holiday.name}</p>
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                              holiday.type === "Gazetted"
                                ? "text-red-400"
                                : holiday.type === "Restricted"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}>
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
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6">
              
              {/* Card Header displaying Date */}
              <div className="border-b border-zinc-800/60 pb-4">
                <h3 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Live Occupancy</h3>
                <h2 className="text-lg font-serif text-white font-medium mt-1">
                  {selectedDate.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric", 
                    year: "numeric" 
                  })}
                </h2>
              </div>

              {/* Day overall status banner */}
              <div className={`rounded-lg border p-3.5 flex items-center gap-3 ${
                selectedDateStats.status === "Fully Blocked"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : selectedDateStats.status === "Sold Out"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : selectedDateStats.status === "Partially Booked"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}>
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
                  <p className="font-semibold text-xs uppercase tracking-wider">{selectedDateStats.status}</p>
                  <p className="text-[11px] opacity-75 mt-0.5">
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
                <h4 className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Room Allocation Breakdowns</h4>
                
                {selectedDateStats.rooms.map((room) => {
                  const percent = Math.min(100, Math.round((room.bookedCount / room.totalCapacity) * 100));
                  
                  return (
                    <div key={room.roomType} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-semibold text-white text-xs">{room.roomType} Room</span>
                        </div>
                        <span className={`text-[10px] rounded-full border px-2 py-0.5 font-bold uppercase ${
                          room.isBlocked
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : room.availableCount === 0
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : room.bookedCount > 0
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {room.isBlocked 
                            ? "Blocked" 
                            : room.availableCount === 0 
                              ? "Sold Out" 
                              : `${room.availableCount} Available`}
                        </span>
                      </div>

                      {/* Info lines */}
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>Booked: {room.bookedCount} / {room.totalCapacity} unit{room.totalCapacity > 1 ? "s" : ""}</span>
                        {!room.isBlocked && (
                          <span>
                            Rates: ₹{roomRates[room.roomType as keyof typeof roomRates]?.[0]?.price}
                            {roomRates[room.roomType as keyof typeof roomRates]?.[1] && ` / ₹${roomRates[room.roomType as keyof typeof roomRates]?.[1]?.price}`}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            room.isBlocked 
                              ? "w-full bg-red-600" 
                              : percent >= 100 
                                ? "bg-red-500" 
                                : percent > 0 
                                  ? "bg-amber-500" 
                                  : "bg-emerald-500"
                          }`}
                          style={{ width: `${room.isBlocked ? 100 : percent}%` }}
                        ></div>
                      </div>

                      {room.isBlocked && (
                        <div className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/10 rounded p-1.5 italic">
                          Block Reason: {room.blockReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Active Bookings List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Active Bookings Today</h4>
                {selectedDateStats.bookings.length === 0 ? (
                  <div className="text-center py-4 rounded-lg border border-dashed border-zinc-800 text-zinc-500 text-xs flex items-center justify-center gap-2">
                    <DoorOpen className="h-4 w-4" />
                    <span>No check-ins hosted today.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {selectedDateStats.bookings.map((b) => (
                      <div key={b.id || b._id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-white text-xs">{b.guestName}</span>
                            <span className="block text-[9px] font-mono text-amber-500 mt-0.5">{b.bookingId}</span>
                          </div>
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-400 font-semibold font-mono uppercase">
                            {b.paymentStatus}
                          </span>
                        </div>

                        <div className="space-y-1 text-zinc-400 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-zinc-500" />
                            <span>Room Config: {b.roomType}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-zinc-500" />
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
                  <h4 className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Active Date Blocks Today</h4>
                  <div className="space-y-2">
                    {selectedDateStats.blocks.map((block) => (
                      <div key={block.id || block._id} className="rounded-lg border border-red-500/20 bg-red-950/5 p-3 space-y-1.5 text-xs text-red-400">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-[9px]">
                            {block.roomType === "All" ? "Entire Hotel Block" : `${block.roomType} Room Block`}
                          </span>
                          <CalendarOff className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-[11px] italic opacity-85">{block.reason || "No block note specified"}</p>
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
