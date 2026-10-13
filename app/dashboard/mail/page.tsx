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
  ChevronUp,
  ChevronDown,
  GripHorizontal,
  MailOpen,
  Building2,
  CreditCard,
  Landmark,
  Sparkles,
  CornerDownLeft,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  FileText,
  Users,
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

export interface MailContact {
  name: string;
  email: string;
  source?: "recent" | "contact" | "inbox";
}

const SEED_CONTACTS: MailContact[] = [
  { name: "Kushang Acharya", email: "kushangacharya8830@gmail.com", source: "recent" },
  { name: "Hotel Devang", email: "devanghotel@gmail.com", source: "contact" },
  { name: "Hotel Devang Info", email: "info@hoteldevang.com", source: "contact" },
  { name: "Hotel Devang Reservations", email: "reservations@hoteldevang.com", source: "contact" },
  { name: "Hotel Devang Support", email: "support@hoteldevang.com", source: "contact" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name?: string, email?: string) {
  const cleanName = (name || "").trim();
  if (cleanName && !cleanName.includes("@")) {
    const p = cleanName.split(/\s+/);
    return p.length === 1
      ? p[0][0].toUpperCase()
      : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  const cleanEmail = (email || cleanName || "").trim();
  if (cleanEmail) return cleanEmail[0].toUpperCase();
  return "?";
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
        html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1e293b;background:#fff}
        img{max-width:100% !important;height:auto !important;vertical-align:middle}
        a{color:#2563eb;text-decoration:underline}
        table{max-width:100% !important;border-collapse:collapse}
        td,th{word-break:break-word}
        pre{white-space:pre-wrap;word-break:break-word}
        body{overflow-x:auto;padding:8px 0}
      </style>
    </head><body>${html}</body></html>`);
    doc.close();

    const resize = () => {
      if (iframe?.contentWindow?.document) {
        const body = iframe.contentWindow.document.body;
        const docEl = iframe.contentWindow.document.documentElement;
        if (body && docEl) {
          const h = Math.max(
            body.scrollHeight || 0,
            body.offsetHeight || 0,
            docEl.clientHeight || 0,
            docEl.scrollHeight || 0
          );
          iframe.style.height = `${Math.max(h + 24, 160)}px`;
        }
      }
    };

    iframe.onload = resize;

    // Attach listener to any loaded images
    const imgs = doc.querySelectorAll("img");
    imgs.forEach(img => {
      img.addEventListener("load", resize);
    });

    const timers = [
      setTimeout(resize, 100),
      setTimeout(resize, 350),
      setTimeout(resize, 800),
      setTimeout(resize, 1500),
    ];

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Email content"
      sandbox="allow-same-origin"
      style={{ width: "100%", minHeight: "160px", border: "none", display: "block" }}
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
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenOpen(false);
    };
    if (fullscreenOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [fullscreenOpen]);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composeStatus, setComposeStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Contact Autocomplete States ───────────────────────────────────────────
  const [contactSuggestions, setContactSuggestions] = useState<MailContact[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [recentContacts, setRecentContacts] = useState<MailContact[]>([]);

  const toInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const composeSubjectRef = useRef<HTMLInputElement>(null);
  const contactsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent contacts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("devang_mail_contacts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentContacts(parsed);
        }
      }
    } catch {}
  }, []);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        toInputRef.current &&
        !toInputRef.current.contains(e.target as Node)
      ) {
        setShowContactSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);


  // ─── Outgoing Attachments ──────────────────────────────────────────────────
  interface OutgoingAttachment {
    name: string;
    size: number;
    type: string;
    base64: string;
  }
  const [composeAttachments, setComposeAttachments] = useState<OutgoingAttachment[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<OutgoingAttachment[]>([]);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const b64 = res.split(",")[1] || "";
        resolve(b64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleAddComposeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const items: OutgoingAttachment[] = [];
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        alert(`"${f.name}" exceeds the 20MB limit.`);
        continue;
      }
      const b64 = await fileToBase64(f);
      items.push({
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        base64: b64,
      });
    }
    setComposeAttachments((prev) => [...prev, ...items]);
    e.target.value = "";
  };

  const handleAddReplyFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const items: OutgoingAttachment[] = [];
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        alert(`"${f.name}" exceeds the 20MB limit.`);
        continue;
      }
      const b64 = await fileToBase64(f);
      items.push({
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        base64: b64,
      });
    }
    setReplyAttachments((prev) => [...prev, ...items]);
    if (replyBoxHeight <= 75) {
      setReplyBoxHeight(220);
    }
    e.target.value = "";
  };

  // ─── Resizable & Double-clickable Reply Box ────────────────────────────────
  const [replyBoxHeight, setReplyBoxHeight] = useState(54); // Default small proper rectangle
  const [isDragging, setIsDragging] = useState(false);
  const replyDragStartY = useRef<number>(0);
  const replyDragStartH = useRef<number>(54);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    replyDragStartY.current = e.clientY;
    replyDragStartH.current = replyBoxHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = replyDragStartY.current - moveEvent.clientY; // moving up increases height
      const newHeight = Math.max(54, Math.min(480, replyDragStartH.current + delta));
      setReplyBoxHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDoubleClickBorder = () => {
    if (replyBoxHeight <= 75) {
      setReplyBoxHeight(220);
      setTimeout(() => replyTextareaRef.current?.focus(), 60);
    } else {
      setReplyBoxHeight(54);
    }
  };

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
      if (selectedUid === uid) {
        setSelectedUid(null);
        setCurrentEmail(null);
        setFullscreenOpen(false);
      }
    }
  };

  // ─── Print Isolated Email ──────────────────────────────────────────────────
  const handlePrintEmail = (email: EmailDetail) => {
    if (!email) return;

    const oldFrame = document.getElementById("email-print-frame");
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "email-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const contentHtml = email.html
      ? email.html
      : `<pre style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; margin: 0;">${(email.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;

    const attachmentsList = email.attachments && email.attachments.length > 0
      ? `<tr>
          <td style="padding: 4px 0; color: #64748b; font-weight: 600; width: 90px; vertical-align: top;">Attachments:</td>
          <td style="padding: 4px 0; color: #1e293b;">${email.attachments.map(a => `${(a.filename || "Attachment").replace(/</g, "&lt;").replace(/>/g, "&gt;")} (${Math.round((a.size || 0) / 1024)} KB)`).join(", ")}</td>
        </tr>`
      : "";

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${(email.subject || "Email").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  <style>
    @page {
      margin: 15mm 15mm 15mm 15mm;
      size: auto;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .print-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.35;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .meta-table td {
      vertical-align: top;
    }
    .meta-label {
      width: 70px;
      color: #64748b;
      font-weight: 600;
      padding: 3px 0;
    }
    .meta-value {
      color: #0f172a;
      padding: 3px 0;
    }
    .print-body {
      width: 100%;
      color: #1e293b;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
    table {
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1 class="print-title">${(email.subject || "Untitled Email").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
    <table class="meta-table">
      <tr>
        <td class="meta-label">From:</td>
        <td class="meta-value"><strong>${(email.fromName || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong> &lt;${(email.fromAddress || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}&gt;</td>
      </tr>
      <tr>
        <td class="meta-label">To:</td>
        <td class="meta-value">${(email.to || "info@hoteldevang.com").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
      </tr>
      <tr>
        <td class="meta-label">Date:</td>
        <td class="meta-value">${new Date(email.date).toLocaleString([], { dateStyle: "full", timeStyle: "medium" })}</td>
      </tr>
      ${attachmentsList}
    </table>
  </div>
  <div class="print-body">
    ${contentHtml}
  </div>
</body>
</html>`);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      }
    };

    const imgs = iframe.contentWindow?.document.images;
    if (imgs && imgs.length > 0) {
      let loaded = 0;
      let fired = false;
      const timer = setTimeout(() => {
        if (!fired) { fired = true; doPrint(); }
      }, 700);

      Array.from(imgs).forEach(img => {
        if (img.complete) {
          loaded++;
          if (loaded === imgs.length && !fired) {
            fired = true;
            clearTimeout(timer);
            doPrint();
          }
        } else {
          img.onload = img.onerror = () => {
            loaded++;
            if (loaded === imgs.length && !fired) {
              fired = true;
              clearTimeout(timer);
              doPrint();
            }
          };
        }
      });
    } else {
      setTimeout(doPrint, 250);
    }
  };

  // ─── Contact Autocomplete & Suggestion Handlers ──────────────────────────
  const getKnownContacts = useCallback((): MailContact[] => {
    const map = new Map<string, MailContact>();

    // 1. Default seed contacts
    for (const c of SEED_CONTACTS) {
      map.set(c.email.toLowerCase(), c);
    }

    // 2. Contacts harvested from loaded emails
    for (const e of emails) {
      if (e.fromAddress && e.fromAddress.includes("@")) {
        const addr = e.fromAddress.toLowerCase().trim();
        const existing = map.get(addr);
        const name = (e.fromName || "").trim() || addr.split("@")[0];
        if (!existing || (!existing.name && name)) {
          map.set(addr, { name, email: addr, source: "inbox" });
        }
      }
    }

    // 3. Stored recent contacts (take precedence for recent ranking)
    for (const c of recentContacts) {
      if (c.email && c.email.includes("@")) {
        map.set(c.email.toLowerCase().trim(), { ...c, source: "recent" });
      }
    }

    return Array.from(map.values());
  }, [emails, recentContacts]);

  const filterContacts = useCallback((val: string) => {
    const q = val.trim().toLowerCase();
    const all = getKnownContacts();
    if (!q) {
      setContactSuggestions(all.slice(0, 8));
      return;
    }

    const matches = all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );

    matches.sort((a, b) => {
      const aEmailStart = a.email.toLowerCase().startsWith(q);
      const bEmailStart = b.email.toLowerCase().startsWith(q);
      if (aEmailStart && !bEmailStart) return -1;
      if (!aEmailStart && bEmailStart) return 1;

      const aNameStart = a.name.toLowerCase().startsWith(q);
      const bNameStart = b.name.toLowerCase().startsWith(q);
      if (aNameStart && !bNameStart) return -1;
      if (!aNameStart && bNameStart) return 1;

      return 0;
    });

    setContactSuggestions(matches);
  }, [getKnownContacts]);

  const handleToChange = (val: string) => {
    setComposeTo(val);
    setShowContactSuggestions(true);
    setHighlightedIndex(0);

    filterContacts(val);

    if (contactsDebounceRef.current) clearTimeout(contactsDebounceRef.current);
    contactsDebounceRef.current = setTimeout(async () => {
      if (val.trim().length >= 1) {
        setSearchingContacts(true);
        try {
          const r = await fetch(`/api/mail/contacts?q=${encodeURIComponent(val.trim())}`);
          if (r.ok) {
            const data = await r.json();
            const serverContacts: MailContact[] = data.contacts || [];
            if (serverContacts.length > 0) {
              setContactSuggestions(prev => {
                const map = new Map<string, MailContact>();
                for (const c of prev) {
                  map.set(c.email.toLowerCase().trim(), c);
                }
                for (const sc of serverContacts) {
                  const key = sc.email.toLowerCase().trim();
                  if (!map.has(key)) {
                    map.set(key, sc);
                  }
                }
                return Array.from(map.values());
              });
            }
          }
        } finally {
          setSearchingContacts(false);
        }
      }
    }, 150);
  };

  const saveRecentContact = (contact: MailContact) => {
    try {
      const updated = [
        contact,
        ...recentContacts.filter(c => c.email.toLowerCase() !== contact.email.toLowerCase())
      ].slice(0, 40);
      setRecentContacts(updated);
      localStorage.setItem("devang_mail_contacts", JSON.stringify(updated));
    } catch {}
  };

  const selectContact = (contact: MailContact) => {
    setComposeTo(contact.email);
    setShowContactSuggestions(false);
    saveRecentContact(contact);
    setTimeout(() => {
      composeSubjectRef.current?.focus();
    }, 50);
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showContactSuggestions || contactSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % contactSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + contactSuggestions.length) % contactSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (contactSuggestions[highlightedIndex]) {
        e.preventDefault();
        selectContact(contactSuggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowContactSuggestions(false);
    }
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
    const payloadAttachments = composeAttachments.map((a) => ({
      filename: a.name,
      content: a.base64,
      contentType: a.type,
    }));
    try {
      const r = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeBody,
          html,
          attachments: payloadAttachments,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setComposeStatus({ type: "success", text: "Email sent successfully!" });
        setComposeAttachments([]);
        if (composeTo.includes("@")) {
          saveRecentContact({
            name: composeTo.split("@")[0],
            email: composeTo.trim(),
            source: "recent",
          });
        }
        setTimeout(() => {
          setComposeOpen(false);
          setComposeTo("");
          setComposeSubject("");
          setComposeBody("");
          setComposeStatus(null);
          setActiveTemplate(null);
          setShowContactSuggestions(false);
          if (folder === "sent") fetchEmails("sent");
        }, 1500);
      } else {
        setComposeStatus({ type: "error", text: d.error || "Failed to send." });
      }
    } catch {
      setComposeStatus({ type: "error", text: "Network error." });
    } finally {
      setIsSending(false);
    }
  };

  // ─── Reply ───────────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if ((!replyText.trim() && replyAttachments.length === 0) || !currentEmail) return;
    setIsReplying(true);
    try {
      const subj = currentEmail.subject.startsWith("Re:") ? currentEmail.subject : `Re: ${currentEmail.subject}`;
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#1e293b;">
        <p style="margin:0 0 16px;">${replyText.replace(/\n/g, "<br/>")}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
        <p style="color:#64748b;font-size:12px;margin:0;">On ${new Date(currentEmail.date).toLocaleString()}, <strong>${currentEmail.fromName}</strong> wrote:</p>
        <blockquote style="margin:8px 0 0;padding:10px 14px;border-left:3px solid #cbd5e1;color:#475569;font-size:13px;">${(currentEmail.text || "").replace(/\n/g, "<br/>")}</blockquote>
      </div>`;
      const payloadAttachments = replyAttachments.map((a) => ({
        filename: a.name,
        content: a.base64,
        contentType: a.type,
      }));
      const r = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentEmail.fromAddress,
          subject: subj,
          text: replyText,
          html,
          attachments: payloadAttachments,
        }),
      });
      if (r.ok) {
        alert("Reply sent!");
        setReplyText("");
        setReplyAttachments([]);
      } else {
        alert("Failed to send reply.");
      }
    } finally {
      setIsReplying(false);
    }
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
            onClick={() => {
              setComposeOpen(true);
              setActiveTemplate(null);
              setComposeTo("");
              setComposeSubject("");
              setComposeBody("");
              setComposeStatus(null);
              setShowContactSuggestions(false);
              setTimeout(() => toInputRef.current?.focus(), 80);
            }}
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff", position: "relative" }}>
          {isDragging && (
            <div style={{ position: "fixed", inset: 0, zIndex: 99999, cursor: "ns-resize", userSelect: "none" }} />
          )}

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
              <div style={{ padding: "16px 24px 14px", borderBottom: "1px solid #e2e8f0", flexShrink: 0, background: "#ffffff", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 6, background: "#eff6ff", color: "#2563eb", flexShrink: 0 }}>
                      {folder}
                    </span>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={currentEmail.subject}>
                      {currentEmail.subject}
                    </h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setReplyBoxHeight(220);
                        setTimeout(() => replyTextareaRef.current?.focus(), 60);
                      }}
                      title="Reply"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", color: "#2563eb", fontSize: 12, fontWeight: 600 }}
                    >
                      <CornerDownLeft style={{ height: 14, width: 14 }} />
                      <span>Reply</span>
                    </button>
                    <button onClick={() => setFullscreenOpen(true)} title="View full screen"
                      style={{ padding: 7, borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Maximize2 style={{ height: 15, width: 15 }} />
                    </button>
                    <button onClick={(e) => toggleStar(currentEmail.uid, currentEmail.isStarred, e)} title="Star"
                      style={{ padding: 7, borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: currentEmail.isStarred ? "#fffbeb" : "#f8fafc", color: currentEmail.isStarred ? "#f59e0b" : "#94a3b8" }}>
                      <Star style={{ height: 15, width: 15, fill: currentEmail.isStarred ? "#f59e0b" : "none" }} />
                    </button>
                    <button onClick={() => currentEmail && handlePrintEmail(currentEmail)} title="Print email"
                      style={{ padding: 7, borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", color: "#64748b" }}>
                      <Printer style={{ height: 15, width: 15 }} />
                    </button>
                    <button onClick={() => deleteEmail(currentEmail.uid)} title="Delete"
                      style={{ padding: 7, borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", color: "#94a3b8" }}>
                      <Trash2 style={{ height: 15, width: 15 }} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ height: 38, width: 38, borderRadius: "50%", background: getAvatarGradient(currentEmail.fromName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>
                      {getInitials(currentEmail.fromName)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{currentEmail.fromName}</span>
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>&lt;{currentEmail.fromAddress}&gt;</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                        To: {currentEmail.to || "info@hoteldevang.com"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#94a3b8" }}>
                    <Clock style={{ height: 12, width: 12 }} />
                    {new Date(currentEmail.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                <div
                  style={{
                    padding: "10px 28px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap" as const,
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginRight: 4 }}>
                    <Paperclip style={{ height: 13, width: 13, color: "#2563eb" }} />
                    <span>{currentEmail.attachments.length} {currentEmail.attachments.length === 1 ? "Attachment" : "Attachments"}:</span>
                  </div>
                  {currentEmail.attachments.map((a, i) => {
                    const downloadUrl = `/api/mail/${currentEmail.uid}/attachment?folder=${encodeURIComponent(folder)}&index=${i}&download=1`;
                    const viewUrl = `/api/mail/${currentEmail.uid}/attachment?folder=${encodeURIComponent(folder)}&index=${i}`;
                    const fileName = a.filename || `Attachment ${i + 1}`;
                    const sizeStr = a.size ? `${Math.round(a.size / 1024)} KB` : "";

                    return (
                      <div
                        key={i}
                        className="email-attachment-chip"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 12px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          fontSize: 12.5,
                          color: "#1e293b",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={`Click to view / open ${fileName}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            textDecoration: "none",
                            color: "#1e293b",
                            cursor: "pointer",
                          }}
                        >
                          <FileText style={{ height: 14, width: 14, color: "#2563eb", flexShrink: 0 }} />
                          <span
                            style={{
                              fontWeight: 600,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap" as const,
                            }}
                          >
                            {fileName}
                          </span>
                          {sizeStr && (
                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                              ({sizeStr})
                            </span>
                          )}
                          <ExternalLink style={{ height: 12, width: 12, color: "#94a3b8", marginLeft: 2 }} />
                        </a>

                        <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />

                        <a
                          href={downloadUrl}
                          download={fileName}
                          title={`Download ${fileName}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: "#64748b",
                            padding: "2px 4px",
                            borderRadius: 4,
                            cursor: "pointer",
                            textDecoration: "none",
                          }}
                        >
                          <Download style={{ height: 13, width: 13 }} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Email Body — Seamless full-width readable canvas */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto" as const,
                  padding: "28px 36px 36px",
                  background: "#ffffff",
                  pointerEvents: isDragging ? "none" : "auto",
                  width: "100%",
                  boxSizing: "border-box" as const,
                }}
              >
                <div style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
                  {currentEmail.html ? (
                    <IframeEmail html={currentEmail.html} />
                  ) : (
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
                        fontSize: 14.5,
                        color: "#1e293b",
                        lineHeight: 1.8,
                        margin: 0,
                      }}
                    >
                      {currentEmail.text}
                    </pre>
                  )}
                </div>
              </div>

              {/* Reply Box — Resizable sticky bottom bar */}
              <div
                style={{
                  height: replyBoxHeight,
                  background: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                  boxShadow: "0 -4px 16px rgba(15,23,42,0.05)",
                  transition: isDragging ? "none" : "height 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* ── Top Border / Resize Handle ── */}
                <div
                  onMouseDown={handleMouseDownResize}
                  onDoubleClick={handleDoubleClickBorder}
                  title="Drag border to resize height • Double-click to expand or collapse"
                  className="reply-resize-bar"
                  style={{
                    height: 12,
                    width: "100%",
                    cursor: "ns-resize",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                    flexShrink: 0,
                    userSelect: "none" as const,
                  }}
                >
                  <div
                    className="reply-resize-pill"
                    style={{
                      width: 44,
                      height: 4,
                      borderRadius: 2,
                      background: isDragging ? "#2563eb" : "#cbd5e1",
                      transition: "background 0.15s, width 0.15s",
                    }}
                  />
                </div>

                {/* Hidden Reply Attachment Input */}
                <input
                  type="file"
                  multiple
                  ref={replyFileInputRef}
                  onChange={handleAddReplyFiles}
                  style={{ display: "none" }}
                />

                {/* ── Box Content: Small Rectangle vs Expanded ── */}
                {replyBoxHeight <= 75 ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 18px",
                      background: "#ffffff",
                      boxSizing: "border-box" as const,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
                      <CornerDownLeft style={{ height: 14, width: 14, color: "#2563eb" }} />
                      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        Reply to {currentEmail.fromName}
                      </span>
                    </div>

                    <input
                      ref={replyInputRef}
                      type="text"
                      placeholder={`Write your reply... ${replyAttachments.length > 0 ? `(${replyAttachments.length} file attached)` : "(double-click border to expand)"}`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey && (replyText.trim() || replyAttachments.length > 0)) {
                          e.preventDefault();
                          handleReply();
                        }
                      }}
                      style={{
                        flex: 1,
                        height: 36,
                        padding: "0 12px",
                        fontSize: 13,
                        color: "#1e293b",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        outline: "none",
                        boxSizing: "border-box" as const,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      title="Attach file"
                      style={{
                        height: 36,
                        padding: "0 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: replyAttachments.length > 0 ? "#eff6ff" : "#f8fafc",
                        color: replyAttachments.length > 0 ? "#2563eb" : "#64748b",
                        cursor: "pointer",
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <Paperclip style={{ height: 14, width: 14 }} />
                      {replyAttachments.length > 0 && <span>{replyAttachments.length}</span>}
                    </button>

                    <button
                      disabled={isReplying || (!replyText.trim() && replyAttachments.length === 0)}
                      onClick={handleReply}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        height: 36,
                        padding: "0 16px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        background: "linear-gradient(135deg,#2563eb,#4f46e5)",
                        border: "none",
                        borderRadius: 8,
                        cursor: isReplying || (!replyText.trim() && replyAttachments.length === 0) ? "not-allowed" : "pointer",
                        opacity: isReplying || (!replyText.trim() && replyAttachments.length === 0) ? 0.5 : 1,
                        flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(79,70,229,0.25)",
                      }}
                    >
                      {isReplying ? <RefreshCw style={{ height: 13, width: 13, animation: "spin 0.8s linear infinite" }} /> : <Send style={{ height: 13, width: 13 }} />}
                      <span>Send</span>
                    </button>

                    <button
                      onClick={() => {
                        setReplyBoxHeight(220);
                        setTimeout(() => replyTextareaRef.current?.focus(), 60);
                      }}
                      title="Expand reply box (or double-click border)"
                      style={{
                        height: 36,
                        width: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#64748b",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <ChevronUp style={{ height: 16, width: 16 }} />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      padding: "8px 22px 12px",
                      background: "#ffffff",
                      boxSizing: "border-box" as const,
                      overflow: "hidden",
                    }}
                  >
                    {/* Subheader */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CornerDownLeft style={{ height: 14, width: 14, color: "#2563eb" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                          Reply to <span style={{ color: "#2563eb" }}>{currentEmail.fromName}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 6 }}>
                            &lt;{currentEmail.fromAddress}&gt;
                          </span>
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          Double-click top border to collapse
                        </span>
                        <button
                          onClick={() => setReplyBoxHeight(54)}
                          title="Collapse to small box"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 9px",
                            fontSize: 11,
                            fontWeight: 500,
                            color: "#64748b",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            cursor: "pointer",
                          }}
                        >
                          <ChevronDown style={{ height: 13, width: 13 }} />
                          <span>Small box</span>
                        </button>
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      ref={replyTextareaRef}
                      placeholder="Write your reply... (Press Ctrl+Enter to send)"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && (replyText.trim() || replyAttachments.length > 0)) {
                          e.preventDefault();
                          handleReply();
                        }
                      }}
                      style={{
                        flex: 1,
                        width: "100%",
                        padding: "10px 14px",
                        fontSize: 13,
                        color: "#1e293b",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        resize: "none",
                        outline: "none",
                        lineHeight: 1.6,
                        boxSizing: "border-box" as const,
                        fontFamily: "inherit",
                      }}
                    />

                    {/* Reply Attachments Chips */}
                    {replyAttachments.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 2px", maxHeight: 54, overflowY: "auto", flexShrink: 0 }}>
                        {replyAttachments.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: 11,
                              color: "#1e293b",
                            }}
                          >
                            <Paperclip style={{ height: 11, width: 11, color: "#2563eb" }} />
                            <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {att.name}
                            </span>
                            <span style={{ color: "#64748b" }}>({Math.round(att.size / 1024)} KB)</span>
                            <button
                              type="button"
                              onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== idx))}
                              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "#64748b", display: "flex" }}
                            >
                              <X style={{ height: 12, width: 12 }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#2563eb",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 7,
                          cursor: "pointer",
                        }}
                      >
                        <Paperclip style={{ height: 13, width: 13 }} />
                        <span>Attach File {replyAttachments.length > 0 ? `(${replyAttachments.length})` : ""}</span>
                      </button>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {replyText.trim() && (
                          <button
                            onClick={() => setReplyText("")}
                            style={{
                              padding: "6px 12px",
                              fontSize: 12,
                              color: "#64748b",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Clear
                          </button>
                        )}
                        <button
                          disabled={isReplying || (!replyText.trim() && replyAttachments.length === 0)}
                          onClick={handleReply}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 18px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#fff",
                            background: "linear-gradient(135deg,#2563eb,#4f46e5)",
                            border: "none",
                            borderRadius: 8,
                            cursor: isReplying || (!replyText.trim() && replyAttachments.length === 0) ? "not-allowed" : "pointer",
                            opacity: isReplying || (!replyText.trim() && replyAttachments.length === 0) ? 0.5 : 1,
                            boxShadow: "0 2px 6px rgba(79,70,229,0.25)",
                          }}
                        >
                          {isReplying ? <RefreshCw style={{ height: 13, width: 13, animation: "spin 0.8s linear infinite" }} /> : <Send style={{ height: 13, width: 13 }} />}
                          <span>{isReplying ? "Sending..." : "Send Reply"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ COMPOSE MODAL ══════════════════════════════════════════════════════ */}
      {composeOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setComposeOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
            padding: 24,
            boxSizing: "border-box" as const,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 860,
              height: "82vh",
              maxHeight: 740,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 25px 70px rgba(15,23,42,0.28), 0 0 0 1px rgba(226,232,240,0.8)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >

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
                    ref={toInputRef}
                    type="text" required
                    placeholder="Recipient email or name..."
                    value={composeTo}
                    onChange={e => handleToChange(e.target.value)}
                    onFocus={() => {
                      filterContacts(composeTo);
                      setShowContactSuggestions(true);
                    }}
                    onKeyDown={handleToKeyDown}
                    autoComplete="off"
                    style={{ flex: 1, fontSize: 13, color: "#1e293b", background: "transparent", border: "none", outline: "none", fontFamily: "inherit" }}
                  />
                  {searchingContacts && (
                    <RefreshCw style={{ height: 13, width: 13, color: "#94a3b8", animation: "spin 0.8s linear infinite" }} />
                  )}

                  {/* Gmail-style Recipient Suggestions Dropdown */}
                  {showContactSuggestions && contactSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 48,
                        right: 20,
                        zIndex: 100,
                        background: "#ffffff",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 16px 36px -4px rgba(15, 23, 42, 0.14), 0 6px 16px -2px rgba(15, 23, 42, 0.08)",
                        overflow: "hidden",
                        maxHeight: 290,
                        overflowY: "auto",
                      }}
                    >
                      <div style={{ padding: "8px 14px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}>
                          <Users style={{ height: 11, width: 11, color: "#2563eb" }} />
                          Suggested Contacts
                        </span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                          ↑↓ to navigate · Enter to select
                        </span>
                      </div>
                      <div style={{ padding: "4px 0" }}>
                        {contactSuggestions.map((c, idx) => {
                          const isSelected = idx === highlightedIndex;
                          const gradient = getAvatarGradient(c.name || c.email);
                          const initials = getInitials(c.name, c.email);
                          return (
                            <div
                              key={`${c.email}-${idx}`}
                              onClick={() => selectContact(c)}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              style={{
                                padding: "9px 14px",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                cursor: "pointer",
                                background: isSelected ? "#eff6ff" : "transparent",
                                borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                                transition: "background 0.1s ease",
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: "50%",
                                  background: gradient,
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  flexShrink: 0,
                                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                                }}
                              >
                                {initials}
                              </div>
                              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.name || c.email.split("@")[0]}
                                </div>
                                <div style={{ fontSize: 12, color: isSelected ? "#2563eb" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.email}
                                </div>
                              </div>
                              {isSelected ? (
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb", background: "#dbeafe", padding: "2px 7px", borderRadius: 4 }}>
                                  Select ↵
                                </span>
                              ) : (
                                <Mail style={{ height: 13, width: 13, color: "#cbd5e1" }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 28, flexShrink: 0 }}>Sub</span>
                  <input
                    ref={composeSubjectRef}
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

              {/* Hidden Compose Attachment Input */}
              <input
                type="file"
                multiple
                ref={composeFileInputRef}
                onChange={handleAddComposeFiles}
                style={{ display: "none" }}
              />

              {/* Compose Attachment Chips */}
              {composeAttachments.length > 0 && (
                <div style={{ padding: "8px 20px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap" as const, gap: 8, maxHeight: 72, overflowY: "auto" }}>
                  {composeAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontSize: 12,
                        color: "#1e293b",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      }}
                    >
                      <Paperclip style={{ height: 13, width: 13, color: "#2563eb" }} />
                      <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {att.name}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>({Math.round(att.size / 1024)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setComposeAttachments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "#94a3b8", display: "flex" }}
                      >
                        <X style={{ height: 13, width: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0 0 16px 16px" }}>
                <button
                  type="button"
                  onClick={() => composeFileInputRef.current?.click()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <Paperclip style={{ height: 14, width: 14 }} />
                  <span>Attach Files {composeAttachments.length > 0 ? `(${composeAttachments.length})` : ""}</span>
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => { setComposeOpen(false); setComposeAttachments([]); }}
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

      {/* ═══ FULLSCREEN EMAIL MODAL ════════════════════════════════════════════ */}
      {fullscreenOpen && currentEmail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setFullscreenOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.65)",
            backdropFilter: "blur(6px)",
            padding: 16,
            boxSizing: "border-box" as const,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1040,
              height: "94vh",
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.35), 0 0 0 1px rgba(226,232,240,0.8)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Fullscreen Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#eff6ff",
                      color: "#2563eb",
                    }}
                  >
                    {folder}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {new Date(currentEmail.date).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
                  </span>
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                    lineHeight: 1.3,
                  }}
                  title={currentEmail.subject}
                >
                  {currentEmail.subject}
                </h1>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={(e) => toggleStar(currentEmail.uid, currentEmail.isStarred, e)}
                  title="Star"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    background: currentEmail.isStarred ? "#fffbeb" : "#f8fafc",
                    color: currentEmail.isStarred ? "#f59e0b" : "#64748b",
                    display: "flex",
                  }}
                >
                  <Star style={{ height: 16, width: 16, fill: currentEmail.isStarred ? "#f59e0b" : "none" }} />
                </button>
                <button
                  onClick={() => currentEmail && handlePrintEmail(currentEmail)}
                  title="Print email"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    background: "#f8fafc",
                    color: "#64748b",
                    display: "flex",
                  }}
                >
                  <Printer style={{ height: 16, width: 16 }} />
                </button>
                <button
                  onClick={() => setFullscreenOpen(false)}
                  title="Exit Fullscreen (Esc)"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid #0f172a",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(15,23,42,0.15)",
                  }}
                >
                  <Minimize2 style={{ height: 14, width: 14 }} />
                  <span>Exit Fullscreen</span>
                </button>
                <button
                  onClick={() => setFullscreenOpen(false)}
                  title="Close"
                  style={{
                    padding: 7,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#64748b",
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <X style={{ height: 16, width: 16 }} />
                </button>
              </div>
            </div>

            {/* Sender Subheader bar */}
            <div
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    height: 38,
                    width: 38,
                    borderRadius: "50%",
                    background: getAvatarGradient(currentEmail.fromName),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {getInitials(currentEmail.fromName)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                    {currentEmail.fromName}
                    <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 8, fontSize: 12, fontFamily: "monospace" }}>
                      &lt;{currentEmail.fromAddress}&gt;
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                    To: {currentEmail.to || "info@hoteldevang.com"}
                  </div>
                </div>
              </div>

              {currentEmail.attachments && currentEmail.attachments.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                  <Paperclip style={{ height: 13, width: 13, color: "#94a3b8" }} />
                  <span>{currentEmail.attachments.length} attachment{currentEmail.attachments.length > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Attachments chips if any */}
            {currentEmail.attachments && currentEmail.attachments.length > 0 && (
              <div
                style={{
                  padding: "10px 24px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  flexWrap: "wrap" as const,
                  gap: 10,
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {currentEmail.attachments.map((a, i) => {
                  const downloadUrl = `/api/mail/${currentEmail.uid}/attachment?folder=${encodeURIComponent(folder)}&index=${i}&download=1`;
                  const viewUrl = `/api/mail/${currentEmail.uid}/attachment?folder=${encodeURIComponent(folder)}&index=${i}`;
                  const fileName = a.filename || `Attachment ${i + 1}`;
                  const sizeStr = a.size ? `${Math.round(a.size / 1024)} KB` : "";

                  return (
                    <div
                      key={i}
                      className="email-attachment-chip"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        fontSize: 12.5,
                        color: "#1e293b",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={`Click to view / open ${fileName}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          textDecoration: "none",
                          color: "#1e293b",
                          cursor: "pointer",
                        }}
                      >
                        <FileText style={{ height: 14, width: 14, color: "#2563eb", flexShrink: 0 }} />
                        <span
                          style={{
                            fontWeight: 600,
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {fileName}
                        </span>
                        {sizeStr && (
                          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                            ({sizeStr})
                          </span>
                        )}
                        <ExternalLink style={{ height: 12, width: 12, color: "#94a3b8", marginLeft: 2 }} />
                      </a>

                      <div style={{ width: 1, height: 14, background: "#e2e8f0" }} />

                      <a
                        href={downloadUrl}
                        download={fileName}
                        title={`Download ${fileName}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "#64748b",
                          padding: "2px 4px",
                          borderRadius: 4,
                          cursor: "pointer",
                          textDecoration: "none",
                        }}
                      >
                        <Download style={{ height: 13, width: 13 }} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scrollable Email Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto" as const,
                padding: "28px 36px",
                background: "#ffffff",
              }}
            >
              <div style={{ maxWidth: 960, margin: "0 auto", width: "100%" }}>
                {currentEmail.html ? (
                  <IframeEmail html={currentEmail.html} />
                ) : (
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
                      fontSize: 14.5,
                      color: "#1e293b",
                      lineHeight: 1.8,
                      margin: 0,
                    }}
                  >
                    {currentEmail.text}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .reply-resize-bar:hover {
          background: #eff6ff !important;
        }
        .reply-resize-bar:hover .reply-resize-pill {
          background: #2563eb !important;
          width: 56px !important;
        }
      `}</style>
    </div>
  );
}
