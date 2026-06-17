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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300"
      onClick={onCancel}
    >
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-scaleUp text-sm text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div className={`absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br ${isDestructive ? 'from-red-500/10 to-amber-600/10' : 'from-amber-500/10 to-zinc-600/10'} blur-xl pointer-events-none`}></div>
        
        {/* Close button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-white transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3 pr-6">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            isDestructive 
              ? "border-red-500/30 bg-red-500/10 text-red-400" 
              : "border-amber-500/30 bg-amber-500/10 text-amber-500"
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-serif text-white font-semibold">
            {title}
          </h3>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-zinc-400 leading-relaxed font-sans text-xs">
            {message}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2.5 transition cursor-pointer active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg text-xs font-semibold px-5 py-2.5 transition cursor-pointer active:scale-95 text-white ${
              isDestructive
                ? "bg-red-700 hover:bg-red-600"
                : "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
