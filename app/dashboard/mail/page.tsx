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
  Archive,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

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
  attachments?: Array<{
    filename?: string;
    contentType: string;
    size: number;
  }>;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-sky-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (hours < 48) return "Yesterday";
  if (hours < 168) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
};

export default function MailCenterPage() {
  const [folder, setFolder] = useState<string>("inbox");
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [currentEmail, setCurrentEmail] = useState<EmailDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "starred">("all");
  const [page, setPage] = useState<number>(1);
  const [refreshing, setRefreshing] = useState(false);

  // Compose
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [composeStatus, setComposeStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [searchingGuests, setSearchingGuests] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>("");
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Fetch List ───────────────────────────────────────────────────────────────
  const fetchEmails = useCallback(async (tFolder: string, tPage: number = 1, silent = false) => {
    if (!silent) setLoadingList(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/mail?folder=${tFolder}&page=${tPage}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        setTotal(data.total || 0);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails(folder, page);
    setSelectedUid(null);
    setCurrentEmail(null);
  }, [folder, page, fetchEmails]);

  // ─── Fetch Detail ─────────────────────────────────────────────────────────────
  const handleSelectEmail = async (uid: number) => {
    if (selectedUid === uid) return;
    setSelectedUid(uid);
    setLoadingDetail(true);
    setCurrentEmail(null);
    setReplyText("");
    try {
      const res = await fetch(`/api/mail/${uid}?folder=${folder}`);
      if (res.ok) {
        const data: EmailDetail = await res.json();
        setCurrentEmail(data);
        setEmails((prev) => prev.map((e) => (e.uid === uid ? { ...e, isRead: true } : e)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Star ─────────────────────────────────────────────────────────────────────
  const handleToggleStar = async (uid: number, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails((prev) => prev.map((item) => (item.uid === uid ? { ...item, isStarred: !current } : item)));
    if (currentEmail?.uid === uid) setCurrentEmail({ ...currentEmail, isStarred: !current });
    await fetch("/api/mail", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, folder, action: "star", value: !current }),
    });
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteEmail = async (uid: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Move this email to Trash?")) return;
    const res = await fetch(`/api/mail?uid=${uid}&folder=${folder}`, { method: "DELETE" });
    if (res.ok) {
      setEmails((prev) => prev.filter((item) => item.uid !== uid));
      if (selectedUid === uid) { setSelectedUid(null); setCurrentEmail(null); }
    }
  };

  // ─── Guest Autocomplete ───────────────────────────────────────────────────────
  const handleGuestSearch = async (val: string) => {
    setComposeTo(val);
    if (val.length < 2) { setGuestResults([]); return; }
    setSearchingGuests(true);
    try {
      const res = await fetch(`/api/mail/guests?q=${encodeURIComponent(val)}`);
      if (res.ok) setGuestResults((await res.json()).guests || []);
    } finally { setSearchingGuests(false); }
  };

  // ─── Send Email ───────────────────────────────────────────────────────────────
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setComposeStatus({ type: "error", text: "Please fill in all fields." });
      return;
    }
    setIsSending(true);
    setComposeStatus(null);

    const formattedHtml = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;">
        <div style="background:linear-gradient(135deg,#0D1B4A 0%,#1E3A8A 100%);padding:28px;text-align:center;">
          <h2 style="margin:0;font-family:Georgia,serif;letter-spacing:3px;font-size:22px;color:#fff;">HOTEL DEVANG</h2>
          <p style="margin:6px 0 0;font-size:11px;color:#caa035;letter-spacing:2px;text-transform:uppercase;">Dwarka, Gujarat — 361335</p>
        </div>
        <div style="padding:32px 28px;color:#1e293b;line-height:1.75;font-size:14.5px;">${composeBody.replace(/\n/g, "<br/>")}</div>
        <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;text-align:center;font-size:12px;color:#64748b;">
          <p style="margin:0;">Opp. Circuit House, Hospital Road, Dwarka, Gujarat — 361335</p>
          <p style="margin:5px 0 0;">📞 +91 98244 02132 &nbsp;|&nbsp; ✉️ info@hoteldevang.com</p>
        </div>
      </div>`;

    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: composeTo.trim(), subject: composeSubject.trim(), text: composeBody, html: formattedHtml }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposeStatus({ type: "success", text: "Email sent successfully!" });
        setTimeout(() => { setComposeOpen(false); setComposeTo(""); setComposeSubject(""); setComposeBody(""); setComposeStatus(null); setActiveTemplate(null); if (folder === "sent") fetchEmails("sent"); }, 1800);
      } else {
        setComposeStatus({ type: "error", text: data.error || "Failed to send." });
      }
    } catch { setComposeStatus({ type: "error", text: "Network error. Please try again." }); }
    finally { setIsSending(false); }
  };

  // ─── Inline Reply ─────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyText.trim() || !currentEmail) return;
    setIsReplying(true);
    try {
      const subject = currentEmail.subject.startsWith("Re:") ? currentEmail.subject : `Re: ${currentEmail.subject}`;
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;"><p>${replyText.replace(/\n/g, "<br/>")}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/><div style="color:#64748b;font-size:12px;"><strong>On ${new Date(currentEmail.date).toLocaleString()}, ${currentEmail.fromName} wrote:</strong><blockquote style="margin:8px 0 0 12px;border-left:2px solid #cbd5e1;padding-left:10px;color:#475569;">${(currentEmail.text || "").replace(/\n/g, "<br/>")}</blockquote></div></div>`;
      const res = await fetch("/api/mail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: currentEmail.fromAddress, subject, text: replyText, html }) });
      if (res.ok) { alert("Reply sent!"); setReplyText(""); }
      else alert("Failed to send reply.");
    } finally { setIsReplying(false); }
  };

  // ─── Templates ────────────────────────────────────────────────────────────────
  const applyTemplate = (type: string) => {
    setActiveTemplate(type);
    if (type === "booking") {
      setComposeSubject("Booking Confirmation — Hotel Devang, Dwarka");
      setComposeBody(`Dear Guest,\n\nGreetings from Hotel Devang, Dwarka!\n\nWe are pleased to confirm your reservation with us. Our property is located near the holy Dwarkadhish Temple (Jagad Mandir) and the sea beach.\n\nCheck-in Time: 12:30 PM\nCheck-out Time: 10:00 AM\n\nFor travel assistance from Dwarka Railway Station or sightseeing guidance, please call us at +91 98244 02132.\n\nWarm regards,\nReservations Team\nHotel Devang, Dwarka`);
    } else if (type === "payment") {
      setComposeSubject("Payment Receipt & Booking Voucher — Hotel Devang");
      setComposeBody(`Dear Guest,\n\nWe have received your payment for your reservation at Hotel Devang, Dwarka.\n\nYour stay is confirmed. Please present this email or a valid Government ID upon check-in.\n\nThank you for choosing Hotel Devang!\n\nWarm regards,\nFront Desk & Accounts\nHotel Devang`);
    } else if (type === "darshan") {
      setComposeSubject("Dwarkadhish Darshan Timings & Local Travel Tips");
      setComposeBody(`Jai Dwarkadhish!\n\nDarshan Timings at Dwarkadhish Jagad Mandir:\n\n• Morning: 6:30 AM – 1:00 PM\n• Evening: 5:00 PM – 9:30 PM\n\nNearby Attractions:\n1. Bhadkeshwar Mahadev & Sunset Point (~500m)\n2. Sudama Setu & Gomti Ghat (~800m)\n3. Nageshwar Jyotirlinga & Bet Dwarka (~30 km)\n\nOur 24/7 reception desk can assist with local transport.\n\nWarm regards,\nHotel Devang Team`);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────────
  const filteredEmails = emails.filter((item) => {
    if (filterType === "unread" && item.isRead) return false;
    if (filterType === "starred" && !item.isStarred) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.subject.toLowerCase().includes(q) || item.fromName.toLowerCase().includes(q) || item.fromAddress.toLowerCase().includes(q);
  });

  const folders = [
    { key: "inbox", label: "Inbox", count: unreadCount > 0 ? unreadCount : null },
    { key: "sent", label: "Sent", count: null },
    { key: "trash", label: "Trash", count: null },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] overflow-hidden bg-slate-50">

      {/* ══════ TOP HEADER ══════ */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-sm shadow-blue-200">
            <Mail className="h-4.5 w-4.5 text-white" style={{ height: "18px", width: "18px" }} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Mail Center</h1>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-none">info@hoteldevang.com</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEmails(folder, page, true)}
            disabled={refreshing || loadingList}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => { setComposeOpen(true); setActiveTemplate(null); setComposeTo(""); setComposeSubject(""); setComposeBody(""); setComposeStatus(null); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg shadow-sm shadow-blue-200 transition-all duration-150 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Compose
          </button>
        </div>
      </div>

      {/* ══════ MAIL CLIENT BODY ══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Folder Sidebar ── */}
        <div className="w-52 shrink-0 bg-white border-r border-slate-200/80 flex flex-col py-3 px-2">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Folders</p>

          {folders.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setPage(1); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 text-xs font-medium transition-all duration-150 ${
                folder === f.key
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={folder === f.key ? "text-blue-600" : "text-slate-400"}>
                  {FOLDER_ICONS[f.key]}
                </span>
                {f.label}
              </span>
              {f.count ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {f.count}
                </span>
              ) : null}
            </button>
          ))}

          {/* Spacer + account info */}
          <div className="mt-auto px-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              {total} {folder === "inbox" ? "message" : ""}s in folder
            </p>
          </div>
        </div>

        {/* ── Email List ── */}
        <div className="w-80 shrink-0 border-r border-slate-200/80 bg-white flex flex-col overflow-hidden">
          {/* Search + Filters */}
          <div className="px-3 py-3 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-slate-400 transition"
              />
            </div>

            <div className="flex items-center gap-1">
              {(["all", "unread", "starred"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-medium capitalize transition-all duration-150 ${
                    filterType === type
                      ? type === "unread"
                        ? "bg-blue-100 text-blue-700"
                        : type === "starred"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                <p className="text-xs">Loading messages...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
                <MailOpen className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">No emails found</p>
                <p className="text-xs text-slate-300">Your {folder} is empty</p>
              </div>
            ) : (
              filteredEmails.map((item) => {
                const isSelected = selectedUid === item.uid;
                const initials = getInitials(item.fromName);
                const avatarColor = getAvatarColor(item.fromName);
                return (
                  <div
                    key={item.uid}
                    onClick={() => handleSelectEmail(item.uid)}
                    className={`relative px-3 py-3.5 cursor-pointer border-b border-slate-100 transition-all duration-150 group ${
                      isSelected
                        ? "bg-blue-50 border-l-2 border-l-blue-600"
                        : item.isRead
                        ? "hover:bg-slate-50"
                        : "bg-blue-50/30 hover:bg-blue-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className={`shrink-0 h-8 w-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs truncate ${item.isRead ? "text-slate-700 font-medium" : "text-slate-900 font-semibold"}`}>
                            {item.fromName || item.fromAddress}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400 ml-1">{formatDate(item.date)}</span>
                        </div>
                        <p className={`text-[11px] truncate mb-0.5 ${item.isRead ? "text-slate-500" : "text-slate-800 font-medium"}`}>
                          {item.subject}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{item.fromAddress}</p>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!item.isRead && (
                      <div className="absolute top-4 right-10 h-2 w-2 rounded-full bg-blue-600" />
                    )}

                    {/* Hover actions */}
                    <div className="absolute top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-white rounded-md shadow-sm border border-slate-100 px-1 py-0.5">
                      <button
                        onClick={(e) => handleToggleStar(item.uid, item.isStarred, e)}
                        className={`p-1 rounded ${item.isStarred ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
                        title="Star"
                      >
                        <Star className="h-3 w-3 fill-current" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteEmail(item.uid, e)}
                        className="p-1 rounded text-slate-300 hover:text-rose-500"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{total} total · page {page}/{Math.max(1, Math.ceil(total / 25))}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition"
                >
                  <ChevronLeft className="h-3 w-3 text-slate-600" />
                </button>
                <button
                  disabled={page * 25 >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1 rounded bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition"
                >
                  <ChevronRight className="h-3 w-3 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Reading Pane ── */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
              <p className="text-xs">Opening email...</p>
            </div>
          ) : !currentEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-5 shadow-inner">
                <MailOpen className="h-9 w-9 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-2">Select an email to read</h3>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                Click any message from your {folder} to view its full content, reply, or take action.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Email Header */}
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold text-slate-900 leading-snug flex-1">
                    {currentEmail.subject}
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleStar(currentEmail.uid, currentEmail.isStarred, { stopPropagation: () => {} } as any)}
                      className={`p-2 rounded-lg transition ${currentEmail.isStarred ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}
                      title="Star"
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </button>
                    <button onClick={() => window.print()} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" title="Print">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteEmail(currentEmail.uid)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getAvatarColor(currentEmail.fromName)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                      {getInitials(currentEmail.fromName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{currentEmail.fromName}</p>
                      <p className="text-xs text-slate-400 font-mono">{currentEmail.fromAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(currentEmail.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
                  {currentEmail.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-xs">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate max-w-[160px]">{att.filename || "Attachment"}</span>
                      <span className="text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {currentEmail.html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: currentEmail.html }}
                    className="prose prose-sm max-w-none text-slate-800"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                    {currentEmail.text}
                  </pre>
                )}
              </div>

              {/* Quick Reply */}
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Reply className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    Reply to <span className="text-blue-600">{currentEmail.fromName}</span>
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none placeholder-slate-400 transition"
                />
                <div className="flex justify-end mt-2">
                  <button
                    disabled={isReplying || !replyText.trim()}
                    onClick={handleSendReply}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg disabled:opacity-40 transition-all active:scale-95"
                  >
                    {isReplying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isReplying ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ COMPOSE MODAL ══════ */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">

            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-blue-950 rounded-t-2xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-600/30 flex items-center justify-center">
                  <Mail className="h-3.5 w-3.5 text-blue-300" />
                </div>
                <span className="text-sm font-semibold text-white">New Message</span>
              </div>
              <button onClick={() => setComposeOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Templates */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Templates</span>
              </div>
              {[
                { key: "booking", label: "🏨 Booking Confirmation", color: "blue" },
                { key: "payment", label: "💳 Payment Receipt", color: "emerald" },
                { key: "darshan", label: "🕉️ Darshan Info", color: "amber" },
              ].map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl.key)}
                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all duration-150 ${
                    activeTemplate === tpl.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSendEmail} className="flex-1 flex flex-col overflow-y-auto">
              <div className="px-5 divide-y divide-slate-100">
                {/* To */}
                <div className="relative py-3 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 w-8 shrink-0">To</span>
                  <input
                    type="text"
                    required
                    placeholder="Recipient email address or guest name..."
                    value={composeTo}
                    onChange={(e) => handleGuestSearch(e.target.value)}
                    className="flex-1 py-1 text-sm text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                  />
                  {searchingGuests && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />}

                  {guestResults.length > 0 && (
                    <div className="absolute top-full left-8 right-0 z-20 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                      {guestResults.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => { setComposeTo(g.phone ? `${g.name} <${g.phone}@guest.hoteldevang.com>` : g.name); setGuestResults([]); }}
                          className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{g.name}</span>
                            <span className="text-slate-400 ml-2">#{g.bookingId}</span>
                          </div>
                          <span className="text-slate-500 font-mono">{g.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="py-3 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 w-8 shrink-0">Sub</span>
                  <input
                    type="text"
                    required
                    placeholder="Subject..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="flex-1 py-1 text-sm text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 px-5 pb-2 pt-1">
                <textarea
                  required
                  rows={9}
                  placeholder="Write your message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full p-0 text-sm text-slate-800 bg-transparent focus:outline-none resize-none placeholder-slate-400 leading-relaxed"
                />
              </div>

              {/* Status */}
              {composeStatus && (
                <div className={`mx-5 mb-3 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  composeStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {composeStatus.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {composeStatus.text}
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
                <span className="text-[11px] text-slate-400">Secure delivery via Hotel Devang mail</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setComposeOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg shadow-sm disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isSending ? "Sending..." : "Send Email"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
