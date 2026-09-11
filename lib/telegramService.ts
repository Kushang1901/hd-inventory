import { prisma, connectToDatabase } from "@/lib/db";

export function escapeHTML(text: any): string {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage(botToken: string, payload: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.error("Telegram sendMessage error:", err.message);
  }
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch (err: any) {
    console.error("Telegram answerCallbackQuery error:", err.message);
  }
}

export async function handleTelegramUpdate(update: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN not set in environment.");
    return;
  }

  await connectToDatabase();

  // 1. Handle Callback Queries (Inline Keyboard clicks)
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message?.chat?.id?.toString();
    const data = callbackQuery.data;
    const username = callbackQuery.from?.username || null;
    const firstName = callbackQuery.from?.first_name || null;
    const lastName = callbackQuery.from?.last_name || null;

    if (!chatId) return;

    try {
      await answerCallbackQuery(botToken, callbackQuery.id);

      // Register or update subscriber
      await prisma.telegramSubscriber.upsert({
        where: { chatId },
        update: { username, firstName, lastName },
        create: { chatId, username, firstName, lastName },
      });

      if (data === "view_history") {
        const bookings = await prisma.booking.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        if (bookings.length === 0) {
          await sendTelegramMessage(botToken, {
            chat_id: chatId,
            text: `📭 <b>No bookings found</b> in the database.`,
            parse_mode: "HTML",
          });
          return;
        }

        let historyMsg = `<b>📊 Recent Bookings (Last ${bookings.length}):</b>\n\n`;
        bookings.forEach((b: any, idx: number) => {
          const checkInDate = b.checkIn
            ? new Date(b.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })
            : (b.check_in || "N/A");
          const checkOutDate = b.checkOut
            ? new Date(b.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })
            : (b.check_out || "N/A");
          const guest = escapeHTML(b.guestName || b.guest_name || "N/A");
          const cmdId = (b.bookingId || b.id).toString().replace(/-/g, "_");
          historyMsg += `${idx + 1}. <b>${guest}</b> (${checkInDate} to ${checkOutDate})\n` +
            `   • ID: <code>${b.bookingId || "N/A"}</code>\n` +
            `   • Details: /view_${cmdId}\n\n`;
        });

        await sendTelegramMessage(botToken, {
          chat_id: chatId,
          text: historyMsg,
          parse_mode: "HTML",
        });
      }
    } catch (err: any) {
      console.error("❌ Error handling callback query:", err.message);
    }
    return;
  }

  // 2. Handle standard Text Messages
  if (!update.message || !update.message.text) return;

  const message = update.message;
  const chatId = message.chat?.id?.toString();
  const text = message.text.trim();
  const username = message.from?.username || null;
  const firstName = message.from?.first_name || null;
  const lastName = message.from?.last_name || null;

  if (!chatId) return;

  try {
    if (text.startsWith("/start")) {
      await prisma.telegramSubscriber.upsert({
        where: { chatId },
        update: { username, firstName, lastName },
        create: { chatId, username, firstName, lastName },
      });

      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      const displayName = fullName || "User";

      const welcomeMsg = `🛎️ Welcome respected <b>${escapeHTML(displayName)}</b>...\n\n` +
        `Want to see all hotel bookings?`;

      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: welcomeMsg,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📊 View Booking History",
                callback_data: "view_history",
              },
            ],
            [
              {
                text: "🌐 Open Admin Panel",
                web_app: {
                  url: "https://devang-inventory.vercel.app",
                },
              },
            ],
          ],
        },
      });
    } else if (text === "📊 View Booking History" || text.startsWith("/history")) {
      const bookings = await prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (bookings.length === 0) {
        await sendTelegramMessage(botToken, {
          chat_id: chatId,
          text: `📭 <b>No bookings found</b> in the database.`,
          parse_mode: "HTML",
        });
        return;
      }

      let historyMsg = `<b>📊 Recent Bookings (Last ${bookings.length}):</b>\n\n`;
      bookings.forEach((b: any, idx: number) => {
        const checkInDate = b.checkIn
          ? new Date(b.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })
          : (b.check_in || "N/A");
        const checkOutDate = b.checkOut
          ? new Date(b.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })
          : (b.check_out || "N/A");
        const guest = escapeHTML(b.guestName || b.guest_name || "N/A");
        const cmdId = (b.bookingId || b.id).toString().replace(/-/g, "_");
        historyMsg += `${idx + 1}. <b>${guest}</b> (${checkInDate} to ${checkOutDate})\n` +
          `   • ID: <code>${b.bookingId || "N/A"}</code>\n` +
          `   • Details: /view_${cmdId}\n\n`;
      });

      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: historyMsg,
        parse_mode: "HTML",
      });
    } else if (text.startsWith("/search")) {
      const query = text.substring(7).trim();
      if (!query) {
        await sendTelegramMessage(botToken, {
          chat_id: chatId,
          text: `🔍 Please provide a search query.\nUsage: <code>/search Kushang</code> or <code>/search 9773401789</code>`,
          parse_mode: "HTML",
        });
        return;
      }

      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { guestName: { contains: query, mode: "insensitive" } },
            { guest_name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { contact: { contains: query, mode: "insensitive" } },
            { bookingId: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      });

      if (bookings.length === 0) {
        await sendTelegramMessage(botToken, {
          chat_id: chatId,
          text: `🔍 No bookings matching "<b>${escapeHTML(query)}</b>" were found.`,
          parse_mode: "HTML",
        });
        return;
      }

      let searchResultMsg = `<b>🔍 Search Results for "${escapeHTML(query)}" (${bookings.length}):</b>\n\n`;
      bookings.forEach((b: any, idx: number) => {
        const checkInDate = b.checkIn
          ? new Date(b.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })
          : (b.check_in || "N/A");
        const checkOutDate = b.checkOut
          ? new Date(b.checkOut).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" })
          : (b.check_out || "N/A");
        const guest = escapeHTML(b.guestName || b.guest_name || "N/A");
        const cmdId = (b.bookingId || b.id).toString().replace(/-/g, "_");

        searchResultMsg += `${idx + 1}. <b>${guest}</b> (${checkInDate} to ${checkOutDate})\n` +
          `   • ID: <code>${b.bookingId || "N/A"}</code>\n` +
          `   • Details: /view_${cmdId}\n\n`;
      });

      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: searchResultMsg,
        parse_mode: "HTML",
      });
    } else if (text.startsWith("/check")) {
      let dateStr = text.substring(6).trim();
      if (!dateStr) {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const yyyy = istTime.getUTCFullYear();
        const mm = String(istTime.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(istTime.getUTCDate()).padStart(2, "0");
        dateStr = `${yyyy}-${mm}-${dd}`;
      }

      let targetDate: Date;
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split("-");
        targetDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        targetDate = new Date(`${dateStr}T00:00:00.000Z`);
      } else {
        targetDate = new Date(dateStr);
      }

      if (isNaN(targetDate.getTime())) {
        await sendTelegramMessage(botToken, {
          chat_id: chatId,
          text: `⚠️ <b>Invalid date format.</b> Please use DD-MM-YYYY or YYYY-MM-DD (e.g. <code>/check 15-07-2026</code>).`,
          parse_mode: "HTML",
        });
        return;
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const bookings = await prisma.booking.findMany({
        where: {
          bookingStatus: { not: "Cancelled" },
          checkIn: { lte: endOfDay },
          checkOut: { gte: startOfDay },
        },
      });

      const checkIns: any[] = [];
      const checkOuts: any[] = [];
      const inHouse: any[] = [];

      bookings.forEach((b: any) => {
        const checkInDate = b.checkIn ? new Date(b.checkIn) : null;
        const checkOutDate = b.checkOut ? new Date(b.checkOut) : null;

        if (checkInDate && checkInDate >= startOfDay && checkInDate <= endOfDay) {
          checkIns.push(b);
        } else if (checkOutDate && checkOutDate >= startOfDay && checkOutDate <= endOfDay) {
          checkOuts.push(b);
        } else {
          inHouse.push(b);
        }
      });

      const formattedDate = targetDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      let reportMsg = `<b>📅 Occupancy Report for ${formattedDate}:</b>\n\n`;

      reportMsg += `🛎️ <b>Check-ins (${checkIns.length}):</b>\n`;
      if (checkIns.length === 0) {
        reportMsg += `<i>No arrivals scheduled</i>\n`;
      } else {
        checkIns.forEach((b: any, idx: number) => {
          const guest = escapeHTML(b.guestName || b.guest_name || "N/A");
          const cmdId = (b.bookingId || b.id).toString().replace(/-/g, "_");
          reportMsg += `${idx + 1}. ${guest} (/view_${cmdId})\n`;
        });
      }

      reportMsg += `\n🚪 <b>Check-outs (${checkOuts.length}):</b>\n`;
      if (checkOuts.length === 0) {
        reportMsg += `<i>No departures scheduled</i>\n`;
      } else {
        checkOuts.forEach((b: any, idx: number) => {
          const guest = escapeHTML(b.guestName || b.guest_name || "N/A");
          const cmdId = (b.bookingId || b.id).toString().replace(/-/g, "_");
          reportMsg += `${idx + 1}. ${guest} (/view_${cmdId})\n`;
        });
      }

      reportMsg += `\n🛏️ <b>Staying In-House (${inHouse.length}):</b>\n`;
      if (inHouse.length === 0) {
        reportMsg += `<i>No other active stays</i>\n`;
      } else {
        inHouse.forEach((b: any, idx: number) => {
          const guest = escapeHTML(b.guestName || b.guest_name || "N/A");
          const cmdId = (b.bookingId || b.id).toString().replace(/-/g, "_");
          reportMsg += `${idx + 1}. ${guest} (/view_${cmdId})\n`;
        });
      }

      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: reportMsg,
        parse_mode: "HTML",
      });
    } else if (text.startsWith("/view_")) {
      const cmdId = text.substring(6).trim();
      const searchId = cmdId.replace(/_/g, "-");

      const queryConditions: any[] = [{ bookingId: searchId }];
      if (/^[0-9a-fA-F]{24}$/.test(searchId)) {
        queryConditions.push({ id: searchId });
      }

      const booking = await prisma.booking.findFirst({
        where: {
          OR: queryConditions,
        },
      });

      if (!booking) {
        await sendTelegramMessage(botToken, {
          chat_id: chatId,
          text: `❌ Booking with ID <b>${escapeHTML(searchId)}</b> not found.`,
          parse_mode: "HTML",
        });
        return;
      }

      const checkInDateStr = booking.checkIn
        ? new Date(booking.checkIn).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : (booking.check_in || "N/A");
      const checkOutDateStr = booking.checkOut
        ? new Date(booking.checkOut).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : (booking.check_out || "N/A");

      let guestsCount = 2;
      let extraMattressDetail = "";
      if (booking.rooms && booking.rooms.length > 0) {
        guestsCount = booking.rooms.reduce((acc: number, r: any) => acc + (Number(r.guests) || 2), 0);
        const totalMattresses = booking.rooms.reduce(
          (acc: number, r: any) =>
            acc + (r.guests > 2 && r.roomType !== "Standard" ? r.guests - 2 : 0),
          0
        );
        if (totalMattresses > 0) {
          extraMattressDetail = ` (+ ${totalMattresses} Extra Mattress${totalMattresses > 1 ? "es" : ""})`;
        }
      }

      let roomDetails = booking.roomType || "N/A";
      if (booking.rooms && booking.rooms.length > 0) {
        roomDetails = booking.rooms
          .map((r: any) => `${r.quantity}x ${r.roomType} (${r.selectedSubtype})`)
          .join(", ");
      } else if (booking.selectedSubtype) {
        roomDetails = `${booking.roomType} (${booking.selectedSubtype})`;
      }

      const rawPhone = booking.phone || (booking as any).contact;
      const cleanPhone = rawPhone ? rawPhone.toString().replace(/\D/g, "") : "N/A";
      const guestName = escapeHTML(booking.guestName || (booking as any).guest_name || "N/A");
      const roomDetailsEscaped = escapeHTML(roomDetails);
      const totalAmount = (booking.totalAmount || 0).toLocaleString("en-IN");
      const paidAmount = (booking.paidAmount || 0).toLocaleString("en-IN");
      const dueAmount = (booking.dueAmount || 0).toLocaleString("en-IN");
      const paymentStatus = escapeHTML(booking.paymentStatus || "N/A");
      const bookingStatus = escapeHTML(booking.bookingStatus || "N/A");
      const specialRequests = escapeHTML(booking.specialRequests || (booking as any).message || "None");

      const detailsMsg =
        `<b>🛎️ BOOKING FULL DETAILS 🛎️</b>\n\n` +
        `• <b>Booking ID:</b> <code>${booking.bookingId || "N/A"}</code>\n` +
        `• <b>Guest Name:</b> ${guestName}\n` +
        `• <b>Phone Number:</b> +${cleanPhone}\n` +
        `• <b>Stay Period:</b> ${checkInDateStr} to ${checkOutDateStr}\n` +
        `• <b>Room Details:</b> ${roomDetailsEscaped}\n` +
        `• <b>Total Guests:</b> ${guestsCount} Person${guestsCount > 1 ? "s" : ""}${extraMattressDetail}\n\n` +
        `<b>💰 Tariff & Payment:</b>\n` +
        `• <b>Sum Stay Tariff:</b> ₹${totalAmount}\n` +
        `• <b>Paid Advance:</b> ₹${paidAmount}\n` +
        `• <b>Due Balance:</b> <b>₹${dueAmount}</b>\n` +
        `• <b>Payment Status:</b> ${paymentStatus}\n\n` +
        `• <b>Booking Status:</b> ${bookingStatus}\n` +
        `• <b>Special Requests:</b> ${specialRequests}\n` +
        `• <b>Created At:</b> ${
          booking.createdAt ? new Date(booking.createdAt).toLocaleString("en-IN") : "N/A"
        }`;

      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: detailsMsg,
        parse_mode: "HTML",
      });
    } else if (text === "❓ Help" || text.startsWith("/help")) {
      const helpMsg =
        `📖 <b>Hotel Devang Bot Help Menu</b>\n\n` +
        `• /start - Subscribe to booking notifications.\n` +
        `• /history - View recent bookings.\n` +
        `• /search <code>[query]</code> - Search bookings by Guest Name, Phone, or Booking ID (e.g. <code>/search Kushang</code>).\n` +
        `• /check <code>[date]</code> - Check arrivals/departures/stays for a specific date (DD-MM-YYYY or YYYY-MM-DD, e.g. <code>/check 15-07-2026</code>). Leaving date blank defaults to today.\n` +
        `• /help - Display this help menu.`;

      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: helpMsg,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 Open Admin Panel",
                web_app: {
                  url: "https://devang-inventory.vercel.app",
                },
              },
            ],
          ],
        },
      });
    }
  } catch (err: any) {
    console.error("❌ Error handling Telegram update:", err);
  }
}
