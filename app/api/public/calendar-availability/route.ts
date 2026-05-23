import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Booking, BlockedDate } from "@/lib/models/schema";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch only check-in, check-out and room parameters for privacy compliance
    const bookings = await Booking.find(
      { bookingStatus: { $ne: "Cancelled" } },
      "checkIn checkOut rooms.roomType rooms.quantity roomType"
    );

    const blocks = await BlockedDate.find({});

    return corsResponse(NextResponse.json({
      success: true,
      bookings,
      blocks
    }));
  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }));
  }
}
