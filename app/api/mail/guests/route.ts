import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase, prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session");
  if (!token || !token.value) return false;
  const payload = verifyToken(token.value);
  return payload && payload.role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    const filter: any = {};
    if (q) {
      filter.OR = [
        { guestName: { contains: q, mode: "insensitive" } },
        { guest_name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { contact: { contains: q, mode: "insensitive" } },
        { bookingId: { contains: q, mode: "insensitive" } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where: filter,
      take: 15,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingId: true,
        guestName: true,
        guest_name: true,
        phone: true,
        contact: true,
        checkIn: true,
        checkOut: true,
        roomType: true,
      },
    });

    const results = bookings.map((b) => ({
      id: b.id,
      bookingId: b.bookingId || "N/A",
      name: b.guestName || b.guest_name || "Guest",
      phone: b.phone || b.contact || "",
      roomType: b.roomType || "",
      checkIn: b.checkIn,
      checkOut: b.checkOut,
    }));

    return NextResponse.json({ guests: results });
  } catch (error: any) {
    console.error("Error searching guests:", error);
    return NextResponse.json({ guests: [] });
  }
}
