"use client";

import React, { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { 
  CalendarOff, 
  Plus, 
  Trash2, 
  AlertCircle,
  Calendar,
  Layers,
  HelpCircle,
  Pencil,
  X,
  Clock
} from "lucide-react";

export default function BlockedDatesManagement() {
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [roomType, setRoomType] = useState("All");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedPreviewBlock, setSelectedPreviewBlock] = useState<any | null>(null);
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

  // Flatpickr instances references
  const [startFp, setStartFp] = useState<any>(null);
  const [endFp, setEndFp] = useState<any>(null);

  const fetchBlocks = async () => {
    try {
      const res = await fetch("/api/blocked-dates");
      const data = await res.json();
      if (data.success) {
        setBlocks(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch blocks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  // Load Flatpickr dynamically client-side and initialize pickers
  useEffect(() => {
    let activeStartFp: any = null;
    let activeEndFp: any = null;

    // Dynamically import flatpickr inside useEffect to bypass SSR window issues
    import("flatpickr").then((module) => {
      const fp = module.default;
      
      // Load flatpickr base stylesheet
      import("flatpickr/dist/flatpickr.css");

      activeStartFp = fp("#startDate", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        allowInput: true,
        defaultDate: startDate || undefined,
        minDate: "today",
        parseDate: (datestr) => {
          if (datestr && datestr.includes("/")) {
            const parts = datestr.split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              const d = new Date(year, month, day);
              if (!isNaN(d.getTime())) return d;
            }
          }
          return new Date(datestr);
        },
        onChange: (selectedDates: any[], dateStr: string) => {
          setStartDate(dateStr);
          if (activeEndFp && selectedDates.length > 0) {
            const nextDay = new Date(selectedDates[0]);
            nextDay.setDate(nextDay.getDate() + 1);
            activeEndFp.set("minDate", nextDay);
          }
        }
      });

      activeEndFp = fp("#endDate", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        allowInput: true,
        defaultDate: endDate || undefined,
        minDate: startDate || "today",
        parseDate: (datestr) => {
          if (datestr && datestr.includes("/")) {
            const parts = datestr.split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              const d = new Date(year, month, day);
              if (!isNaN(d.getTime())) return d;
            }
          }
          return new Date(datestr);
        },
        onChange: (selectedDates: any[], dateStr: string) => {
          setEndDate(dateStr);
        }
      });

      setStartFp(activeStartFp);
      setEndFp(activeEndFp);

      // Auto-slash helper for typed date inputs
      const setupAutoSlash = (element: HTMLInputElement, fpInstance: any) => {
        if (!element) return;
        element.addEventListener("input", function (e: any) {
          let value = e.target.value;
          let clean = value.replace(/\D/g, "");
          if (clean.length > 8) {
            clean = clean.slice(0, 8);
          }
          let formatted = "";
          if (clean.length > 0) {
            formatted += clean.slice(0, 2);
          }
          if (clean.length > 2) {
            formatted += "/" + clean.slice(2, 4);
          }
          if (clean.length > 4) {
            formatted += "/" + clean.slice(4, 8);
          }
          e.target.value = formatted;

          // If a complete valid date is entered (10 chars), sync it to Flatpickr
          if (formatted.length === 10) {
            const parts = formatted.split("/");
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime()) && year >= 2020) {
              fpInstance.setDate(d, true); // true triggers the onChange event
            }
          }
        });
      };

      if (activeStartFp && activeStartFp.altInput) {
        setupAutoSlash(activeStartFp.altInput, activeStartFp);
      }
      if (activeEndFp && activeEndFp.altInput) {
        setupAutoSlash(activeEndFp.altInput, activeEndFp);
      }
    });

    return () => {
      if (activeStartFp) activeStartFp.destroy();
      if (activeEndFp) activeEndFp.destroy();
    };
  }, []);

  // Sync React state changes (e.g. form clearing, edit selection) back to Flatpickr instances
  useEffect(() => {
    if (startFp) startFp.setDate(startDate || "", false);
    if (endFp) endFp.setDate(endDate || "", false);
  }, [startDate, endDate, startFp, endFp]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const url = "/api/blocked-dates";
      const method = editingBlockId ? "PUT" : "POST";
      const bodyPayload = editingBlockId 
        ? { id: editingBlockId, startDate, endDate, roomType, reason }
        : { startDate, endDate, roomType, reason };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess(editingBlockId ? "Date block updated successfully!" : "Date block saved successfully!");
        setStartDate(getLocalDateString());
        setEndDate(getLocalDateString());
        setReason("");
        setRoomType("All");
        setEditingBlockId(null);
        fetchBlocks();
      } else {
        setError(data.error || "Failed to block dates.");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBlock = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Remove Date Block",
      message: "Are you sure you want to remove this date block? This will instantly reopen booking for these dates.",
      confirmText: "Lift Block",
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/blocked-dates?id=${id}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (data.success) {
            fetchBlocks();
          } else {
            alert(data.error || "Failed to remove block");
          }
        } catch {
          alert("Network error unblocking dates");
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-700">
      {/* Header */}
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
          <CalendarOff className="h-6 w-6 shrink-0" style={{ color: "#DC2626" }} />
          <span>Date & Room Blocker</span>
        </h1>
        <p className="text-xs md:text-sm" style={{ color: "#64748B" }}>
          Disable check-ins for specific dates when rooms are fully booked or undergoing maintenance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add Block Form Card */}
        <div 
          id="block-form-card" 
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
            {editingBlockId ? (
              <Pencil className="h-4.5 w-4.5" style={{ color: "#DC2626" }} />
            ) : (
              <Plus className="h-4.5 w-4.5" style={{ color: "#1D4ED8" }} />
            )}
            <span>{editingBlockId ? "Edit Date Block" : "Create Date Block"}</span>
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
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

            {/* Start Date */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Start Date (Check-In)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-455 pointer-events-none" style={{ color: "var(--hd-gray-400)" }} />
                <input
                  type="text"
                  id="startDate"
                  required
                  placeholder="dd/mm/yyyy"
                  style={{ display: "none" }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                End Date (Check-Out)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-455 pointer-events-none" style={{ color: "var(--hd-gray-400)" }} />
                <input
                  type="text"
                  id="endDate"
                  required
                  placeholder="dd/mm/yyyy"
                  style={{ display: "none" }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
              </div>
            </div>

            {/* Block Scope / Room Type */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Scope / Room Type
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-455 pointer-events-none" style={{ color: "var(--hd-gray-400)" }} />
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 cursor-pointer appearance-none"
                >
                  <option value="All">Entire Hotel (All Rooms)</option>
                  <option value="Standard">Standard Rooms Only</option>
                  <option value="Deluxe">Deluxe Rooms Only</option>
                  <option value="Super Deluxe">Super Deluxe Rooms Only</option>
                  <option value="Suite">Suite Rooms Only</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-sans text-xs">▼</div>
              </div>
            </div>

            {/* Notes/Reason */}
            <div>
              <label 
                className="block text-[10px] uppercase tracking-wider mb-2 font-bold"
                style={{ color: "#1E3A8A" }}
              >
                Reason / Note
              </label>
              <textarea
                placeholder="e.g. Peak Season block, maintenance, group booking..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200 resize-none"
              />
            </div>

            {/* Submit */}
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
                {submitting ? "Processing..." : (editingBlockId ? "Update Block" : "Block Dates")}
              </button>
              {editingBlockId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlockId(null);
                    setStartDate(getLocalDateString());
                    setEndDate(getLocalDateString());
                    setReason("");
                    setRoomType("All");
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-3 text-xs tracking-wider uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Active Blocks List panel */}
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
            <CalendarOff className="h-4.5 w-4.5" style={{ color: "#DC2626" }} />
            <span>Active Block Registry</span>
          </h2>

          {loading ? (
            <div className="text-center py-20">
              <div 
                className="relative mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent"
                style={{ borderTopColor: "#DC2626", borderRightColor: "#1D4ED8" }}
              />
              <p className="text-slate-400 text-xs">Querying database...</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              No date blocks are currently active. All rooms are open for public booking!
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-50/70">
                      <th className="px-6 py-4">Blocked Dates</th>
                      <th className="px-6 py-4">Block Scope</th>
                      <th className="px-6 py-4">Reason / Notes</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {blocks.map((b) => (
                      <tr 
                        key={b.id || b._id} 
                        className="hover:bg-slate-50/50 hover:cursor-pointer transition-colors"
                        onClick={() => setSelectedPreviewBlock(b)}
                        title="Click to view full block details"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {new Date(b.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            to {new Date(b.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              b.roomType === "All" 
                                ? "bg-red-50 text-red-700 border-red-100" 
                                : "bg-blue-55 text-blue-700 border-blue-100"
                            }`}
                            style={{ 
                              background: b.roomType === "All" ? "rgba(220,38,38,0.06)" : "rgba(29,78,216,0.06)",
                              color: b.roomType === "All" ? "#DC2626" : "#1D4ED8",
                              borderColor: b.roomType === "All" ? "rgba(220,38,38,0.15)" : "rgba(29,78,216,0.15)"
                            }}
                          >
                            {b.roomType === "All" ? "Entire Hotel" : `${b.roomType} Rooms`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">
                          {b.reason || "No notes"}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setStartDate(b.startDate.split("T")[0]);
                              setEndDate(b.endDate.split("T")[0]);
                              setRoomType(b.roomType);
                              setReason(b.reason || "");
                              setEditingBlockId(b.id || b._id);
                              document.getElementById("block-form-card")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                            title="Edit date block"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              handleRemoveBlock(b.id || b._id);
                            }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                            title="Remove date block"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Block Preview Modal */}
      {selectedPreviewBlock && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300"
          style={{ background: "rgba(13, 27, 74, 0.4)" }}
          onClick={() => setSelectedPreviewBlock(null)}
        >
          <div 
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-[0_20px_50px_rgba(13,27,74,0.15)] animate-scaleUp text-sm"
            style={{ borderColor: "rgba(29, 78, 216, 0.12)", color: "var(--hd-gray-700)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background glow */}
            <div 
              className="absolute -right-16 -top-16 h-36 w-36 rounded-full blur-xl pointer-events-none opacity-40"
              style={{ background: "linear-gradient(to bottom right, var(--hd-blue-400), var(--hd-blue-100))" }}
            />
            
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "#F1F5F9" }}>
              <h3 
                className="text-lg font-bold flex items-center gap-2"
                style={{ fontFamily: "Georgia, serif", color: "#0F172A" }}
              >
                <CalendarOff className="h-5 w-5" style={{ color: "#DC2626" }} />
                <span>Date Block Specifications</span>
              </h3>
              <button 
                onClick={() => setSelectedPreviewBlock(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              
              {/* Date Highlight Box */}
              <div 
                className="rounded-xl border p-5 space-y-3 relative overflow-hidden"
                style={{ borderColor: "rgba(29, 78, 216, 0.1)", background: "rgba(29, 78, 216, 0.02)" }}
              >
                <div className="absolute right-4 top-4 text-slate-200/50 font-mono font-bold text-5xl select-none pointer-events-none">
                  {(() => {
                    const startStr = selectedPreviewBlock.startDate.substring(0, 10);
                    const endStr = selectedPreviewBlock.endDate.substring(0, 10);
                    const [sYear, sMonth, sDay] = startStr.split("-").map(Number);
                    const [eYear, eMonth, eDay] = endStr.split("-").map(Number);
                    
                    const startMidnight = Date.UTC(sYear, sMonth - 1, sDay);
                    const endMidnight = Date.UTC(eYear, eMonth - 1, eDay);
                    
                    const diff = Math.abs(endMidnight - startMidnight);
                    const daysGap = Math.round(diff / (1000 * 60 * 60 * 24));
                    return `${daysGap}d`;
                  })()}
                </div>
                
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "#1D4ED8" }}>Blocked Duration</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Check-In</span>
                    <span className="font-semibold text-slate-800 text-base">
                      {new Date(selectedPreviewBlock.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="hidden sm:block text-slate-300 font-serif text-xl select-none">➔</div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Check-Out</span>
                    <span className="font-semibold text-slate-800 text-base">
                      {new Date(selectedPreviewBlock.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scope Card */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "#1D4ED8" }}>Scope of Restriction</span>
                <div className="flex items-center gap-3">
                  <span 
                    className="inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{ 
                      background: selectedPreviewBlock.roomType === "All" ? "rgba(220,38,38,0.06)" : "rgba(29,78,216,0.06)",
                      color: selectedPreviewBlock.roomType === "All" ? "#DC2626" : "#1D4ED8",
                      borderColor: selectedPreviewBlock.roomType === "All" ? "rgba(220,38,38,0.15)" : "rgba(29,78,216,0.15)"
                    }}
                  >
                    {selectedPreviewBlock.roomType === "All" ? "Entire Hotel Blocked" : `${selectedPreviewBlock.roomType} Rooms Blocked`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {selectedPreviewBlock.roomType === "All" 
                    ? "All rooms and classifications (Standard, Deluxe, Super Deluxe, Suite) are completely locked. Guests cannot select check-in dates matching this window."
                    : `Only the ${selectedPreviewBlock.roomType} room category is restricted. Other room categories remain open and searchable on public booking wizards.`}
                </p>
              </div>

              {/* Reason card */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "#1D4ED8" }}>Reason / Administrative Notes</span>
                <div 
                  className="rounded-xl border p-4 italic relative min-h-[60px]"
                  style={{ borderColor: "rgba(29,78,216,0.12)", background: "rgba(29,78,216,0.02)" }}
                >
                  <span className="absolute left-2 top-0 text-slate-200/70 text-4xl select-none font-serif leading-none" style={{ color: "rgba(29,78,216,0.08)" }}>“</span>
                  <p className="pl-4 py-1 text-slate-600 leading-relaxed font-serif text-sm">
                    {selectedPreviewBlock.reason || "No specific reason or administrative notes were registered for this block window."}
                  </p>
                </div>
              </div>

              {/* Audit info */}
              {selectedPreviewBlock.createdAt && (
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Registered: {new Date(selectedPreviewBlock.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              )}

            </div>

            {/* Footer controls */}
            <div className="border-t px-6 py-4 bg-slate-50 flex flex-wrap gap-2 items-center justify-between" style={{ borderColor: "#F1F5F9" }}>
              <button
                onClick={() => {
                  const id = selectedPreviewBlock.id || selectedPreviewBlock._id;
                  setSelectedPreviewBlock(null);
                  handleRemoveBlock(id);
                }}
                className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Lift Block</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStartDate(selectedPreviewBlock.startDate.split("T")[0]);
                    setEndDate(selectedPreviewBlock.endDate.split("T")[0]);
                    setRoomType(selectedPreviewBlock.roomType);
                    setReason(selectedPreviewBlock.reason || "");
                    setEditingBlockId(selectedPreviewBlock.id || selectedPreviewBlock._id);
                    setSelectedPreviewBlock(null);
                    document.getElementById("block-form-card")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Block</span>
                </button>
                
                <button
                  onClick={() => setSelectedPreviewBlock(null)}
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
