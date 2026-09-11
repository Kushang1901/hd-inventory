import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegramService";

export async function POST(request: Request) {
  try {
    const update = await request.json().catch(() => ({}));
    if (update && (update.update_id !== undefined || update.message || update.callback_query)) {
      await handleTelegramUpdate(update);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    // Return 200 to Telegram so it doesn't repeatedly retry failing updates
    return NextResponse.json({ ok: true, error: error.message });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // Optional convenience trigger to set webhook directly from browser/curl:
  // /api/telegram-webhook?action=set
  if (action === "set" && botToken) {
    const webhookUrl = "https://devang-inventory.vercel.app/api/telegram-webhook";
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return NextResponse.json({ webhookUrl, result: data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    status: "Telegram webhook endpoint ready",
    hasBotToken: Boolean(botToken),
  });
}
