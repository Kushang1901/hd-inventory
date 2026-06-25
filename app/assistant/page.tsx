"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Clock3,
  Send,
  Sparkles,
  ShieldCheck,
  Ticket,
  Wallet,
  Users,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantResponse = {
  success: boolean;
  sessionId?: string;
  reply?: string;
  error?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_HOTEL_ASSISTANT_API_URL || "http://localhost:3000").replace(/\/$/, "");

const QUICK_PROMPTS = [
  "What room restrictions are active right now?",
  "Is there any Deluxe room restricted on 9th September?",
  "What is the occupancy status of the hotel today?",
  "Show me room restrictions for June 2026",
  "Show booking status for HD12345",
];

export default function AssistantPage() {
  const initialMessages: ChatMessage[] = [
    {
      role: "assistant",
      content: "Welcome, Owner. I am FRIDAY, your AI inventory assistant. Ask me about room restrictions, live occupancy, prices, room details, or booking status.",
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const sessionIdRef = useRef(crypto.randomUUID());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const conversationPreview = useMemo(() => messages.slice(-8), [messages]);

  const sendMessage = async (messageText: string) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || isSending) {
      return;
    }

    setError("");
    setIsSending(true);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmedMessage }];
    setMessages(nextMessages);
    setInput("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userMessage: trimmedMessage,
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as AssistantResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to reach the assistant backend");
      }

      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply || "" }]);
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : "Assistant request failed";
      setError(message);
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "I could not reach the live hotel assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#FAFBFF] via-[#F1F5F9] to-[#E2E8F0] text-slate-800">
      {/* Background radial orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute left-[-10%] top-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-10%] w-[45%] h-[45%] rounded-full bg-red-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header 
          className="mb-4 flex items-center justify-between rounded-3xl px-6 py-4 shadow-lg text-white"
          style={{ 
            background: "linear-gradient(135deg, #0D1B4A 0%, #132254 100%)",
            borderBottom: "3px solid #DC2626"
          }}
        >
          <div className="flex items-center gap-4">
            {/* Logo container */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md">
              <img 
                src="/logo.png" 
                alt="Hotel Devang Logo" 
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: "#93C5FD" }}>Hotel Devang AI Assistant</p>
              <h1 className="text-lg font-bold tracking-wider" style={{ fontFamily: "Georgia, serif" }}>FRIDAY</h1>
            </div>
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 md:flex font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Tool calling enabled
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_380px]">
          <main className="flex min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-blue-100/60 bg-white/80 shadow-xl backdrop-blur-xl">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  Live database responses
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                  <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                  Check availability, price, policies, and booking status
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              {conversationPreview.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%] ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-[#1E3A8A] to-[#132254] text-white rounded-tr-none"
                        : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    <div 
                      className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: message.role === "user" ? "#93C5FD" : "#DC2626" }}
                    >
                      {message.role === "user" ? "You" : "FRIDAY AI"}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    Thinking with live hotel data...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50/50 p-3 focus-within:border-blue-400/40 focus-within:ring-2 focus-within:ring-blue-500/5 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Ask the assistant</span>
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder="Example: Is Suite Room available on 15 June?"
                    rows={3}
                    className="min-h-[84px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/10"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#DC2626] hover:from-[#132254] hover:to-[#B91C1C] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>

              {error && <p className="mt-3 text-xs text-red-500 font-semibold">{error}</p>}
            </form>
          </main>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-blue-100/60 bg-white/80 p-5 shadow-lg backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] pb-3 border-b border-slate-100 flex items-center gap-2" style={{ color: "#0D1B4A" }}>
                <Sparkles className="h-4 w-4 text-red-600" />
                Quick Prompts
              </p>
              <div className="mt-4 grid gap-3">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-xl border border-slate-100 bg-white/50 px-4 py-3 text-left text-sm text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-800 shadow-sm hover:shadow-md"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-blue-100/60 bg-white/80 p-5 shadow-lg backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] pb-3 border-b border-slate-100 flex items-center gap-2" style={{ color: "#0D1B4A" }}>
                <Bot className="h-4 w-4 text-blue-600" />
                Capabilities
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 shadow-sm">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">Fetch active room restrictions & blocked dates.</span>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 shadow-sm">
                  <Wallet className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">Retrieve configured room prices and seasonal rates.</span>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 shadow-sm">
                  <Users className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">Analyze daily occupancy stats & booking counts.</span>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 shadow-sm">
                  <Ticket className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-slate-600 leading-relaxed">Look up guest bookings and payment status.</span>
                </div>
              </div>
            </section>

            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-[20px] border border-blue-200 bg-blue-50/50 px-5 py-4 text-sm font-semibold text-blue-800 transition-all duration-200 hover:bg-blue-100/70 shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-600/80">Internal</span>
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}