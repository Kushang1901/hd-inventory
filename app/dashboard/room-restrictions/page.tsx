"use client";

import React, { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  ShieldOff,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Pencil,
  X,
  Clock,
  Home,
  BedDouble,
  Crown,
  Sparkles,
  Info
} from "lucide-react";

const ROOM_TYPES = [
  { id: "Standard", label: "Standard Room", total: 2, icon: Home },
  { id: "Deluxe", label: "Deluxe Room", total: 31, icon: BedDouble },
  { id: "Super Deluxe", label: "Super Deluxe Room", total: 8, icon: Sparkles },
  { id: "Suite", label: "Suite Room", total: 2, icon: Crown },
];

const ROOM_COLORS: Record<string, { badge: string; bar: string; accent: string }> = {
  Standard:      { badge: "bg-blue-50 text-blue-700 border-blue-100",  bar: "bg-blue-600",    accent: "text-blue-600"    },
  Deluxe:        { badge: "bg-amber-50 text-amber-700 border-amber-100", bar: "bg-amber-600",   accent: "text-amber-600"   },
  "Super Deluxe":{ badge: "bg-purple-50 text-purple-700 border-purple-100", bar: "bg-purple-600", accent: "text-purple-600" },
  Suite:         { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", bar: "bg-emerald-600", accent: "text-emerald-600" },
};

// ── helpers ────────────────────────────────────────────────────────────────────

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Returns blocked date-ranges (Flatpickr disable format) for the given roomType */
const getDisabledRanges = (roomType: string, blocks: any[]) =>
  blocks
    .filter((b) => b.roomType === "All" || b.roomType === roomType)
    .map((b) => ({ from: b.startDate.substring(0, 10), to: b.endDate.substring(0, 10) }));

/** Returns the first overlapping block for the given roomType & date range (or null) */
const getOverlapBlock = (start: string, end: string, roomType: string, blocks: any[]) => {
  if (!start || !end) return null;
  return blocks.find((b) => {
    const bs = b.startDate.substring(0, 10);
    const be = b.endDate.substring(0, 10);
    return start <= be && end >= bs && (b.roomType === "All" || b.roomType === roomType);
  }) ?? null;
};

// ── component ──────────────────────────────────────────────────────────────────

export default function RoomRestrictionsPage() {
  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [loading, setLoading]               = useState(true);
  const [restrictions, setRestrictions]     = useState<any[]>([]);
  const [blockedRanges, setBlockedRanges]   = useState<any[]>([]);

  const [startDate, setStartDate]           = useState(getLocalDateString());
  const [endDate, setEndDate]               = useState(getLocalDateString());
  const [roomType, setRoomType]             = useState("Deluxe");
  const [blockedCount, setBlockedCount]     = useState(0);
  const [reason, setReason]                 = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<any | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Flatpickr instances kept in refs (not state) so we can call .set() imperatively
  const startFpRef = useRef<any>(null);
  const endFpRef   = useRef<any>(null);

  const selectedRoomMeta = ROOM_TYPES.find((r) => r.id === roomType)!;
  const maxBlock         = selectedRoomMeta?.total ?? 1;
  const availablePreview = Math.max(0, maxBlock - blockedCount);

  // Warning: selected dates overlap a full block for this room type
  const overlapBlock = getOverlapBlock(startDate, endDate, roomType, blockedRanges);

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchRestrictions = async () => {
    try {
      const res  = await fetch("/api/room-restrictions");
      const data = await res.json();
      if (data.success) setRestrictions(data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchBlockedRanges = async () => {
    try {
      const res  = await fetch("/api/blocked-dates");
      const data = await res.json();
      if (data.success) {
        setBlockedRanges(data.data || []);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchRestrictions();
    fetchBlockedRanges();
  }, []);

  // ── Flatpickr init (recreates on roomType or blockedRanges changes) ──────────

  useEffect(() => {
    let sFp: any = null;
    let eFp: any = null;

    import("flatpickr").then((module) => {
      const fp = module.default;
      import("flatpickr/dist/flatpickr.css");

      const disabled = getDisabledRanges(roomType, blockedRanges);

      /** Adds a green "available" dot or red "blocked" dot to each calendar day */
      const onDayCreate = (_dObj: any, _dStr: any, _fp: any, dayElem: any) => {
        const dateStr = toISO(dayElem.dateObj);
        const isBlocked = blockedRanges.some((b) => {
          const bs = b.startDate.substring(0, 10);
          const be = b.endDate.substring(0, 10);
          return dateStr >= bs && dateStr <= be && (b.roomType === "All" || b.roomType === roomType);
        });

        const dot = document.createElement("span");
        dot.style.cssText = `
          display:block; width:5px; height:5px; border-radius:50%;
          margin:1px auto 0; 
          background:${isBlocked ? "#ef4444" : "#22c55e"};
          opacity:${isBlocked ? "0.9" : "0.85"};
        `;
        dayElem.appendChild(dot);
      };

      const commonOpts = {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        allowInput: true,
        minDate: "today",
        disable: disabled,
        onDayCreate,
      };

      sFp = fp("#rr-startDate", {
        ...commonOpts,
        defaultDate: startDate || undefined,
        onChange: (selectedDates: any[], dateStr: string) => {
          setStartDate(dateStr);
          if (eFp && selectedDates.length > 0) {
            eFp.set("minDate", selectedDates[0]);
          }
        },
      });

      eFp = fp("#rr-endDate", {
        ...commonOpts,
        defaultDate: endDate || undefined,
        minDate: startDate || "today",
        onChange: (_: any[], dateStr: string) => setEndDate(dateStr),
      });

      startFpRef.current = sFp;
      endFpRef.current   = eFp;
    });

    return () => {
      if (sFp) sFp.destroy();
      if (eFp) eFp.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType, blockedRanges]);

  // ── Sync state → Flatpickr when editing an existing restriction ───────────

  useEffect(() => {
    if (startFpRef.current) startFpRef.current.setDate(startDate || "", false);
    if (endFpRef.current)   endFpRef.current.setDate(endDate || "", false);
  }, [startDate, endDate]);

  // ── Reset blocked count when room type changes ─────────────────────────────

  useEffect(() => { setBlockedCount(0); }, [roomType]);

  // ── form helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setStartDate(getLocalDateString());
    setEndDate(getLocalDateString());
    setRoomType("Deluxe");
    setBlockedCount(0);
    setReason("");
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body   = editingId
        ? { id: editingId, startDate, endDate, roomType, blockedCount, reason }
        : { startDate, endDate, roomType, blockedCount, reason };
      const res  = await fetch("/api/room-restrictions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(editingId ? "Restriction updated successfully!" : "Room restriction saved successfully!");
        resetForm();
        fetchRestrictions();
      } else {
        setError(data.error || "Failed to save restriction.");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Remove Room Restriction",
      message: "Remove this room restriction? Guests will be able to book those rooms again on these dates.",
      confirmText: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res  = await fetch(`/api/room-restrictions?id=${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) fetchRestrictions();
          else alert(data.error || "Failed to remove restriction");
        } catch {
          alert("Network error removing restriction");
        }
      }
    });
  };

  const startEditFromRow = (r: any) => {
    setEditingId(r._id || r.id);
    setStartDate(r.startDate.split("T")[0]);
    setEndDate(r.endDate.split("T")[0]);
    setRoomType(r.roomType);
    setBlockedCount(r.blockedCount);
    setReason(r.reason || "");
    document.getElementById("rr-form-card")?.scrollIntoView({ behavior: "smooth" });
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fadeIn text-slate-700">
      {/* Flatpickr dot styles */}
      <style>{`
        .flatpickr-day { display:flex; flex-direction:column; align-items:center; justify-content:center; padding-bottom:4px !important; height:auto !important; min-height:36px; }
        .flatpickr-day.flatpickr-disabled { opacity:0.35 !important; cursor:not-allowed !important; }
        .flatpickr-day.flatpickr-disabled span { background:#ef4444 !important; }
      `}</style>

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
          <ShieldOff className="h-6 w-6 shrink-0" style={{ color: "#DC2626" }} />
          <span>Room Restrictions</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Partially block rooms of a specific type on available dates.
          Date pickers show <span className="text-emerald-600 font-bold">● available</span> and{" "}
          <span className="text-red-500 font-bold">● blocked</span> dates for the selected room type.
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROOM_TYPES.map((rt) => {
          const activeCount = restrictions.filter((r) => r.roomType === rt.id).length;
          const colors = ROOM_COLORS[rt.id];
          const Icon   = rt.icon;
          return (
            <div 
              key={rt.id} 
              className="rounded-2xl border bg-white p-4 flex items-center gap-3 transition-all duration-200"
              style={{ borderColor: "rgba(29, 78, 216, 0.08)", boxShadow: "0 2px 10px rgba(13,27,74,0.03)" }}
            >
              <div className={`rounded-xl p-2 border ${colors.badge}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#94A3B8" }}>{rt.id}</p>
                <p className="text-sm font-bold text-slate-800">{rt.total} rooms</p>
                {activeCount > 0 && (
                  <p className={`text-[9px] font-bold ${colors.accent}`}>
                    {activeCount} active restriction{activeCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Form Card ── */}
        <div
          id="rr-form-card"
          className="rounded-2xl p-6 space-y-5 self-start scroll-mt-20"
          style={{ 
            background: "white",
            border: "1px solid rgba(29,78,216,0.1)",
            boxShadow: "0 4px 20px rgba(13,27,74,0.06)"
          }}
        >
          <h2 
            className="text-base font-bold flex items-center gap-2 pb-3 border-b"
            style={{ color: "#0F172A", fontFamily: "Georgia, serif", borderColor: "#F1F5F9" }}
          >
            {editingId ? <Pencil className="h-4.5 w-4.5" style={{ color: "#DC2626" }} /> : <Plus className="h-4.5 w-4.5" style={{ color: "#1D4ED8" }} />}
            <span>{editingId ? "Edit Restriction" : "Add Restriction"}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs text-slate-655">
            {/* Alerts */}
            {error && (
              <div 
                className="rounded-xl border p-3.5 flex items-center gap-2"
                style={{ borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", color: "#DC2626" }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div 
                className="rounded-xl border p-3.5 flex items-center gap-2"
                style={{ borderColor: "rgba(5,150,105,0.2)", background: "rgba(5,150,105,0.05)", color: "#059669" }}
              >
                <span>{success}</span>
              </div>
            )}

            {/* Room Type selector */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Room Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_TYPES.map((rt) => {
                  const colors     = ROOM_COLORS[rt.id];
                  const Icon       = rt.icon;
                  const isSelected = roomType === rt.id;
                  const typeFullyBlocked = !!getOverlapBlock(startDate, endDate, rt.id, blockedRanges);
                  return (
                    <button
                      type="button"
                      key={rt.id}
                      onClick={() => setRoomType(rt.id)}
                      className={`relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer text-left ${
                        isSelected
                          ? `${colors.badge} border-current shadow-sm`
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-tight flex-1">{rt.label}</span>
                      {typeFullyBlocked && (
                        <span
                          className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-red-500 border border-white"
                          title="Dates overlap a full block for this room type"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date pickers */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Date Range
              </label>

              {/* Calendar legend */}
              <div className="flex items-center gap-4 mb-2 text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Blocked (disabled)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">From Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: "var(--hd-gray-400)" }} />
                    <input
                      type="text"
                      id="rr-startDate"
                      required
                      placeholder="dd/mm/yyyy"
                      style={{ display: "none" }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1.5 font-bold">To Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: "var(--hd-gray-400)" }} />
                    <input
                      type="text"
                      id="rr-endDate"
                      required
                      placeholder="dd/mm/yyyy"
                      style={{ display: "none" }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Overlap warning */}
              {overlapBlock && (
                <div 
                  className="mt-3 rounded-xl border p-3 flex gap-2"
                  style={{ borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", color: "#DC2626" }}
                >
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5" style={{ color: "#B91C1C" }}>
                      {overlapBlock.roomType === "All" ? "Entire hotel" : `${roomType} rooms` } fully blocked on these dates
                    </p>
                    <p className="opacity-90 leading-relaxed">
                      {overlapBlock.roomType === "All"
                        ? "A full hotel block already covers this date range — no rooms of any type can be booked. A restriction is not needed."
                        : `These dates are already fully blocked for ${roomType} rooms via the Date Blocker. Guests cannot book any ${roomType} rooms here. A restriction is redundant.` }
                    </p>
                    {overlapBlock.reason && (
                      <p className="mt-1 opacity-70 italic">Block reason: {overlapBlock.reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Blocked Count Slider */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-3 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Rooms to Block
              </label>

              <div className="rounded-xl border p-4 space-y-3 mb-3" style={{ borderColor: "#F1F5F9", background: "#FAFBFF" }}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Total: <span className="font-bold text-slate-800">{maxBlock}</span> rooms</span>
                  <span className="text-slate-500">Available: <span className={`font-bold ${ROOM_COLORS[roomType]?.accent || "text-slate-855"}`}>{availablePreview}</span></span>
                </div>
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${ROOM_COLORS[roomType]?.bar || "bg-blue-600"}`}
                    style={{ width: `${(availablePreview / maxBlock) * 100}%` }}
                  />
                  <div
                    className="absolute right-0 top-0 h-full bg-red-500/70 rounded-full transition-all duration-300"
                    style={{ width: `${(blockedCount / maxBlock) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                  <span className={`flex items-center gap-1 ${ROOM_COLORS[roomType]?.accent || "text-blue-600"}`}>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    {availablePreview} bookable
                  </span>
                  <span className="flex items-center gap-1 text-red-655" style={{ color: "#DC2626" }}>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                    {blockedCount} blocked
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={maxBlock}
                  value={blockedCount}
                  onChange={(e) => setBlockedCount(parseInt(e.target.value, 10))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer accent-red-600"
                />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setBlockedCount(Math.max(0, blockedCount - 1))}
                    className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-655 flex items-center justify-center hover:bg-slate-50 transition cursor-pointer font-bold text-sm">−</button>
                  <input
                    type="number"
                    min={0}
                    max={maxBlock}
                    value={blockedCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setBlockedCount(Math.min(maxBlock, Math.max(0, v)));
                    }}
                    className="w-12 text-center rounded-lg border border-slate-200 bg-white text-slate-800 text-xs py-1.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                  />
                  <button type="button" onClick={() => setBlockedCount(Math.min(maxBlock, blockedCount + 1))}
                    className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-655 flex items-center justify-center hover:bg-slate-50 transition cursor-pointer font-bold text-sm">+</button>
                </div>
              </div>
              <p className="text-[10px] text-slate-455 mt-2">
                Block <span className="text-red-600 font-bold">{blockedCount}</span> of {maxBlock} {roomType} rooms →{" "}
                <span className={`font-bold ${ROOM_COLORS[roomType]?.accent}`}>{availablePreview} will remain bookable</span>
              </p>
            </div>

            {/* Reason */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Reason / Notes
              </label>
              <textarea
                placeholder="e.g. Maintenance, VIP hold, renovation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 resize-none text-xs"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl font-semibold py-3 text-xs tracking-wider uppercase transition cursor-pointer text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #1E3A8A 0%, #DC2626 100%)",
                  boxShadow: "0 2px 10px rgba(30,58,138,0.2)"
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.filter = "none";
                }}
              >
                {submitting ? "Saving..." : editingId ? "Update Restriction" : "Save Restriction"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-3 text-xs tracking-wider uppercase transition cursor-pointer">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Active Restrictions Table ── */}
        <div 
          className="rounded-2xl p-6 lg:col-span-2 space-y-5"
          style={{ 
            background: "white",
            border: "1px solid rgba(29,78,216,0.1)",
            boxShadow: "0 4px 20px rgba(13,27,74,0.06)"
          }}
        >
          <h2 
            className="text-base font-bold flex items-center gap-2 pb-3 border-b"
            style={{ color: "#0F172A", fontFamily: "Georgia, serif", borderColor: "#F1F5F9" }}
          >
            <ShieldOff className="h-4.5 w-4.5" style={{ color: "#DC2626" }} />
            <span>Active Restrictions Registry</span>
          </h2>

          {loading ? (
            <div className="text-center py-20">
              <div 
                className="relative mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent"
                style={{ borderTopColor: "#DC2626", borderRightColor: "#1D4ED8" }}
              />
              <p className="text-slate-400 text-xs">Querying database...</p>
            </div>
          ) : restrictions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              <ShieldOff className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p>No room restrictions active.</p>
              <p className="text-xs mt-1 text-slate-400">All rooms are open for full public booking.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/70">
                      <th className="px-5 py-4">Date Range</th>
                      <th className="px-5 py-4">Room Type</th>
                      <th className="px-5 py-4">Capacity</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {restrictions.map((r) => {
                      const colors     = ROOM_COLORS[r.roomType] || ROOM_COLORS["Deluxe"];
                      const available  = Math.max(0, r.totalRooms - r.blockedCount);
                      const blockedPct = Math.round((r.blockedCount / r.totalRooms) * 100);
                      const hasFullBlock = !!getOverlapBlock(
                         r.startDate.substring(0, 10),
                         r.endDate.substring(0, 10),
                         r.roomType,
                         blockedRanges
                      );
                      return (
                        <tr key={r._id || r.id}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedPreview(r)}
                          title="Click to view details"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800 text-xs">
                              {new Date(r.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              to {new Date(r.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors.badge}`}>
                              {r.roomType}
                            </span>
                            {hasFullBlock && (
                              <div className="mt-1 flex items-center gap-1 text-[9px] text-red-655 font-bold" style={{ color: "#DC2626" }}>
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                                Already fully blocked
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1 min-w-[115px]">
                              <div className="flex justify-between text-[10px]">
                                <span className={`font-bold ${colors.accent}`}>{available} open</span>
                                <span className="text-red-655 font-bold" style={{ color: "#DC2626" }}>{r.blockedCount} blocked</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colors.bar} transition-all`}
                                  style={{ width: `${100 - blockedPct}%` }} />
                              </div>
                              <div className="text-[9px] text-slate-400 font-semibold">{r.totalRooms} total</div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 italic max-w-[140px] truncate">
                            {r.reason || "—"}
                          </td>
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { startEditFromRow(r); }}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => { handleDelete(r._id || r.id); }}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer" title="Remove">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300"
          style={{ background: "rgba(13, 27, 74, 0.4)" }}
          onClick={() => setSelectedPreview(null)}
        >
          <div 
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-[0_20px_50px_rgba(13,27,74,0.15)] animate-scaleUp text-sm"
            style={{ borderColor: "rgba(29, 78, 216, 0.12)", color: "var(--hd-gray-700)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="absolute -right-16 -top-16 h-36 w-36 rounded-full blur-xl pointer-events-none opacity-40"
              style={{ background: "linear-gradient(to bottom right, var(--hd-blue-400), var(--hd-blue-100))" }}
            />

            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "#F1F5F9" }}>
              <h3 
                className="text-lg font-bold flex items-center gap-2"
                style={{ fontFamily: "Georgia, serif", color: "#0F172A" }}
              >
                <ShieldOff className="h-5 w-5" style={{ color: "#DC2626" }} />
                <span>Restriction Details</span>
              </h3>
              <button 
                onClick={() => setSelectedPreview(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Overlap warning inside modal */}
              {getOverlapBlock(selectedPreview.startDate.substring(0,10), selectedPreview.endDate.substring(0,10), selectedPreview.roomType, blockedRanges) && (
                <div 
                  className="rounded-xl border p-3.5 flex gap-2"
                  style={{ borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", color: "#DC2626" }}
                >
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-red-655" />
                  <p>
                    <span className="font-bold">Note:</span> These dates already have a full block for{" "}
                    {selectedPreview.roomType} rooms in the Date Blocker — this restriction is currently redundant.
                  </p>
                </div>
              )}

              <div 
                className="rounded-xl border p-5 space-y-3"
                style={{ borderColor: "rgba(29, 78, 216, 0.1)", background: "rgba(29, 78, 216, 0.02)" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "#1D4ED8" }}>Restricted Duration</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">From</span>
                    <span className="font-semibold text-slate-800 text-base">
                      {new Date(selectedPreview.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="hidden sm:block text-slate-355 font-serif text-xl select-none" style={{ color: "var(--hd-gray-300)" }}>➔</div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">To</span>
                    <span className="font-semibold text-slate-800 text-base">
                      {new Date(selectedPreview.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "#1D4ED8" }}>Capacity Breakdown</span>
                <div className="rounded-xl border p-4 space-y-3 bg-slate-50/50" style={{ borderColor: "#F1F5F9" }}>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${ROOM_COLORS[selectedPreview.roomType]?.badge}`}>
                    {selectedPreview.roomType}
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border bg-white p-3" style={{ borderColor: "#E2E8F0" }}>
                      <p className="text-lg font-bold text-slate-800">{selectedPreview.totalRooms}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-455">Total</p>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "rgba(220,38,38,0.12)", background: "rgba(220,38,38,0.02)" }}>
                      <p className="text-lg font-bold text-red-655" style={{ color: "#DC2626" }}>{selectedPreview.blockedCount}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-red-500">Blocked</p>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "rgba(29,78,216,0.12)", background: "rgba(29,78,216,0.02)" }}>
                      <p className="text-lg font-bold" style={{ color: "#1D4ED8" }}>
                        {Math.max(0, selectedPreview.totalRooms - selectedPreview.blockedCount)}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#1D4ED8" }}>Available</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ROOM_COLORS[selectedPreview.roomType]?.bar}`}
                      style={{ width: `${((selectedPreview.totalRooms - selectedPreview.blockedCount) / selectedPreview.totalRooms) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "#1D4ED8" }}>Reason / Notes</span>
                <div 
                  className="rounded-xl border p-4 italic relative min-h-[52px]"
                  style={{ borderColor: "rgba(29,78,216,0.12)", background: "rgba(29,78,216,0.02)" }}
                >
                  <span className="absolute left-2 top-0 text-slate-200/70 text-4xl select-none font-serif leading-none" style={{ color: "rgba(29,78,216,0.08)" }}>"</span>
                  <p className="pl-4 py-1 text-slate-600 leading-relaxed font-serif text-sm">
                    {selectedPreview.reason || "No specific reason was provided."}
                  </p>
                </div>
              </div>

              {selectedPreview.createdAt && (
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Created: {new Date(selectedPreview.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 bg-slate-50 flex flex-wrap gap-2 items-center justify-between" style={{ borderColor: "#F1F5F9" }}>
              <button
                onClick={() => { const id = selectedPreview._id || selectedPreview.id; setSelectedPreview(null); handleDelete(id); }}
                className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /><span>Remove</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { startEditFromRow(selectedPreview); setSelectedPreview(null); }}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" /><span>Edit</span>
                </button>
                <button onClick={() => setSelectedPreview(null)}
                  className="rounded-xl text-white font-bold text-xs px-5 py-2.5 transition cursor-pointer active:scale-95"
                  style={{ background: "#1D4ED8", boxShadow: "0 2px 10px rgba(29,78,216,0.2)" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isDestructive={confirmState.isDestructive}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
