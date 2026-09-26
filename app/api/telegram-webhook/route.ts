import { NextResponse } from "next/server";
import crypto from "crypto";
import { handleTelegramUpdate } from "@/lib/telegramService";

function safeTimingCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (!incomingSecret || !safeTimingCompare(incomingSecret, webhookSecret)) {
        console.warn("Unauthorized Telegram webhook invocation attempt rejected.");
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

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
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Protect administrative webhook setting with secret key
  if (action === "set" && botToken) {
    const providedKey = searchParams.get("secret");
    if (webhookSecret && (!providedKey || !safeTimingCompare(providedKey, webhookSecret))) {
      return NextResponse.json({ error: "Unauthorized setup request" }, { status: 401 });
    }

    const webhookUrl = "https://devang-inventory.vercel.app/api/telegram-webhook";
    try {
      const payload: any = { url: webhookUrl };
      if (webhookSecret) {
        payload.secret_token = webhookSecret;
      }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
