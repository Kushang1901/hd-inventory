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

// GET: Retrieve a single booking details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update booking status or payment status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const updates = await request.json();

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // Supported updates: bookingStatus, paymentStatus, paidAmount, dueAmount
    if (updates.bookingStatus) {
      booking.bookingStatus = updates.bookingStatus;
      
      // Auto adjust payment status if checked out
      if (updates.bookingStatus === "Checked Out") {
        booking.paymentStatus = "Fully Paid";
        booking.paidAmount = booking.totalAmount;
        booking.dueAmount = 0;
      }
    }

    if (updates.paymentStatus) {
      booking.paymentStatus = updates.paymentStatus;
      if (updates.paymentStatus === "Fully Paid") {
        booking.paidAmount = booking.totalAmount;
        booking.dueAmount = 0;
      }
    }

    if (typeof updates.paidAmount === "number") {
      booking.paidAmount = updates.paidAmount;
      booking.dueAmount = Math.max(0, booking.totalAmount - updates.paidAmount);
      if (booking.dueAmount === 0) {
        booking.paymentStatus = "Fully Paid";
      } else if (booking.paidAmount > 0) {
        booking.paymentStatus = "Advance Paid";
      }
    }

    await booking.save();

    return NextResponse.json({ success: true, data: booking });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
