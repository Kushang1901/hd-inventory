import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/lib/models/schema";
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
      filter.$or = [
        { guestName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { bookingId: { $regex: search, $options: "i" } }
      ];
    }

    if (status && status !== "All") {
      filter.bookingStatus = status;
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: bookings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
