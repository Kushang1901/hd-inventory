"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300"
      style={{ background: "rgba(13, 27, 74, 0.4)" }}
      onClick={onCancel}
    >
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-white p-6 shadow-[0_20px_50px_rgba(13,27,74,0.15)] animate-scaleUp text-sm"
        style={{ 
          borderColor: "rgba(29, 78, 216, 0.12)",
          color: "var(--hd-gray-700)" 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div 
          className="absolute -right-16 -top-16 h-36 w-36 rounded-full blur-xl pointer-events-none opacity-40"
          style={{
            background: isDestructive 
              ? "linear-gradient(to bottom right, var(--hd-red-500), var(--hd-red-100))" 
              : "linear-gradient(to bottom right, var(--hd-blue-400), var(--hd-blue-100))"
          }}
        />
        
        {/* Close button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-lg p-1.5 transition cursor-pointer"
          style={{ 
            color: "var(--hd-gray-400)", 
            background: "transparent"
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--hd-gray-100)";
            (e.currentTarget as HTMLElement).style.color = "var(--hd-gray-800)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--hd-gray-400)";
          }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 pr-6">
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{ 
              borderColor: isDestructive ? "rgba(220,38,38,0.2)" : "rgba(29,78,216,0.2)",
              background: isDestructive ? "rgba(220,38,38,0.06)" : "rgba(29,78,216,0.06)",
              color: isDestructive ? "#DC2626" : "#1D4ED8"
            }}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 
            className="text-lg font-bold"
            style={{ fontFamily: "Georgia, serif", color: "#0F172A" }}
          >
            {title}
          </h3>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="leading-relaxed font-sans text-xs" style={{ color: "var(--hd-gray-600)" }}>
            {message}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border text-xs font-semibold px-4 py-2.5 transition cursor-pointer active:scale-95"
            style={{ 
              borderColor: "var(--hd-gray-250, #E2E8F0)",
              background: "#F8FAFC",
              color: "var(--hd-gray-700)" 
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--hd-gray-100)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl text-xs font-semibold px-5 py-2.5 transition cursor-pointer active:scale-95 text-white"
            style={{
              background: isDestructive ? "#DC2626" : "#1D4ED8",
              boxShadow: isDestructive ? "0 2px 10px rgba(220,38,38,0.2)" : "0 2px 10px rgba(29,78,216,0.2)"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDestructive ? "#B91C1C" : "#1E3A8A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = isDestructive ? "#DC2626" : "#1D4ED8";
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
