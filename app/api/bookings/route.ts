import { NextResponse } from "next/server";
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

// GET: Fetch all bookings for admin dashboard with search/filters
export async function GET(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // Build query filter
    const filter: any = {};

    if (search) {
      filter.OR = [
        { guestName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { bookingId: { contains: search, mode: "insensitive" } }
      ];
    }

    if (status && status !== "All") {
      filter.bookingStatus = status;
    }

    const bookings = await prisma.booking.findMany({
      where: filter,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
