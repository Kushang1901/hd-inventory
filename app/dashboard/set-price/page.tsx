"use client";

import React, { useEffect, useState } from "react";
import { Coins, Save, AlertCircle, RefreshCw, IndianRupee, Tag, Calendar, Plus, Trash2 } from "lucide-react";

export default function SetPricesManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Dynamic prices state grouped by roomType
  const [pricesList, setPricesList] = useState<any[]>([]);

  // Seasonal Price overrides States
  const [seasonalList, setSeasonalList] = useState<any[]>([]);
  const [loadingSeasonal, setLoadingSeasonal] = useState(false);
  const [addingSeasonal, setAddingSeasonal] = useState(false);
  const [seasonalError, setSeasonalError] = useState("");
  const [seasonalSuccess, setSeasonalSuccess] = useState("");

  // New seasonal rate form state
  const [newRoomType, setNewRoomType] = useState("Standard");
  const [newSubtype, setNewSubtype] = useState("AC");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newReason, setNewReason] = useState("");

  // Flatpickr instances references
  const [startFp, setStartFp] = useState<any>(null);
  const [endFp, setEndFp] = useState<any>(null);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/room-prices");
      const data = await res.json();
      if (data.success) {
        setPricesList(data.data || []);
      } else {
        setError(data.error || "Failed to load current prices.");
      }
    } catch {
      setError("Failed to fetch room prices from backend server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonalPrices = async () => {
    try {
      setLoadingSeasonal(true);
      setSeasonalError("");
      const res = await fetch("/api/seasonal-prices");
      const data = await res.json();
      if (data.success) {
        setSeasonalList(data.data || []);
      } else {
        setSeasonalError(data.error || "Failed to load seasonal price overrides.");
      }
    } catch {
      setSeasonalError("Failed to fetch seasonal price overrides from server.");
    } finally {
      setLoadingSeasonal(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    fetchSeasonalPrices();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    let activeStartFp: any = null;
    let activeEndFp: any = null;

    // Dynamically import flatpickr inside useEffect to bypass SSR window issues
    import("flatpickr").then((module) => {
      const fp = module.default;
      
      // Load flatpickr dark theme stylesheet
      import("flatpickr/dist/themes/dark.css");

      activeStartFp = fp("#seasonalStartDate", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        allowInput: true,
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
        onChange: (selectedDates, dateStr) => {
          setNewStartDate(dateStr);
          if (activeEndFp && selectedDates.length > 0) {
            activeEndFp.set("minDate", dateStr);
          }
        }
      });

      activeEndFp = fp("#seasonalEndDate", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        allowInput: true,
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
        onChange: (selectedDates, dateStr) => {
          setNewEndDate(dateStr);
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
              fpInstance.setDate(d, true); // true parameter triggers onChange
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
  }, [loading]);

  const handleAddSeasonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeasonalError("");
    setSeasonalSuccess("");
    
    const priceNum = parseInt(newPrice, 10);
    if (!newStartDate || !newEndDate || isNaN(priceNum) || priceNum < 0) {
      setSeasonalError("Please fill in all override fields correctly.");
      return;
    }

    setAddingSeasonal(true);

    try {
      const res = await fetch("/api/seasonal-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: newStartDate,
          endDate: newEndDate,
          roomType: newRoomType,
          subtype: newSubtype,
          price: priceNum,
          reason: newReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setSeasonalSuccess("Special rate scheduled successfully!");
        setNewPrice("");
        setNewReason("");
        setNewStartDate("");
        setNewEndDate("");
        if (startFp) startFp.clear();
        if (endFp) endFp.clear();
        fetchSeasonalPrices();
        setTimeout(() => setSeasonalSuccess(""), 4000);
      } else {
        setSeasonalError(data.error || "Failed to schedule special rate.");
      }
    } catch {
      setSeasonalError("Network error scheduling special rate.");
    } finally {
      setAddingSeasonal(false);
    }
  };

  const handleDeleteSeasonal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this special rate override?")) return;
    setSeasonalError("");
    setSeasonalSuccess("");

    try {
      const res = await fetch(`/api/seasonal-prices?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setSeasonalSuccess("Price override successfully deleted!");
        fetchSeasonalPrices();
        setTimeout(() => setSeasonalSuccess(""), 4000);
      } else {
        setSeasonalError(data.error || "Failed to delete price override.");
      }
    } catch {
      setSeasonalError("Network error deleting price override.");
    }
  };

  const handlePriceChange = (roomType: string, subtype: string, value: string) => {
    const numericVal = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numericVal)) return;

    setPricesList(prev => 
      prev.map(item => 
        item.roomType === roomType && item.subtype === subtype
          ? { ...item, price: numericVal }
          : item
      )
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/room-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: pricesList })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Room prices successfully updated in database!");
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(data.error || "Failed to save prices.");
      }
    } catch {
      setError("An unexpected network error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Group prices by roomType for visual section rendering
  const roomTypesOrder = ["Standard", "Deluxe", "Super Deluxe", "Suite"];
  const groupedPrices = roomTypesOrder.reduce((acc: any, type) => {
    acc[type] = pricesList.filter(p => p.roomType === type);
    return acc;
  }, {});

  const getRoomName = (type: string) => {
    switch (type) {
      case "Standard": return "Standard Deluxe Room";
      case "Deluxe": return "Deluxe Room";
      case "Super Deluxe": return "Super Deluxe Room";
      case "Suite": return "Executive Suite Room";
      default: return `${type} Room`;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      {/* Page Title Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white font-semibold flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" />
            <span>Room Price Controller</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">Adjust and configure seasonal stay tariffs. New rates reflect instantly in booking engine calculations.</p>
        </div>
        <button
          onClick={fetchPrices}
          className="rounded-lg p-2.5 border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Reload Prices"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 rounded-xl border border-zinc-800 bg-zinc-900/10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
          <p className="text-zinc-500 text-sm">Querying database pricing catalog...</p>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs md:text-sm text-red-400 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs md:text-sm text-emerald-400">
              {success}
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {roomTypesOrder.map((type) => {
              const items = groupedPrices[type] || [];
              if (items.length === 0) return null;

              return (
                <div 
                  key={type} 
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-4 shadow-xl hover:border-zinc-700/60 transition-all duration-300"
                >
                  <div className="flex items-center gap-2.5 border-b border-zinc-800/60 pb-3">
                    <Tag className="h-4.5 w-4.5 text-amber-500" />
                    <h3 className="font-serif text-white font-semibold text-base">{getRoomName(type)}</h3>
                  </div>

                  <div className="space-y-4">
                    {items.map((item: any) => (
                      <div key={item.subtype} className="flex items-center justify-between gap-4">
                        <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
                          {item.subtype === "AC" ? "Air Conditioned (AC)" : "Non-Air Conditioned (Non-AC)"}
                        </span>
                        
                        <div className="relative w-36 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 flex items-center justify-center">
                            <IndianRupee className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.price || ""}
                            onChange={(e) => handlePriceChange(item.roomType, item.subtype, e.target.value)}
                            className="w-full text-right rounded-lg border border-zinc-800 bg-zinc-950/60 pl-8 pr-4 py-2 text-sm font-semibold text-white outline-none focus:border-amber-500/50 appearance-none focus:bg-zinc-950 transition"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Trigger Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 flex justify-end gap-3 items-center backdrop-blur-md">
            <span className="text-xs text-zinc-500 hidden sm:inline">* Prices updated here will instantly take effect across checking and verification nodes.</span>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-red-800 to-amber-600 hover:from-red-700 hover:to-amber-500 text-white font-medium px-6 py-3 text-xs tracking-wider uppercase transition cursor-pointer shadow active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Saving Prices...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Price Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Section 2: Promotional / Seasonal Price Scheduler */}
      {!loading && (
        <div className="mt-12 space-y-6">
          <div className="border-b border-zinc-800/80 pb-4">
            <h2 className="text-xl font-serif text-white font-semibold flex items-center gap-2">
              <Calendar className="h-5.5 w-5.5 text-amber-500" />
              <span>Scheduled Special / Festival Rates</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Schedule higher or lower pricing for specific festivals (like Janmashtami or Diwali). After the date range ends, rates automatically revert to default standard prices.</p>
          </div>

          {seasonalError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs md:text-sm text-red-400 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{seasonalError}</span>
            </div>
          )}

          {seasonalSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs md:text-sm text-emerald-400">
              {seasonalSuccess}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3 items-start">
            {/* Left Column: Schedule New Override Form */}
            <div className="md:col-span-1 rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-4 shadow-xl">
              <h3 className="font-serif text-white font-semibold text-sm border-b border-zinc-800/60 pb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" />
                <span>Schedule New Override</span>
              </h3>

              <form onSubmit={handleAddSeasonal} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 mb-2">Room Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => {
                      setNewRoomType(e.target.value);
                      if (e.target.value === "Suite") {
                        setNewSubtype("AC");
                      }
                    }}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500/50 appearance-none focus:bg-zinc-950 cursor-pointer"
                  >
                    <option value="Standard">Standard Deluxe Room</option>
                    <option value="Deluxe">Deluxe Room</option>
                    <option value="Super Deluxe">Super Deluxe Room</option>
                    <option value="Suite">Executive Suite Room</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 mb-2">Air Conditioning</label>
                  <select
                    value={newSubtype}
                    onChange={(e) => setNewSubtype(e.target.value)}
                    disabled={newRoomType === "Suite"}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500/50 appearance-none focus:bg-zinc-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="AC">Air Conditioned (AC)</option>
                    {newRoomType !== "Suite" && <option value="Non-AC">Non-AC</option>}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 mb-2">Start Date</label>
                    <input
                      type="text"
                      id="seasonalStartDate"
                      placeholder="dd/mm/yyyy"
                      required
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50 focus:bg-zinc-950 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 mb-2">End Date (Incl.)</label>
                    <input
                      type="text"
                      id="seasonalEndDate"
                      placeholder="dd/mm/yyyy"
                      required
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50 focus:bg-zinc-950 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 mb-2">Special Price per Night</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <IndianRupee className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 2500"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full text-right rounded-lg border border-zinc-800 bg-zinc-950/60 pl-8 pr-4 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500/50 focus:bg-zinc-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-500/80 mb-2">Override Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Janmashtami Peak Rate"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50 focus:bg-zinc-950 placeholder-zinc-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingSeasonal}
                  className="w-full rounded-lg bg-gradient-to-r from-red-800 to-amber-600 hover:from-red-700 hover:to-amber-500 text-white font-medium py-2.5 text-[11px] tracking-wider uppercase transition cursor-pointer shadow active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {addingSeasonal ? "Scheduling..." : "Schedule Override"}
                </button>
              </form>
            </div>

            {/* Right Column: List of Scheduled Overrides */}
            <div className="md:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md p-6 space-y-4 shadow-xl">
              <h3 className="font-serif text-white font-semibold text-sm border-b border-zinc-800/60 pb-3 flex items-center justify-between">
                <span>Scheduled Price Overrides Catalog</span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/60">{seasonalList.length} Override{seasonalList.length !== 1 ? 's' : ''}</span>
              </h3>

              {loadingSeasonal ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500 mx-auto mb-2"></div>
                  <p className="text-zinc-500 text-xs">Querying price overrides catalog...</p>
                </div>
              ) : seasonalList.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-800 rounded-lg text-zinc-600 text-xs flex flex-col items-center justify-center gap-2">
                  <Calendar className="h-6 w-6 opacity-30" />
                  <span>No dynamic price overrides scheduled.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 font-semibold tracking-wider uppercase text-[9px]">
                        <th className="py-2.5">Room Subtype</th>
                        <th className="py-2.5">Date Range</th>
                        <th className="py-2.5 text-right">Special Price</th>
                        <th className="py-2.5 pl-4">Reason / Note</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {seasonalList.map((item) => {
                        const startStr = new Date(item.startDate).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                        const endStr = new Date(item.endDate).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                        return (
                          <tr key={item._id} className="hover:bg-zinc-950/20 transition-colors">
                            <td className="py-3 font-semibold text-white">
                              {getRoomName(item.roomType)} ({item.subtype})
                            </td>
                            <td className="py-3 font-mono text-zinc-400">
                              {startStr} - {endStr}
                            </td>
                            <td className="py-3 text-right font-bold text-amber-400">
                              ₹{item.price}/night
                            </td>
                            <td className="py-3 pl-4 italic text-zinc-500 max-w-[150px] truncate" title={item.reason}>
                              {item.reason || "—"}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteSeasonal(item._id)}
                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/10 hover:border-red-500/20 transition cursor-pointer"
                                title="Delete Override"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
