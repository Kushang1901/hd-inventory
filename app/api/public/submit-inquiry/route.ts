import { NextResponse } from "next/server";
import { connectToDatabase, prisma } from "@/lib/db";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

async function sendOwnerTelegramInquiryNotification(inquiry: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.warn("Telegram bot token is missing. Skipping owner notification.");
    return;
  }

  let chatIds: string[] = [];
  try {
    const subscribers = await prisma.telegramSubscriber.findMany();
    chatIds = subscribers.map((sub: any) => sub.chatId);
  } catch (err: any) {
    console.error("Failed to fetch telegram subscribers from database:", err.message);
  }

  if (chatIds.length === 0 && process.env.TELEGRAM_CHAT_ID) {
    chatIds.push(process.env.TELEGRAM_CHAT_ID);
  }

  if (chatIds.length === 0) {
    console.warn("No Telegram subscribers found and no fallback TELEGRAM_CHAT_ID configured.");
    return;
  }

  const escapeHTML = (text: string) => {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  const cleanPhone = inquiry.phone ? inquiry.phone.toString().replace(/\D/g, "") : "N/A";
  const guestName = escapeHTML(inquiry.name);
  const facilityName = escapeHTML(inquiry.facilityName || "N/A");
  const eventType = escapeHTML(inquiry.eventType);
  const eventDate = escapeHTML(inquiry.date);
  const guests = escapeHTML(inquiry.guests);
  const email = escapeHTML(inquiry.email || 'N/A');
  const notes = escapeHTML(inquiry.notes || 'None');

  const htmlMessage = `<b>🎉 NEW EVENT SPACE INQUIRY 🎉</b>\n\n` +
    `Dear Owner,\n` +
    `A new booking inquiry has been received for an event space!\n\n` +
    `<b>📝 Lead Contact Info:</b>\n` +
    `• <b>Client Name:</b> ${guestName}\n` +
    `• <b>Phone Number:</b> +${cleanPhone}\n` +
    `• <b>Email:</b> ${email}\n\n` +
    `<b>🏛️ Venue & Event Details:</b>\n` +
    `• <b>Selected Space:</b> <b>${facilityName}</b>\n` +
    `• <b>Event Type:</b> ${eventType}\n` +
    `• <b>Event Date:</b> ${eventDate}\n` +
    `• <b>Est. Attendance:</b> ${guests} guests\n\n` +
    `<b>✍️ Special Requirements:</b>\n${notes}\n\n` +
    `🎉 <b>Hotel Devang, Dwarka</b>`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  for (const cid of chatIds) {
    try {
      console.log(`Sending Telegram inquiry message to: ${cid}...`);
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: cid,
          text: htmlMessage,
          parse_mode: "HTML"
        })
      });
    } catch (error) {
      console.error(`Failed to notify chat ${cid} via Telegram:`, error);
    }
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const { name, phone, date, guests, facilityName } = body;
    
    if (!name || !phone || !date || !guests || !facilityName) {
      return corsResponse(
        NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        )
      );
    }

    await sendOwnerTelegramInquiryNotification(body);

    return corsResponse(
      NextResponse.json({ success: true, message: "Inquiry submitted and owner notified via Telegram" })
    );
  } catch (err: any) {
    console.error("Error in submit-inquiry route:", err);
    return corsResponse(
      NextResponse.json(
        { success: false, error: err.message || "Internal server error" },
        { status: 500 }
      )
    );
  }
}
