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

// GET: Retrieve a single booking details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    console.log(`[API] Fetching booking details for ID: ${id}`);

    const booking = await prisma.booking.findUnique({
      where: { id }
    });
    
    if (!booking) {
      console.warn(`[API] Booking not found for ID: ${id}`);
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    console.log(`[API] Successfully retrieved booking: ${booking.bookingId}`);
    return NextResponse.json({ success: true, data: booking });
  } catch (err: any) {
    console.error(`[API] Error retrieving booking ID ${id}:`, err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update booking status or payment status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const updates = await request.json();
    
    console.log(`[API] Received update request for Booking ID: ${id}`, updates);

    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      console.warn(`[API] Booking not found for update: ID: ${id}`);
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    let bookingStatus = booking.bookingStatus || "Confirmed";
    let paymentStatus = booking.paymentStatus || "Unpaid";
    let paidAmount = booking.paidAmount ?? 0;
    let totalAmount = booking.totalAmount ?? 0;
    let dueAmount = booking.dueAmount ?? 0;

    // Supported updates: bookingStatus, paymentStatus, paidAmount, dueAmount
    if (updates.bookingStatus) {
      bookingStatus = updates.bookingStatus;
      
      // Auto adjust payment status if checked out
      if (updates.bookingStatus === "Checked Out") {
        paymentStatus = "Fully Paid";
        paidAmount = totalAmount;
        dueAmount = 0;
      }
    }

    if (updates.paymentStatus) {
      paymentStatus = updates.paymentStatus;
      if (updates.paymentStatus === "Fully Paid") {
        paidAmount = totalAmount;
        dueAmount = 0;
      }
    }

    if (typeof updates.paidAmount === "number") {
      paidAmount = updates.paidAmount;
      dueAmount = Math.max(0, totalAmount - updates.paidAmount);
      if (dueAmount === 0) {
        paymentStatus = "Fully Paid";
      } else if (paidAmount > 0) {
        paymentStatus = "Advance Paid";
      }
    }

    console.log(`[API] Applying DB Updates: status=${bookingStatus}, payment=${paymentStatus}, paid=${paidAmount}, due=${dueAmount}`);

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        bookingStatus,
        paymentStatus,
        paidAmount,
        dueAmount
      }
    });

    console.log(`[API] Successfully updated booking in DB: ${updatedBooking.bookingId}`);
    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (err: any) {
    console.error(`[API] Error updating booking ID ${id}:`, err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update booking" }, { status: 500 });
  }
}

