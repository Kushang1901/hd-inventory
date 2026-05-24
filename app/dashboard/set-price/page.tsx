"use client";

import React, { useEffect, useState } from "react";
import { Coins, Save, AlertCircle, RefreshCw, IndianRupee, Tag } from "lucide-react";
import { useTheme } from "../ThemeContext";

export default function SetPricesManagement() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Dynamic prices state grouped by roomType
  const [pricesList, setPricesList] = useState<any[]>([]);

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

  useEffect(() => {
    fetchPrices();
  }, []);

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
    <div className="space-y-8 animate-fadeIn max-w-4xl transition-colors duration-300">
      {/* Page Title Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-zinc-900 dark:text-white font-semibold flex items-center gap-2 animate-fadeIn">
            <Coins className="h-6 w-6 text-amber-500" />
            <span>Room Price Controller</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Adjust and configure seasonal stay tariffs. New rates reflect instantly in booking engine calculations.</p>
        </div>
        <button
          onClick={fetchPrices}
          className="rounded-lg p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-605 dark:text-zinc-400 hover:text-zinc-900 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-sm animate-scaleUp"
          title="Reload Prices"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Querying database pricing catalog...</p>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs md:text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs md:text-sm text-emerald-600 dark:text-emerald-400">
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
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/10 backdrop-blur-md p-6 space-y-4 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all duration-300"
                >
                  <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
                    <Tag className="h-4.5 w-4.5 text-amber-500" />
                    <h3 className="font-serif text-zinc-900 dark:text-white font-semibold text-base">{getRoomName(type)}</h3>
                  </div>

                  <div className="space-y-4">
                    {items.map((item: any) => (
                      <div key={item.subtype} className="flex items-center justify-between gap-4">
                        <span className="text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-medium">
                          {item.subtype === "AC" ? "Air Conditioned (AC)" : "Non-Air Conditioned (Non-AC)"}
                        </span>
                        
                        <div className="relative w-36 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 flex items-center justify-center">
                            <IndianRupee className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.price || ""}
                            onChange={(e) => handlePriceChange(item.roomType, item.subtype, e.target.value)}
                            className="w-full text-right rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 pl-8 pr-4 py-2 text-sm font-semibold text-zinc-850 dark:text-white outline-none focus:border-amber-500/50 appearance-none focus:bg-white dark:focus:bg-zinc-950 transition shadow-sm"
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
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-4 flex justify-end gap-3 items-center backdrop-blur-md shadow-sm">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">* Prices updated here will instantly take effect across checking and verification nodes.</span>
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
    </div>
  );
}
