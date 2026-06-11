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
    <div className="relative min-h-screen overflow-hidden bg-[#050608] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(202,160,53,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,_rgba(9,11,16,0.98),_rgba(5,6,8,1))]" />
      <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_30px_rgba(202,160,53,0.12)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/80">Hotel Devang AI Assistant</p>
              <h1 className="text-lg font-semibold text-white">FRIDAY</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300 md:flex">
            <ShieldCheck className="h-4 w-4" />
            Tool calling enabled
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_380px]">
          <main className="flex min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/60 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Live database responses
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
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
                    className={`max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg sm:max-w-[78%] ${
                      message.role === "user"
                        ? "border border-amber-400/20 bg-amber-400/15 text-amber-50"
                        : "border border-white/10 bg-white/6 text-zinc-100"
                    }`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                      {message.role === "user" ? "You" : "FRIDAY"}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-zinc-300 shadow-lg">
                    Thinking with live hotel data...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 p-4 sm:p-5">
              <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/5 p-3 shadow-inner shadow-black/20 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-zinc-500">Ask the assistant</span>
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
                    className="min-h-[84px] w-full resize-none rounded-2xl border border-white/10 bg-[#07090d] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-semibold text-[#111111] shadow-lg shadow-amber-500/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>

              {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
            </form>
          </main>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.32em] text-amber-300/80">Quick prompts</p>
              <div className="mt-4 grid gap-3">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:border-amber-400/30 hover:bg-amber-400/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.32em] text-amber-300/80">What I can do</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>Fetch active room restrictions & blocked dates.</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Wallet className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>Retrieve configured room prices and seasonal rates.</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Users className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>Analyze daily occupancy stats & booking counts.</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Ticket className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>Look up guest bookings and payment status.</span>
                </div>
              </div>
            </section>

            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-[24px] border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100 transition-colors hover:bg-amber-400/15"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </span>
              <span className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Internal</span>
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}