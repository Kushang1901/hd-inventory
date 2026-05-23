"use client";

import React, { useEffect, useState } from "react";
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
    let isMounted = true;
    
    const loadFlatpickr = async () => {
      // Add Flatpickr CSS to document head if not present
      if (!document.getElementById("flatpickr-css")) {
        const link = document.createElement("link");
        link.id = "flatpickr-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
        document.head.appendChild(link);
        
        // Load Dark theme for Flatpickr to match the premium dark theme of admin dashboard
        const darkTheme = document.createElement("link");
        darkTheme.id = "flatpickr-dark-css";
        darkTheme.rel = "stylesheet";
        darkTheme.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css";
        document.head.appendChild(darkTheme);
      }
      
      // Load script if not already present
      if (!(window as any).flatpickr) {
        const scriptId = "flatpickr-js";
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://cdn.jsdelivr.net/npm/flatpickr";
          script.onload = () => {
            if (isMounted) initPicker();
          };
          document.body.appendChild(script);
        }
      } else {
        if (isMounted) initPicker();
      }
    };

    const initPicker = () => {
      const fp = (window as any).flatpickr;
      if (!fp) return;
      
      const startEl = document.getElementById("startDate");
      const endEl = document.getElementById("endDate");
      
      if (startEl && endEl) {
        const startPicker = fp(startEl, {
          dateFormat: "Y-m-d",
          allowInput: true,
          defaultDate: startDate || undefined,
          minDate: "today",
          onChange: (selectedDates: any[], dateStr: string) => {
            setStartDate(dateStr);
            if (selectedDates.length > 0) {
              const nextDay = new Date(selectedDates[0]);
              nextDay.setDate(nextDay.getDate() + 1);
              endPicker.set("minDate", nextDay);
            }
          }
        });
        
        const endPicker = fp(endEl, {
          dateFormat: "Y-m-d",
          allowInput: true,
          defaultDate: endDate || undefined,
          minDate: startDate || "today",
          onChange: (selectedDates: any[], dateStr: string) => {
            setEndDate(dateStr);
          }
        });

      }
    };

    loadFlatpickr();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync React state changes (e.g. form clearing, edit selection) back to Flatpickr instances
  useEffect(() => {
    const fp = (window as any).flatpickr;
    if (!fp) return;
    
    const startEl = document.getElementById("startDate");
    const endEl = document.getElementById("endDate");
    
    if (startEl && (startEl as any)._flatpickr) {
      (startEl as any)._flatpickr.setDate(startDate || "", false);
    }
    if (endEl && (endEl as any)._flatpickr) {
      (endEl as any)._flatpickr.setDate(endDate || "", false);
    }
  }, [startDate, endDate]);

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

  const handleRemoveBlock = async (id: string) => {
    if (!confirm("Are you sure you want to remove this date block? This will instantly reopen booking for these dates.")) {
      return;
    }

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
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white font-semibold flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-amber-500" />
          <span>Date & Room Blocker</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500">Disable check-ins for specific dates when rooms are fully booked or undergoing maintenance.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add Block Form Card */}
        <div id="block-form-card" className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6 self-start scroll-mt-20">
          <h2 className="text-lg font-serif text-white flex items-center gap-2 border-b border-zinc-800/60 pb-3">
            {editingBlockId ? (
              <Pencil className="h-4.5 w-4.5 text-amber-500" />
            ) : (
              <Plus className="h-4.5 w-4.5 text-amber-500" />
            )}
            <span>{editingBlockId ? "Edit Date Block" : "Create Date Block"}</span>
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-sm text-zinc-300">
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

            {/* Start Date */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                Start Date (Check-In)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  id="startDate"
                  required
                  placeholder="dd/mm/yyyy"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 py-2.5 text-zinc-200 outline-none focus:border-amber-500/50 appearance-none"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                End Date (Check-Out)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  id="endDate"
                  required
                  placeholder="dd/mm/yyyy"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 py-2.5 text-zinc-200 outline-none focus:border-amber-500/50 appearance-none"
                />
              </div>
            </div>

            {/* Block Scope / Room Type */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                Scope / Room Type
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 py-2.5 text-zinc-200 outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                >
                  <option value="All">Entire Hotel (All Rooms)</option>
                  <option value="Standard">Standard Rooms Only</option>
                  <option value="Deluxe">Deluxe Rooms Only</option>
                  <option value="Super Deluxe">Super Deluxe Rooms Only</option>
                  <option value="Suite">Suite Rooms Only</option>
                </select>
              </div>
            </div>

            {/* Notes/Reason */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-semibold">
                Reason / Note
              </label>
              <textarea
                placeholder="e.g. Peak Season block, maintenance, group booking..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-zinc-200 outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-800 to-amber-600 hover:from-red-700 hover:to-amber-500 text-white font-medium py-3 text-xs tracking-wider uppercase transition cursor-pointer shadow active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Processing..." : (editingBlockId ? "Update Date Block" : "Block Selected Dates")}
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
                  className="rounded-lg border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 font-medium px-4 py-3 text-xs tracking-wider uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Active Blocks List panel */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 lg:col-span-2 space-y-6">
          <h2 className="text-lg font-serif text-white flex items-center gap-2 border-b border-zinc-800/60 pb-3">
            <CalendarOff className="h-4.5 w-4.5 text-amber-500" />
            <span>Active Block Registry</span>
          </h2>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
              <p className="text-zinc-500 text-sm">Querying database...</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
              No date blocks are currently active. All rooms are open for public booking!
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-950">
                      <th className="px-6 py-4">Blocked Dates</th>
                      <th className="px-6 py-4">Block Scope</th>
                      <th className="px-6 py-4">Reason / Notes</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                    {blocks.map((b) => (
                      <tr 
                        key={b._id} 
                        className="hover:bg-zinc-900/20 hover:cursor-pointer transition-colors"
                        onClick={() => setSelectedPreviewBlock(b)}
                        title="Click to view full block details"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">
                            {new Date(b.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            to {new Date(b.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                              b.roomType === "All" 
                                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {b.roomType === "All" ? "Entire Hotel" : `${b.roomType} Rooms`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-400 italic max-w-xs truncate">
                          {b.reason || "No notes"}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStartDate(b.startDate.split("T")[0]);
                              setEndDate(b.endDate.split("T")[0]);
                              setRoomType(b.roomType);
                              setReason(b.reason || "");
                              setEditingBlockId(b._id);
                              document.getElementById("block-form-card")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="rounded p-2 text-zinc-500 hover:bg-amber-500/10 hover:text-amber-400 transition cursor-pointer"
                            title="Edit date block"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBlock(b._id);
                            }}
                            className="rounded p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setSelectedPreviewBlock(null)}
        >
          <div 
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-scaleUp text-sm text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background glow */}
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-amber-500/10 to-red-600/10 blur-xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-serif text-white font-semibold flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-amber-500" />
                <span>Date Block Specifications</span>
              </h3>
              <button 
                onClick={() => setSelectedPreviewBlock(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              
              {/* Date Highlight Box */}
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5 space-y-3 relative overflow-hidden">
                <div className="absolute right-4 top-4 text-zinc-800 font-mono font-bold text-5xl select-none pointer-events-none opacity-40">
                  {(() => {
                    const startStr = selectedPreviewBlock.startDate.substring(0, 10);
                    const endStr = selectedPreviewBlock.endDate.substring(0, 10);
                    const [sYear, sMonth, sDay] = startStr.split("-").map(Number);
                    const [eYear, eMonth, eDay] = endStr.split("-").map(Number);
                    
                    // Parse midnight timestamps in UTC timezone (immune to local client timezone shifts)
                    const startMidnight = Date.UTC(sYear, sMonth - 1, sDay);
                    const endMidnight = Date.UTC(eYear, eMonth - 1, eDay);
                    
                    const diff = Math.abs(endMidnight - startMidnight);
                    const daysGap = Math.round(diff / (1000 * 60 * 60 * 24));
                    return `${daysGap}d`;
                  })()}
                </div>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 block">Blocked Duration</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Check-In</span>
                    <span className="font-semibold text-white text-base">
                      {new Date(selectedPreviewBlock.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="hidden sm:block text-zinc-600 font-serif text-xl select-none">➔</div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Check-Out</span>
                    <span className="font-semibold text-white text-base">
                      {new Date(selectedPreviewBlock.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scope Card */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 block">Scope of Restriction</span>
                <div className="flex items-center gap-3">
                  <span 
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                      selectedPreviewBlock.roomType === "All" 
                        ? "bg-red-500/10 text-red-400 border-red-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {selectedPreviewBlock.roomType === "All" ? "Entire Hotel Blocked" : `${selectedPreviewBlock.roomType} Rooms Blocked`}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {selectedPreviewBlock.roomType === "All" 
                    ? "All rooms and classifications (Standard, Deluxe, Super Deluxe, Suite) are completely locked. Guests cannot select check-in dates matching this window."
                    : `Only the ${selectedPreviewBlock.roomType} room category is restricted. Other room categories remain open and searchable on public booking wizards.`}
                </p>
              </div>

              {/* Reason card */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 block">Reason / Administrative Notes</span>
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 italic text-zinc-300 relative min-h-[60px]">
                  <span className="absolute left-2 top-0 text-amber-500/20 text-4xl select-none font-serif leading-none">“</span>
                  <p className="pl-4 py-1 text-zinc-300 leading-relaxed font-serif text-sm">
                    {selectedPreviewBlock.reason || "No specific reason or administrative notes were registered for this block window."}
                  </p>
                </div>
              </div>

              {/* Audit info */}
              {selectedPreviewBlock.createdAt && (
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Registered: {new Date(selectedPreviewBlock.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              )}

            </div>

            {/* Footer controls */}
            <div className="border-t border-zinc-800/80 px-6 py-4 bg-zinc-950/50 flex flex-wrap gap-2 items-center justify-between">
              <button
                onClick={() => {
                  const id = selectedPreviewBlock._id;
                  setSelectedPreviewBlock(null);
                  handleRemoveBlock(id);
                }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
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
                    setEditingBlockId(selectedPreviewBlock._id);
                    setSelectedPreviewBlock(null);
                    document.getElementById("block-form-card")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2.5 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Block</span>
                </button>
                
                <button
                  onClick={() => setSelectedPreviewBlock(null)}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-5 py-2.5 transition cursor-pointer active:scale-95"
                >
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
