import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getRecentContacts } from "@/lib/mailClient";
import { connectToDatabase, prisma } from "@/lib/db";

async function checkAuth() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("admin_session");
  if (!tokenCookie || !tokenCookie.value) return false;
  const payload = verifyToken(tokenCookie.value);
  return payload && payload.role === "admin";
}

export async function GET(req: NextRequest) {
  try {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    // 1. Get IMAP and seed contacts
    const imapContacts = await getRecentContacts();

    // 2. Also search if any guests in db have email (if any future email field added)
    let dbContacts: Array<{ name: string; email: string }> = [];
    try {
      await connectToDatabase();
      // In case any booking has email in legacy fields or special requests
      if (q && q.length >= 2) {
        const bookings = await prisma.booking.findMany({
          where: {
            OR: [
              { guestName: { contains: q, mode: "insensitive" } },
              { guest_name: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 10,
          select: { guestName: true, guest_name: true, phone: true },
        });

        // For guests without email, we don't treat them as email contacts unless they have an email,
        // but if they don't, we can skip or provide them if requested.
      }
    } catch {
      // Ignore db errors for contacts
    }

    // Merge and filter
    const all = [...imapContacts];
    const map = new Map<string, { name: string; email: string }>();

    for (const c of all) {
      if (!c.email || !c.email.includes("@")) continue;
      const key = c.email.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { name: c.name.trim() || key.split("@")[0], email: key });
      }
    }

    const uniqueList = Array.from(map.values());

    if (!q) {
      return NextResponse.json({ contacts: [] });
    }

    const filtered = uniqueList.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });

    return NextResponse.json({ contacts: filtered.slice(0, 15) });
  } catch (err: any) {
    console.error("Error in /api/mail/contacts:", err);
    return NextResponse.json({ contacts: [] });
  }
}
