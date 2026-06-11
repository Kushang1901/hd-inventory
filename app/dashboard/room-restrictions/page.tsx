"use client";

import React, { useEffect, useRef, useState } from "react";
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
  Standard:      { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",    bar: "bg-blue-500",    accent: "text-blue-400"    },
  Deluxe:        { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", bar: "bg-amber-500",   accent: "text-amber-400"   },
  "Super Deluxe":{ badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",bar: "bg-purple-500", accent: "text-purple-400"  },
  Suite:         { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",bar:"bg-emerald-500",accent:"text-emerald-400"},
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
  const [blockedCount, setBlockedCount]     = useState(1);
  const [reason, setReason]                 = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<any | null>(null);

  // Flatpickr instances kept in refs (not state) so we can call .set() imperatively
  const startFpRef = useRef<any>(null);
  const endFpRef   = useRef<any>(null);

  // Refs used inside Flatpickr callbacks so closures always read latest values
  const blockedRangesRef = useRef<any[]>([]);
  const roomTypeRef      = useRef<string>("Deluxe");

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
        blockedRangesRef.current = data.data || [];
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchRestrictions();
    fetchBlockedRanges();
  }, []);

  // ── keep refs in sync with state ───────────────────────────────────────────

  useEffect(() => { blockedRangesRef.current = blockedRanges; }, [blockedRanges]);
  useEffect(() => { roomTypeRef.current = roomType; },          [roomType]);

  // ── Flatpickr init (once) ─────────────────────────────────────────────────

  useEffect(() => {
    let sFp: any = null;
    let eFp: any = null;

    import("flatpickr").then((module) => {
      const fp = module.default;
      import("flatpickr/dist/themes/dark.css");

      /** Adds a green "available" dot or red "blocked" dot to each calendar day */
      const onDayCreate = (_dObj: any, _dStr: any, _fp: any, dayElem: any) => {
        const dateStr = toISO(dayElem.dateObj);
        const blocks  = blockedRangesRef.current;
        const rt      = roomTypeRef.current;
        const isBlocked = blocks.some((b) => {
          const bs = b.startDate.substring(0, 10);
          const be = b.endDate.substring(0, 10);
          return dateStr >= bs && dateStr <= be && (b.roomType === "All" || b.roomType === rt);
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
        disable: getDisabledRanges(roomTypeRef.current, blockedRangesRef.current),
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
  }, []);

  // ── Update Flatpickr disable list when roomType or blockedRanges change ────

  useEffect(() => {
    const disabled = getDisabledRanges(roomType, blockedRanges);
    if (startFpRef.current) {
      startFpRef.current.set("disable", disabled);
      startFpRef.current.redraw?.();
    }
    if (endFpRef.current) {
      endFpRef.current.set("disable", disabled);
      endFpRef.current.redraw?.();
    }
  }, [roomType, blockedRanges]);

  // ── Sync state → Flatpickr when editing an existing restriction ───────────

  useEffect(() => {
    if (startFpRef.current) startFpRef.current.setDate(startDate || "", false);
    if (endFpRef.current)   endFpRef.current.setDate(endDate || "", false);
  }, [startDate, endDate]);

  // ── Reset blocked count when room type changes ─────────────────────────────

  useEffect(() => { setBlockedCount(1); }, [roomType]);

  // ── form helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setStartDate(getLocalDateString());
    setEndDate(getLocalDateString());
    setRoomType("Deluxe");
    setBlockedCount(1);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this room restriction? Guests will be able to book those rooms again on these dates.")) return;
    try {
      const res  = await fetch(`/api/room-restrictions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchRestrictions();
      else alert(data.error || "Failed to remove restriction");
    } catch {
      alert("Network error removing restriction");
    }
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
    <div className="space-y-8 animate-fadeIn">
      {/* Flatpickr dot styles */}
      <style>{`
        .flatpickr-day { display:flex; flex-direction:column; align-items:center; justify-content:center; padding-bottom:4px !important; height:auto !important; min-height:36px; }
        .flatpickr-day.flatpickr-disabled { opacity:0.35 !important; cursor:not-allowed !important; }
        .flatpickr-day.flatpickr-disabled span { background:#ef4444 !important; }
      `}</style>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white font-semibold flex items-center gap-2">
          <ShieldOff className="h-6 w-6 text-amber-500" />
          <span>Room Restrictions</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">
          Partially block rooms of a specific type on available dates.
          Date pickers show <span className="text-emerald-400 font-semibold">● available</span> and{" "}
          <span className="text-red-400 font-semibold">● blocked</span> dates for the selected room type.
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROOM_TYPES.map((rt) => {
          const activeCount = restrictions.filter((r) => r.roomType === rt.id).length;
          const colors = ROOM_COLORS[rt.id];
          const Icon   = rt.icon;
          return (
            <div key={rt.id} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${colors.badge}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{rt.id}</p>
                <p className="text-sm font-bold text-white">{rt.total} rooms</p>
                {activeCount > 0 && (
                  <p className={`text-[9px] font-semibold ${colors.accent}`}>
                    {activeCount} restriction{activeCount > 1 ? "s" : ""} active
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Form Card ── */}
        <div
          id="rr-form-card"
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6 self-start scroll-mt-20"
        >
          <h2 className="text-lg font-serif text-white flex items-center gap-2 border-b border-zinc-800/60 pb-3">
            {editingId ? <Pencil className="h-4 w-4 text-amber-500" /> : <Plus className="h-4 w-4 text-amber-500" />}
            <span>{editingId ? "Edit Restriction" : "Add Restriction"}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5 text-sm text-zinc-300">
            {/* Alerts */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                {success}
              </div>
            )}

            {/* Room Type selector */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                Room Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_TYPES.map((rt) => {
                  const colors     = ROOM_COLORS[rt.id];
                  const Icon       = rt.icon;
                  const isSelected = roomType === rt.id;
                  // Check if this type is fully blocked for the selected dates
                  const typeFullyBlocked = !!getOverlapBlock(startDate, endDate, rt.id, blockedRanges);
                  return (
                    <button
                      type="button"
                      key={rt.id}
                      onClick={() => setRoomType(rt.id)}
                      className={`relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition cursor-pointer text-left ${
                        isSelected
                          ? `${colors.badge} border-current shadow-sm`
                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-tight flex-1">{rt.label}</span>
                      {typeFullyBlocked && (
                        <span
                          className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-zinc-950"
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
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                Date Range
              </label>

              {/* Calendar legend */}
              <div className="flex items-center gap-4 mb-2 text-[10px] text-zinc-500">
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
                  <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">From Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      id="rr-startDate"
                      required
                      placeholder="dd/mm/yyyy"
                      style={{ display: "none" }}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 py-2.5 text-zinc-200 outline-none focus:border-amber-500/50 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">To Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      id="rr-endDate"
                      required
                      placeholder="dd/mm/yyyy"
                      style={{ display: "none" }}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 py-2.5 text-zinc-200 outline-none focus:border-amber-500/50 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Overlap warning */}
              {overlapBlock && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <p className="font-semibold text-red-400 mb-0.5">
                      {overlapBlock.roomType === "All" ? "Entire hotel" : `${roomType} rooms`} fully blocked on these dates
                    </p>
                    <p className="text-red-400/80 leading-relaxed">
                      {overlapBlock.roomType === "All"
                        ? "A full hotel block already covers this date range — no rooms of any type can be booked. A restriction is not needed."
                        : `These dates are already fully blocked for ${roomType} rooms via the Date Blocker. Guests cannot book any ${roomType} rooms here. A restriction is redundant.`}
                    </p>
                    {overlapBlock.reason && (
                      <p className="mt-1 text-red-400/60 italic">Block reason: {overlapBlock.reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Blocked Count Slider */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-3 font-semibold">
                Rooms to Block
              </label>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total: <span className="font-bold text-white">{maxBlock}</span> rooms</span>
                  <span className="text-zinc-400">Available: <span className={`font-bold ${ROOM_COLORS[roomType]?.accent || "text-white"}`}>{availablePreview}</span></span>
                </div>
                <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${ROOM_COLORS[roomType]?.bar || "bg-amber-500"}`}
                    style={{ width: `${(availablePreview / maxBlock) * 100}%` }}
                  />
                  <div
                    className="absolute right-0 top-0 h-full bg-red-500/60 rounded-full transition-all duration-300"
                    style={{ width: `${(blockedCount / maxBlock) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`flex items-center gap-1 font-semibold ${ROOM_COLORS[roomType]?.accent || "text-amber-400"}`}>
                    <span className="inline-block h-2 w-2 rounded-full bg-current" />
                    {availablePreview} bookable
                  </span>
                  <span className="flex items-center gap-1 text-red-400 font-semibold">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    {blockedCount} blocked
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={maxBlock}
                  value={blockedCount}
                  onChange={(e) => setBlockedCount(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 rounded-full appearance-none bg-zinc-800 cursor-pointer accent-red-500"
                />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setBlockedCount(Math.max(1, blockedCount - 1))}
                    className="h-7 w-7 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 flex items-center justify-center hover:bg-zinc-800 transition cursor-pointer font-bold text-sm">−</button>
                  <input
                    type="number"
                    min={1}
                    max={maxBlock}
                    value={blockedCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setBlockedCount(Math.min(maxBlock, Math.max(1, v)));
                    }}
                    className="w-12 text-center rounded-lg border border-zinc-700 bg-zinc-950 text-white text-sm py-1 outline-none focus:border-amber-500/50"
                  />
                  <button type="button" onClick={() => setBlockedCount(Math.min(maxBlock, blockedCount + 1))}
                    className="h-7 w-7 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 flex items-center justify-center hover:bg-zinc-800 transition cursor-pointer font-bold text-sm">+</button>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Block <span className="text-red-400 font-bold">{blockedCount}</span> of {maxBlock} {roomType} rooms →{" "}
                <span className={`font-bold ${ROOM_COLORS[roomType]?.accent}`}>{availablePreview} will remain bookable</span>
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                Reason / Notes
              </label>
              <textarea
                placeholder="e.g. Maintenance, VIP hold, renovation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-zinc-200 outline-none focus:border-amber-500/50 resize-none text-xs"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-800 to-amber-600 hover:from-red-700 hover:to-amber-500 text-white font-medium py-3 text-xs tracking-wider uppercase transition cursor-pointer shadow active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Restriction" : "Save Restriction"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 font-medium px-4 py-3 text-xs tracking-wider uppercase transition cursor-pointer">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Active Restrictions Table ── */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 lg:col-span-2 space-y-6">
          <h2 className="text-lg font-serif text-white flex items-center gap-2 border-b border-zinc-800/60 pb-3">
            <ShieldOff className="h-4.5 w-4.5 text-amber-500" />
            <span>Active Restrictions Registry</span>
          </h2>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Querying database...</p>
            </div>
          ) : restrictions.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
              <ShieldOff className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
              <p>No room restrictions active.</p>
              <p className="text-xs mt-1 text-zinc-600">All rooms are open for full public booking.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-950">
                      <th className="px-5 py-4">Date Range</th>
                      <th className="px-5 py-4">Room Type</th>
                      <th className="px-5 py-4">Capacity</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                    {restrictions.map((r) => {
                      const colors     = ROOM_COLORS[r.roomType] || ROOM_COLORS["Deluxe"];
                      const available  = Math.max(0, r.totalRooms - r.blockedCount);
                      const blockedPct = Math.round((r.blockedCount / r.totalRooms) * 100);
                      // Check if these dates are also in a full block
                      const hasFullBlock = !!getOverlapBlock(
                        r.startDate.substring(0, 10),
                        r.endDate.substring(0, 10),
                        r.roomType,
                        blockedRanges
                      );
                      return (
                        <tr key={r._id || r.id}
                          className="hover:bg-zinc-900/20 cursor-pointer transition-colors"
                          onClick={() => setSelectedPreview(r)}
                          title="Click to view details"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white text-xs">
                              {new Date(r.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              to {new Date(r.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${colors.badge}`}>
                              {r.roomType}
                            </span>
                            {hasFullBlock && (
                              <div className="mt-1 flex items-center gap-1 text-[9px] text-red-400 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                                Already fully blocked
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1 min-w-[110px]">
                              <div className="flex justify-between text-[10px]">
                                <span className={`font-bold ${colors.accent}`}>{available} open</span>
                                <span className="text-red-400 font-bold">{r.blockedCount} blocked</span>
                              </div>
                              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colors.bar} transition-all`}
                                  style={{ width: `${100 - blockedPct}%` }} />
                              </div>
                              <div className="text-[9px] text-zinc-600">{r.totalRooms} total</div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-zinc-400 italic max-w-[140px] truncate">
                            {r.reason || "—"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={(e) => { e.stopPropagation(); startEditFromRow(r); }}
                                className="rounded p-2 text-zinc-500 hover:bg-amber-500/10 hover:text-amber-400 transition cursor-pointer" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(r._id || r.id); }}
                                className="rounded p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer" title="Remove">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md"
          onClick={() => setSelectedPreview(null)}>
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-scaleUp text-sm text-zinc-300"
            onClick={(e) => e.stopPropagation()}>
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-amber-500/10 to-red-600/10 blur-xl pointer-events-none" />

            <div className="border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-serif text-white font-semibold flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-amber-500" />
                <span>Restriction Details</span>
              </h3>
              <button onClick={() => setSelectedPreview(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Overlap warning inside modal */}
              {getOverlapBlock(selectedPreview.startDate.substring(0,10), selectedPreview.endDate.substring(0,10), selectedPreview.roomType, blockedRanges) && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <p>
                    <span className="font-semibold text-red-400">Note:</span> These dates already have a full block for{" "}
                    {selectedPreview.roomType} rooms in the Date Blocker — this restriction is currently redundant.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 block">Restricted Duration</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">From</span>
                    <span className="font-semibold text-white text-base">
                      {new Date(selectedPreview.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="hidden sm:block text-zinc-600 font-serif text-xl select-none">➔</div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">To</span>
                    <span className="font-semibold text-white text-base">
                      {new Date(selectedPreview.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 block">Capacity Breakdown</span>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${ROOM_COLORS[selectedPreview.roomType]?.badge}`}>
                    {selectedPreview.roomType}
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-zinc-900 p-3">
                      <p className="text-lg font-bold text-white">{selectedPreview.totalRooms}</p>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-500">Total</p>
                    </div>
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-lg font-bold text-red-400">{selectedPreview.blockedCount}</p>
                      <p className="text-[9px] uppercase tracking-wider text-red-500/70">Blocked</p>
                    </div>
                    <div className={`rounded-lg p-3 border ${ROOM_COLORS[selectedPreview.roomType]?.badge}`}>
                      <p className={`text-lg font-bold ${ROOM_COLORS[selectedPreview.roomType]?.accent}`}>
                        {Math.max(0, selectedPreview.totalRooms - selectedPreview.blockedCount)}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider opacity-70">Available</p>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ROOM_COLORS[selectedPreview.roomType]?.bar}`}
                      style={{ width: `${((selectedPreview.totalRooms - selectedPreview.blockedCount) / selectedPreview.totalRooms) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 block">Reason / Notes</span>
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 italic text-zinc-300 relative min-h-[52px]">
                  <span className="absolute left-2 top-0 text-amber-500/20 text-4xl select-none font-serif leading-none">"</span>
                  <p className="pl-4 py-1 text-zinc-300 leading-relaxed font-serif text-sm">
                    {selectedPreview.reason || "No specific reason was provided."}
                  </p>
                </div>
              </div>

              {selectedPreview.createdAt && (
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Created: {new Date(selectedPreview.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800/80 px-6 py-4 bg-zinc-950/50 flex flex-wrap gap-2 items-center justify-between">
              <button
                onClick={() => { const id = selectedPreview._id || selectedPreview.id; setSelectedPreview(null); handleDelete(id); }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /><span>Remove</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { startEditFromRow(selectedPreview); setSelectedPreview(null); }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" /><span>Edit</span>
                </button>
                <button onClick={() => setSelectedPreview(null)}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-5 py-2.5 transition cursor-pointer active:scale-95">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
