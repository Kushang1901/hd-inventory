"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail,
  Send,
  Inbox,
  Star,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  Reply,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  Building2,
  CreditCard,
  Landmark,
  Sparkles,
  CornerDownLeft,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface EmailSummary {
  uid: number;
  seq: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  to: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  snippet?: string;
}

interface EmailDetail {
  uid: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  to: string;
  date: string;
  html?: string;
  text?: string;
  isRead: boolean;
  isStarred: boolean;
  messageId?: string;
  attachments?: Array<{ filename?: string; contentType: string; size: number }>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function getAvatarGradient(name: string) {
  const g = [
    ["#6366f1", "#8b5cf6"],
    ["#3b82f6", "#6366f1"],
    ["#10b981", "#059669"],
    ["#f59e0b", "#d97706"],
    ["#ec4899", "#f43f5e"],
    ["#06b6d4", "#0ea5e9"],
    ["#84cc16", "#22c55e"],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const [a, b] = g[Math.abs(h) % g.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function formatDate(d: string) {
  const dt = new Date(d);
  const now = new Date();
  const diff = now.getTime() - dt.getTime();
  const m = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (hr < 24) return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (hr < 48) return "Yesterday";
  if (hr < 168) return dt.toLocaleDateString([], { weekday: "short" });
  return dt.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Sandboxed iframe component ───────────────────────────────────────────────
function IframeEmail({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <style>
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.65;color:#1e293b;background:#fff}
        img{max-width:100%;height:auto}
        a{color:#2563eb}
        table{border-collapse:collapse;max-width:100%}
        td{word-break:break-word}
        pre{white-space:pre-wrap;word-break:break-all}
      </style>
    </head><body>${html}</body></html>`);
    doc.close();
    const resize = () => {
      if (iframe?.contentWindow) {
        const h = iframe.contentWindow.document.documentElement.scrollHeight;
        iframe.style.height = Math.max(h + 16, 120) + "px";
      }
    };
    iframe.onload = resize;
    setTimeout(resize, 200);
    setTimeout(resize, 800);
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Email content"
      sandbox="allow-same-origin"
      style={{ width: "100%", minHeight: "120px", border: "none", display: "block" }}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MailCenterPage() {
  const [folder, setFolder] = useState("inbox");
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [currentEmail, setCurrentEmail] = useState<EmailDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "starred">("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composeStatus, setComposeStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [searchingGuests, setSearchingGuests] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  // ─── Fetch list ──────────────────────────────────────────────────────────────
  const fetchEmails = useCallback(async (f: string, p = 1, silent = false) => {
    if (!silent) setLoadingList(true); else setRefreshing(true);
    try {
      const r = await fetch(`/api/mail?folder=${f}&page=${p}&limit=30`);
      if (r.ok) {
        const d = await r.json();
        setEmails(d.emails || []);
        setTotal(d.total || 0);
        setUnreadCount(d.unreadCount || 0);
      }
    } finally { setLoadingList(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchEmails(folder, page);
    setSelectedUid(null);
    setCurrentEmail(null);
  }, [folder, page, fetchEmails]);

  // ─── Fetch detail ────────────────────────────────────────────────────────────
  const handleSelect = async (uid: number) => {
    if (selectedUid === uid) return;
    setSelectedUid(uid);
    setLoadingDetail(true);
    setCurrentEmail(null);
    setReplyText("");
    try {
      const r = await fetch(`/api/mail/${uid}?folder=${folder}`);
      if (r.ok) {
        const d: EmailDetail = await r.json();
        setCurrentEmail(d);
        setEmails((prev) => prev.map((e) => e.uid === uid ? { ...e, isRead: true } : e));
        if (!emails.find(e => e.uid === uid)?.isRead) setUnreadCount(p => Math.max(0, p - 1));
      }
    } finally { setLoadingDetail(false); }
  };

  // ─── Star ────────────────────────────────────────────────────────────────────
  const toggleStar = async (uid: number, cur: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails(prev => prev.map(x => x.uid === uid ? { ...x, isStarred: !cur } : x));
    if (currentEmail?.uid === uid) setCurrentEmail({ ...currentEmail, isStarred: !cur });
    await fetch("/api/mail", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, folder, action: "star", value: !cur }) });
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const deleteEmail = async (uid: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Move this email to Trash?")) return;
    const r = await fetch(`/api/mail?uid=${uid}&folder=${folder}`, { method: "DELETE" });
    if (r.ok) {
      setEmails(prev => prev.filter(x => x.uid !== uid));
      if (selectedUid === uid) { setSelectedUid(null); setCurrentEmail(null); }
    }
  };

  // ─── Guest search ────────────────────────────────────────────────────────────
  const handleGuestSearch = async (val: string) => {
    setComposeTo(val);
    if (val.length < 2) { setGuestResults([]); return; }
    setSearchingGuests(true);
    try {
      const r = await fetch(`/api/mail/guests?q=${encodeURIComponent(val)}`);
      if (r.ok) setGuestResults((await r.json()).guests || []);
    } finally { setSearchingGuests(false); }
  };

  // ─── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setComposeStatus({ type: "error", text: "Please fill all fields." });
      return;
    }
    setIsSending(true);
    setComposeStatus(null);
    const html = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#0D1B4A 0%,#1E3A8A 100%);padding:28px 32px;text-align:center;">
        <h2 style="margin:0;font-family:Georgia,serif;letter-spacing:3px;font-size:20px;color:#ffffff;">HOTEL DEVANG</h2>
        <p style="margin:6px 0 0;font-size:11px;color:#caa035;letter-spacing:2.5px;text-transform:uppercase;">Dwarka · Gujarat</p>
      </div>
      <div style="padding:32px;color:#1e293b;line-height:1.75;font-size:15px;">${composeBody.replace(/\n/g, "<br/>")}</div>
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#64748b;">
        Opp. Circuit House, Hospital Road, Dwarka, Gujarat — 361335<br/>
        +91 98244 02132 | info@hoteldevang.com
      </div>
    </div>`;
    try {
      const r = await fetch("/api/mail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: composeTo.trim(), subject: composeSubject.trim(), text: composeBody, html }) });
      const d = await r.json();
      if (r.ok) {
        setComposeStatus({ type: "success", text: "Email sent successfully!" });
        setTimeout(() => { setComposeOpen(false); setComposeTo(""); setComposeSubject(""); setComposeBody(""); setComposeStatus(null); setActiveTemplate(null); if (folder === "sent") fetchEmails("sent"); }, 1500);
      } else { setComposeStatus({ type: "error", text: d.error || "Failed to send." }); }
    } catch { setComposeStatus({ type: "error", text: "Network error." }); }
    finally { setIsSending(false); }
  };

  // ─── Reply ───────────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!replyText.trim() || !currentEmail) return;
    setIsReplying(true);
    try {
      const subj = currentEmail.subject.startsWith("Re:") ? currentEmail.subject : `Re: ${currentEmail.subject}`;
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#1e293b;">
        <p style="margin:0 0 16px;">${replyText.replace(/\n/g, "<br/>")}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
        <p style="color:#64748b;font-size:12px;margin:0;">On ${new Date(currentEmail.date).toLocaleString()}, <strong>${currentEmail.fromName}</strong> wrote:</p>
        <blockquote style="margin:8px 0 0;padding:10px 14px;border-left:3px solid #cbd5e1;color:#475569;font-size:13px;">${(currentEmail.text || "").replace(/\n/g, "<br/>")}</blockquote>
      </div>`;
      const r = await fetch("/api/mail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: currentEmail.fromAddress, subject: subj, text: replyText, html }) });
      if (r.ok) { alert("Reply sent!"); setReplyText(""); }
      else alert("Failed to send reply.");
    } finally { setIsReplying(false); }
  };

  // ─── Templates ───────────────────────────────────────────────────────────────
  const applyTemplate = (type: string) => {
    setActiveTemplate(type);
    if (type === "booking") {
      setComposeSubject("Booking Confirmation — Hotel Devang, Dwarka");
      setComposeBody(`Dear Guest,\n\nGreetings from Hotel Devang, Dwarka!\n\nWe are pleased to confirm your reservation at our hotel, located near the holy Dwarkadhish Temple and the scenic sea beach.\n\nCheck-in: 12:30 PM  |  Check-out: 10:00 AM\n\nFor travel assistance from Dwarka Railway Station or sightseeing guidance, please call us at +91 98244 02132.\n\nWe look forward to welcoming you.\n\nWarm regards,\nReservations Team\nHotel Devang, Dwarka`);
    } else if (type === "payment") {
      setComposeSubject("Payment Receipt — Hotel Devang, Dwarka");
      setComposeBody(`Dear Guest,\n\nThank you for your payment. We have received your booking amount for your stay at Hotel Devang, Dwarka.\n\nYour reservation is confirmed. Please carry this email or a valid Government ID at the time of check-in.\n\nWe look forward to hosting you.\n\nWarm regards,\nFront Desk\nHotel Devang`);
    } else if (type === "darshan") {
      setComposeSubject("Dwarkadhish Darshan Timings & Local Travel Guide");
      setComposeBody(`Jai Dwarkadhish!\n\nDarshan Timings — Dwarkadhish Jagad Mandir:\n  Morning  : 6:30 AM - 1:00 PM\n  Evening  : 5:00 PM - 9:30 PM\n\nNearby Attractions:\n  1. Bhadkeshwar Mahadev & Sunset Point (~500m)\n  2. Sudama Setu & Gomti Ghat (~800m)\n  3. Nageshwar Jyotirlinga & Bet Dwarka (~30 km)\n\nOur 24/7 reception team is happy to assist with local transport and Darshan bookings.\n\nWarm regards,\nHotel Devang Team`);
    }
  };

  // ─── Filtered list ────────────────────────────────────────────────────────────
  const filtered = emails.filter((e) => {
    if (filterType === "unread" && e.isRead) return false;
    if (filterType === "starred" && !e.isStarred) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.subject.toLowerCase().includes(q) || e.fromName.toLowerCase().includes(q) || e.fromAddress.toLowerCase().includes(q);
  });

  const FOLDERS = [
    { key: "inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" />, count: unreadCount > 0 ? unreadCount : null },
    { key: "sent",  label: "Sent",  icon: <Send className="h-4 w-4" />,  count: null },
    { key: "trash", label: "Trash", icon: <Trash2 className="h-4 w-4" />, count: null },
  ];

  const TEMPLATES = [
    { key: "booking", label: "Booking Confirmation", icon: <Building2 className="h-3.5 w-3.5" /> },
    { key: "payment", label: "Payment Receipt",      icon: <CreditCard className="h-3.5 w-3.5" /> },
    { key: "darshan", label: "Darshan Info",         icon: <Landmark className="h-3.5 w-3.5" /> },
  ];

  // ─── Layout ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 72px)", overflow: "hidden", background: "#f1f5f9" }}>

      {/* ═══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ height: 38, width: 38, borderRadius: 10, background: "linear-gradient(135deg,#2563eb,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}>
            <Mail style={{ height: 18, width: 18, color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>Mail Center</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>info@hoteldevang.com</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => fetchEmails(folder, page, true)}
            disabled={refreshing || loadingList}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12, fontWeight: 500, color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}
          >
            <RefreshCw style={{ height: 13, width: 13, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button
            onClick={() => { setComposeOpen(true); setActiveTemplate(null); setComposeTo(""); setComposeSubject(""); setComposeBody(""); setComposeStatus(null); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#2563eb,#4f46e5)", border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}
          >
            <Plus style={{ height: 14, width: 14 }} />
            Compose
          </button>
        </div>
      </div>

      {/* ═══ MAIN AREA ══════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Folder Sidebar ── */}
        <div style={{ width: 180, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "16px 8px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "#94a3b8", padding: "0 10px", marginBottom: 8 }}>Folders</div>
          {FOLDERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 10px", marginBottom: 2, borderRadius: 8,
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: folder === f.key ? 600 : 500,
                color: folder === f.key ? "#2563eb" : "#475569",
                background: folder === f.key ? "#eff6ff" : "transparent",
                textAlign: "left" as const,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 9, color: folder === f.key ? "#2563eb" : "#94a3b8" }}>
                {f.icon}
                <span style={{ color: folder === f.key ? "#2563eb" : "#374151" }}>{f.label}</span>
              </span>
              {f.count ? (
                <span style={{ minWidth: 20, height: 18, padding: "0 5px", borderRadius: 20, background: "#2563eb", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {f.count}
                </span>
              ) : null}
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: "12px 10px 0", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 10, color: "#cbd5e1" }}>{total} message{total !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* ── Email List ── */}
        <div style={{ width: 300, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", height: 13, width: 13, color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, fontSize: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", color: "#1e293b", boxSizing: "border-box" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "unread", "starred"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, textTransform: "capitalize" as const,
                    background: filterType === t ? (t === "unread" ? "#eff6ff" : t === "starred" ? "#fffbeb" : "#1e293b") : "#f8fafc",
                    color: filterType === t ? (t === "unread" ? "#2563eb" : t === "starred" ? "#d97706" : "#fff") : "#64748b",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" as const }}>
            {loadingList ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#94a3b8" }}>
                <div style={{ height: 28, width: 28, borderRadius: "50%", border: "2.5px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 12 }}>Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, padding: 24 }}>
                <MailOpen style={{ height: 40, width: 40, color: "#e2e8f0" }} />
                <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>No emails found</span>
              </div>
            ) : filtered.map(item => {
              const sel = selectedUid === item.uid;
              return (
                <div
                  key={item.uid}
                  onClick={() => handleSelect(item.uid)}
                  style={{
                    padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #f8fafc",
                    background: sel ? "#eff6ff" : item.isRead ? "#ffffff" : "#fafbff",
                    borderLeft: `3px solid ${sel ? "#2563eb" : "transparent"}`,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flexShrink: 0, height: 36, width: 36, borderRadius: "50%", background: getAvatarGradient(item.fromName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      {getInitials(item.fromName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: item.isRead ? 500 : 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 140 }}>
                          {item.fromName || item.fromAddress}
                        </span>
                        <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0, marginLeft: 4 }}>{formatDate(item.date)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: item.isRead ? "#64748b" : "#1e293b", fontWeight: item.isRead ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {item.subject}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {item.snippet || item.fromAddress}
                      </p>
                    </div>
                  </div>
                  {!item.isRead && (
                    <div style={{ position: "absolute", top: 14, right: 10, height: 7, width: 7, borderRadius: "50%", background: "#2563eb" }} />
                  )}
                </div>
              );
            })}
          </div>

          {total > 0 && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#f8fafc" }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Page {page}/{Math.max(1, Math.ceil(total / 30))}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
                  <ChevronLeft style={{ height: 12, width: 12, color: "#475569" }} />
                </button>
                <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}
                  style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: page * 30 >= total ? "not-allowed" : "pointer", opacity: page * 30 >= total ? 0.4 : 1 }}>
                  <ChevronRight style={{ height: 12, width: 12, color: "#475569" }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Reading Pane ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>
          {loadingDetail ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#94a3b8" }}>
              <div style={{ height: 32, width: 32, borderRadius: "50%", border: "2.5px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Opening email...</span>
            </div>
          ) : !currentEmail ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" as const }}>
              <div style={{ height: 80, width: 80, borderRadius: 20, background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <MailOpen style={{ height: 36, width: 36, color: "#cbd5e1" }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Select an email to read</div>
              <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 280, lineHeight: 1.6 }}>
                Choose a message from your {folder} to view its full content here.
              </div>
            </div>
          ) : (
            <>
              {/* Email Header */}
              <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0, background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.35, flex: 1, paddingRight: 16 }}>
                    {currentEmail.subject}
                  </h2>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={(e) => toggleStar(currentEmail.uid, currentEmail.isStarred, e)} title="Star"
                      style={{ padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: currentEmail.isStarred ? "#fffbeb" : "#f8fafc", color: currentEmail.isStarred ? "#f59e0b" : "#94a3b8" }}>
                      <Star style={{ height: 16, width: 16, fill: currentEmail.isStarred ? "#f59e0b" : "none" }} />
                    </button>
                    <button onClick={() => window.print()} title="Print"
                      style={{ padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: "#f8fafc", color: "#94a3b8" }}>
                      <Printer style={{ height: 16, width: 16 }} />
                    </button>
                    <button onClick={() => deleteEmail(currentEmail.uid)} title="Delete"
                      style={{ padding: 7, borderRadius: 8, border: "none", cursor: "pointer", background: "#f8fafc", color: "#94a3b8" }}>
                      <Trash2 style={{ height: 16, width: 16 }} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ height: 42, width: 42, borderRadius: "50%", background: getAvatarGradient(currentEmail.fromName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                      {getInitials(currentEmail.fromName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{currentEmail.fromName}</div>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace", marginTop: 1 }}>{currentEmail.fromAddress}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8" }}>
                    <Clock style={{ height: 12, width: 12 }} />
                    {new Date(currentEmail.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                <div style={{ padding: "10px 28px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap" as const, gap: 8, flexShrink: 0 }}>
                  {currentEmail.attachments.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                      <Paperclip style={{ height: 12, width: 12, color: "#94a3b8" }} />
                      <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{a.filename || "Attachment"}</span>
                      <span style={{ color: "#94a3b8" }}>({Math.round(a.size / 1024)} KB)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Email Body — scrollable */}
              <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px 28px" }}>
                {currentEmail.html ? (
                  <IframeEmail html={currentEmail.html} />
                ) : (
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif", fontSize: 14, color: "#334155", lineHeight: 1.75, margin: 0 }}>
                    {currentEmail.text}
                  </pre>
                )}
              </div>

              {/* Reply Box — sticky bottom */}
              <div style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc", padding: "16px 28px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <CornerDownLeft style={{ height: 14, width: 14, color: "#2563eb" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Reply to <span style={{ color: "#2563eb" }}>{currentEmail.fromName}</span>
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", fontSize: 13, color: "#1e293b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, resize: "none", outline: "none", lineHeight: 1.65, boxSizing: "border-box" as const, fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button
                    disabled={isReplying || !replyText.trim()}
                    onClick={handleReply}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", fontSize: 13, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#2563eb,#4f46e5)", border: "none", borderRadius: 9, cursor: isReplying || !replyText.trim() ? "not-allowed" : "pointer", opacity: isReplying || !replyText.trim() ? 0.5 : 1, boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}
                  >
                    {isReplying ? <RefreshCw style={{ height: 14, width: 14, animation: "spin 0.8s linear infinite" }} /> : <Send style={{ height: 14, width: 14 }} />}
                    {isReplying ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ COMPOSE MODAL ══════════════════════════════════════════════════════ */}
      {composeOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 640, background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "linear-gradient(135deg,#0f172a,#1e3a8a)", borderRadius: "16px 16px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ height: 30, width: 30, borderRadius: 8, background: "rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail style={{ height: 14, width: 14, color: "#a5b4fc" }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>New Message</span>
              </div>
              <button onClick={() => setComposeOpen(false)}
                style={{ padding: 6, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                <X style={{ height: 16, width: 16 }} />
              </button>
            </div>

            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
                <Sparkles style={{ height: 13, width: 13, color: "#f59e0b" }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#64748b" }}>Templates</span>
              </div>
              {TEMPLATES.map(t => (
                <button key={t.key} type="button" onClick={() => applyTemplate(t.key)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, border: `1px solid ${activeTemplate === t.key ? "#2563eb" : "#e2e8f0"}`, background: activeTemplate === t.key ? "#2563eb" : "#fff", color: activeTemplate === t.key ? "#fff" : "#475569", cursor: "pointer" }}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc", position: "relative" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 28, flexShrink: 0 }}>To</span>
                  <input
                    type="text" required
                    placeholder="Recipient email..."
                    value={composeTo}
                    onChange={e => handleGuestSearch(e.target.value)}
                    style={{ flex: 1, fontSize: 13, color: "#1e293b", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }}
                  />
                  {searchingGuests && <RefreshCw style={{ height: 13, width: 13, color: "#94a3b8", animation: "spin 0.8s linear infinite" }} />}
                  {guestResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 60, right: 0, zIndex: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                      {guestResults.map(g => (
                        <div key={g.id} onClick={() => { setComposeTo(g.name); setGuestResults([]); }}
                          style={{ padding: "10px 16px", cursor: "pointer", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{g.name}</span>
                          <span style={{ color: "#94a3b8" }}>{g.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 28, flexShrink: 0 }}>Sub</span>
                  <input
                    type="text" required
                    placeholder="Subject..."
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    style={{ flex: 1, fontSize: 13, color: "#1e293b", background: "transparent", border: "none", outline: "none", fontFamily: "inherit", fontWeight: 500 }}
                  />
                </div>
              </div>

              <textarea
                required rows={10}
                placeholder="Write your message..."
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                style={{ flex: 1, padding: "16px 20px", fontSize: 13, color: "#1e293b", background: "transparent", border: "none", outline: "none", resize: "none", lineHeight: 1.7, fontFamily: "inherit" }}
              />

              {composeStatus && (
                <div style={{ margin: "0 20px 12px", padding: "10px 14px", borderRadius: 10, fontSize: 12, display: "flex", alignItems: "center", gap: 8, background: composeStatus.type === "success" ? "#f0fdf4" : "#fff1f2", border: `1px solid ${composeStatus.type === "success" ? "#bbf7d0" : "#fecdd3"}`, color: composeStatus.type === "success" ? "#15803d" : "#be123c" }}>
                  {composeStatus.type === "success" ? <CheckCircle style={{ height: 14, width: 14 }} /> : <AlertCircle style={{ height: 14, width: 14 }} />}
                  {composeStatus.text}
                </div>
              )}

              <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0 0 16px 16px" }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Sent via Hotel Devang Mail</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setComposeOpen(false)}
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 500, color: "#64748b", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>
                    Discard
                  </button>
                  <button type="submit" disabled={isSending}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#2563eb,#4f46e5)", border: "none", borderRadius: 8, cursor: isSending ? "not-allowed" : "pointer", opacity: isSending ? 0.7 : 1, boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}>
                    {isSending ? <RefreshCw style={{ height: 14, width: 14, animation: "spin 0.8s linear infinite" }} /> : <Send style={{ height: 14, width: 14 }} />}
                    {isSending ? "Sending..." : "Send Email"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
