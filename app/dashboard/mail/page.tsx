"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Forward,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  X,
  FileText,
  Building,
  Printer,
  ChevronLeft,
  ChevronRight,
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

  // Compose State
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [composeStatus, setComposeStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Guest Search Auto-complete
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [searchingGuests, setSearchingGuests] = useState<boolean>(false);

  // Quick Inline Reply
  const [replyText, setReplyText] = useState<string>("");
  const [isReplying, setIsReplying] = useState<boolean>(false);

  // ── Fetch Email List ──
  const fetchEmails = useCallback(async (targetFolder: string, targetPage: number = 1) => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/mail?folder=${targetFolder}&page=${targetPage}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        setTotal(data.total || 0);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error("Failed to load emails");
      }
    } catch (err) {
      console.error("Error loading emails:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails(folder, page);
  }, [folder, page, fetchEmails]);

  // ── Fetch Email Detail ──
  const handleSelectEmail = async (uid: number) => {
    setSelectedUid(uid);
    setLoadingDetail(true);
    setCurrentEmail(null);
    setReplyText("");

    try {
      const res = await fetch(`/api/mail/${uid}?folder=${folder}`);
      if (res.ok) {
        const data: EmailDetail = await res.json();
        setCurrentEmail(data);

        // Update read status in local list
        setEmails((prev) =>
          prev.map((e) => (e.uid === uid ? { ...e, isRead: true } : e))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error loading email content:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Star Toggle ──
  const handleToggleStar = async (uid: number, currentlyStarred: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !currentlyStarred;

    // Optimistic update
    setEmails((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, isStarred: nextState } : item))
    );
    if (currentEmail && currentEmail.uid === uid) {
      setCurrentEmail({ ...currentEmail, isStarred: nextState });
    }

    try {
      await fetch("/api/mail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, folder, action: "star", value: nextState }),
      });
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // ── Delete Email ──
  const handleDeleteEmail = async (uid: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this email?")) return;

    try {
      const res = await fetch(`/api/mail?uid=${uid}&folder=${folder}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEmails((prev) => prev.filter((item) => item.uid !== uid));
        if (selectedUid === uid) {
          setSelectedUid(null);
          setCurrentEmail(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete email:", err);
    }
  };

  // ── Guest Search for Autocomplete ──
  const handleGuestSearch = async (val: string) => {
    setComposeTo(val);
    if (val.length < 2) {
      setGuestResults([]);
      return;
    }
    setSearchingGuests(true);
    try {
      const res = await fetch(`/api/mail/guests?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setGuestResults(data.guests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingGuests(false);
    }
  };

  // ── Send Email ──
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setComposeStatus({ type: "error", text: "Please fill in recipient, subject, and message." });
      return;
    }

    setIsSending(true);
    setComposeStatus(null);

    // Format plain text into styled HTML email template
    const formattedHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0D1B4A 0%, #1E3A8A 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-family: Georgia, serif; letter-spacing: 2px; font-size: 20px;">HOTEL DEVANG</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #caa035; letter-spacing: 1.5px; text-transform: uppercase;">Dwarka, Gujarat - 361335</p>
        </div>
        <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6; font-size: 14px;">
          ${composeBody.replace(/\n/g, "<br/>")}
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Opp. Circuit House, Hospital Road, Dwarka, Gujarat - 361335</p>
          <p style="margin: 4px 0 0 0;">Phone: +91 98244 02132 | Email: info@hoteldevang.com</p>
        </div>
      </div>
    `;

    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeBody,
          html: formattedHtml,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setComposeStatus({ type: "success", text: "Email sent successfully via Hostinger SMTP!" });
        setTimeout(() => {
          setComposeOpen(false);
          setComposeTo("");
          setComposeSubject("");
          setComposeBody("");
          setComposeStatus(null);
          if (folder === "sent") {
            fetchEmails("sent");
          }
        }, 1500);
      } else {
        setComposeStatus({ type: "error", text: data.error || "Failed to send email." });
      }
    } catch {
      setComposeStatus({ type: "error", text: "Network error sending email." });
    } finally {
      setIsSending(false);
    }
  };

  // ── Send Inline Reply ──
  const handleSendReply = async () => {
    if (!replyText.trim() || !currentEmail) return;

    setIsReplying(true);
    try {
      const replySubject = currentEmail.subject.startsWith("Re:")
        ? currentEmail.subject
        : `Re: ${currentEmail.subject}`;

      const replyHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
          <p>${replyText.replace(/\n/g, "<br/>")}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <div style="color: #64748b; font-size: 12px;">
            <strong>On ${new Date(currentEmail.date).toLocaleString()}, ${currentEmail.fromName} wrote:</strong>
            <blockquote style="margin: 8px 0 0 12px; border-left: 2px solid #cbd5e1; padding-left: 10px; color: #475569;">
              ${currentEmail.text ? currentEmail.text.replace(/\n/g, "<br/>") : ""}
            </blockquote>
          </div>
        </div>
      `;

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentEmail.fromAddress,
          subject: replySubject,
          text: replyText,
          html: replyHtml,
        }),
      });

      if (res.ok) {
        alert("Reply sent successfully!");
        setReplyText("");
      } else {
        alert("Failed to send reply.");
      }
    } catch {
      alert("Error sending reply.");
    } finally {
      setIsReplying(false);
    }
  };

  // ── Templates ──
  const applyTemplate = (type: "booking" | "payment" | "darshan") => {
    if (type === "booking") {
      setComposeSubject("Booking Confirmation — Hotel Devang, Dwarka");
      setComposeBody(
        `Dear Guest,\n\nGreetings from Hotel Devang, Dwarka!\n\nWe are pleased to confirm your reservation with us. Our property is strategically located near the holy Dwarkadhish Temple (Jagad Mandir) and the sea beach.\n\nCheck-in Time: 12:30 PM\nCheck-out Time: 10:00 AM\n\nIf you need any travel assistance from Dwarka Railway Station or sightseeing guidance for Bet Dwarka / Somnath, feel free to reply directly to this email or call us at +91 98244 02132.\n\nWarm regards,\nReservations Team\nHotel Devang, Dwarka`
      );
    } else if (type === "payment") {
      setComposeSubject("Payment Receipt & Booking Voucher — Hotel Devang");
      setComposeBody(
        `Dear Guest,\n\nWe have received your payment for the reservation at Hotel Devang, Dwarka.\n\nYour stay is officially confirmed. Please present your booking confirmation email or valid Government ID upon check-in at the front desk.\n\nThank you for choosing Hotel Devang for your sacred visit to Dwarka!\n\nWarm regards,\nFront Desk & Accounts\nHotel Devang`
      );
    } else if (type === "darshan") {
      setComposeSubject("Dwarkadhish Darshan Timings & Local Travel Tips");
      setComposeBody(
        `Jai Dwarkadhish!\n\nTo make your pilgrimage comfortable, here are the key darshan timings at Dwarkadhish Jagad Mandir:\n\n• Morning Darshan (Mangla Aarti): 6:30 AM to 1:00 PM\n• Evening Darshan (Sandhya Aarti): 5:00 PM to 9:30 PM\n\nNearby places to explore:\n1. Bhadkeshwar Mahadev Mandir & Sunset Point (Walking distance ~500m from Hotel Devang)\n2. Sudama Setu & Gomti Ghat (800m)\n3. Nageshwar Jyotirlinga & Bet Dwarka (~30 km)\n\nFeel free to ask our 24/7 reception desk for local travel cars or assistance.\n\nWarm regards,\nHotel Devang Team`
      );
    }
  };

  // ── Filtered Email List ──
  const filteredEmails = emails.filter((item) => {
    if (filterType === "unread" && item.isRead) return false;
    if (filterType === "starred" && !item.isStarred) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.subject.toLowerCase().includes(q) ||
      item.fromName.toLowerCase().includes(q) ||
      item.fromAddress.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-3 md:p-6 bg-slate-50 font-sans">
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white shadow">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Mail Center
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Hostinger Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              info@hoteldevang.com &bull; imap.hostinger.com (SSL)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEmails(folder, page)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Refresh Mailbox"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Compose Mail
          </button>
        </div>
      </div>

      {/* ── Main Mail Client Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        {/* ── Column 1: Folder Sidebar (2 cols) ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <button
              onClick={() => {
                setFolder("inbox");
                setPage(1);
                setSelectedUid(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                folder === "inbox"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Inbox className="h-4 w-4 text-blue-600" />
                Inbox
              </span>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setFolder("sent");
                setPage(1);
                setSelectedUid(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                folder === "sent"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-emerald-600" />
                Sent
              </span>
            </button>

            <button
              onClick={() => {
                setFolder("trash");
                setPage(1);
                setSelectedUid(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                folder === "trash"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Trash2 className="h-4 w-4 text-rose-500" />
                Trash
              </span>
            </button>
          </div>

          {/* Hotel Devang Account Status */}
          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Building className="h-3.5 w-3.5 text-blue-600" />
              <span>Hotel Devang Webmail</span>
            </div>
            <p className="text-[10px] text-slate-400">Total in folder: {total}</p>
          </div>
        </div>

        {/* ── Column 2: Message List (4 cols) ── */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2 py-0.5 rounded ${
                  filterType === "all" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All ({filteredEmails.length})
              </button>
              <button
                onClick={() => setFilterType("unread")}
                className={`px-2 py-0.5 rounded ${
                  filterType === "unread" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterType("starred")}
                className={`px-2 py-0.5 rounded ${
                  filterType === "starred" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Starred
              </button>
            </div>
          </div>

          {/* List Scrollable Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                <span>Checking Hostinger mailbox...</span>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                No emails found in {folder}.
              </div>
            ) : (
              filteredEmails.map((item) => {
                const isSelected = selectedUid === item.uid;
                return (
                  <div
                    key={item.uid}
                    onClick={() => handleSelectEmail(item.uid)}
                    className={`p-3 cursor-pointer transition flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-blue-50/80 border-l-4 border-blue-600"
                        : item.isRead
                        ? "bg-white hover:bg-slate-50"
                        : "bg-blue-50/30 hover:bg-blue-50/50 font-semibold"
                    }`}
                  >
                    {/* Unread indicator */}
                    <div className="pt-1.5 shrink-0">
                      <span
                        className={`block h-2 w-2 rounded-full ${
                          item.isRead ? "bg-transparent" : "bg-blue-600"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="truncate text-slate-800 font-medium">
                          {item.fromName || item.fromAddress}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {new Date(item.date).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <h4 className="text-xs text-slate-900 truncate mb-0.5">
                        {item.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.fromAddress}
                      </p>
                    </div>

                    {/* Star & Delete Action */}
                    <div className="flex items-center gap-1 shrink-0 pt-1">
                      <button
                        onClick={(e) => handleToggleStar(item.uid, item.isStarred, e)}
                        className={`p-1 rounded hover:bg-slate-200/50 ${
                          item.isStarred ? "text-amber-500" : "text-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteEmail(item.uid, e)}
                        className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Pagination Footer */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {Math.max(1, Math.ceil(total / 25))}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={page * 25 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Column 3: Email Reader Pane (6 cols) ── */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
          {loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-slate-400 gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span>Fetching email content...</span>
            </div>
          ) : !currentEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Mail className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No Email Selected</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Select an email from the list on the left to read its full content, send quick replies, or view attachments.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Email Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {currentEmail.subject}
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                      title="Print Email"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmail(currentEmail.uid)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      title="Delete Email"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center uppercase">
                      {currentEmail.fromName.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{currentEmail.fromName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{currentEmail.fromAddress}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(currentEmail.date).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Attachments (if any) */}
              {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 text-xs">
                  {currentEmail.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 shadow-xs"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]">{att.filename || "Attachment"}</span>
                      <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-800 leading-relaxed bg-white">
                {currentEmail.html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: currentEmail.html }}
                    className="email-html-body prose max-w-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">
                    {currentEmail.text}
                  </pre>
                )}
              </div>

              {/* Quick Inline Reply Box */}
              <div className="p-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700">
                  <Reply className="h-3.5 w-3.5 text-blue-600" />
                  Quick Reply to {currentEmail.fromName}
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      disabled={isReplying || !replyText.trim()}
                      onClick={handleSendReply}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-40 transition"
                    >
                      {isReplying ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          COMPOSE MODAL
          ══════════════════════════════════════════ */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-wide">Compose New Email</h3>
                <span className="text-[11px] text-blue-200">via info@hoteldevang.com</span>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Templates Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Quick Templates:
              </span>
              <button
                type="button"
                onClick={() => applyTemplate("booking")}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-md shadow-2xs transition"
              >
                🏨 Booking Confirmation
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("payment")}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 rounded-md shadow-2xs transition"
              >
                💳 Payment Receipt
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("darshan")}
                className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-amber-50 text-amber-700 border border-slate-200 rounded-md shadow-2xs transition"
              >
                🕉️ Dwarka Darshan Info
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendEmail} className="p-5 flex-1 flex flex-col gap-3 overflow-y-auto">
              {/* Recipient with Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  To (Guest Email or Name)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="guest@example.com or start typing guest name / phone..."
                    value={composeTo}
                    onChange={(e) => handleGuestSearch(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  {searchingGuests && (
                    <RefreshCw className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {guestResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                    {guestResults.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          // If phone available, prompt or use email if stored, or set as placeholder
                          setComposeTo(g.phone ? `${g.name} <guest-${g.phone}@hoteldevang.com>` : g.name);
                          setGuestResults([]);
                        }}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{g.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">ID: {g.bookingId}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{g.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="Subject of the email..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Message Body */}
              <div className="flex-1 flex flex-col min-h-[180px]">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Body
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Write your email message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full flex-1 p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                />
              </div>

              {/* Status Message */}
              {composeStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    composeStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {composeStatus.type === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{composeStatus.text}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-[11px] text-slate-400">
                  Outgoing via Hostinger SMTP (Port 465 SSL)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComposeOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm disabled:opacity-50 transition active:scale-95"
                  >
                    {isSending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
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
