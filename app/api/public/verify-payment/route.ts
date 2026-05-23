import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/lib/models/schema";

// Price lookup helper (server-side safety verification)
function getRoomRate(roomType: string, subtype: string): number {
  const isAC = subtype.includes("AC") && !subtype.includes("Non-AC");
  switch (roomType) {
    case "Standard":
      return isAC ? 1500 : 1200;
    case "Deluxe":
      return isAC ? 1700 : 1400;
    case "Super Deluxe":
      return isAC ? 1900 : 1600;
    case "Suite":
      return 3000;
    default:
      return 1500;
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      guestName,
      phone,
      dob,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      rooms,
      specialRequests
    } = await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !guestName || !phone || !checkInStr || !checkOutStr || !rooms || rooms.length === 0) {
      return NextResponse.json({ success: false, error: "Missing verification or booking parameters" }, { status: 400 });
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "rkpHwK2w8V4TTQkzWtTlsYRq";
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    const isSignatureValid = generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return NextResponse.json({ success: false, error: "Payment verification failed. Invalid signature." }, { status: 400 });
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(23, 59, 59, 999);

    // Dynamic price sheet calculations on server side (Zero-Tampering Security)
    let calculatedTotal = 0;
    const timeDiff = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    const roomDetailsForSave = rooms.map((room: any) => {
      const rate = getRoomRate(room.roomType, room.selectedSubtype);
      calculatedTotal += rate * room.quantity * nights;
      
      return {
        roomType: room.roomType,
        selectedSubtype: room.selectedSubtype,
        quantity: Number(room.quantity),
        guests: Number(room.guests),
        pricePerNight: rate
      };
    });

    const advancePaid = 1000;
    const balanceDue = calculatedTotal - advancePaid;

    // Generate Booking ID: HD-YYYYMMDD-[3 RANDOM DIGITS]
    const dateStr = checkIn.toISOString().split("T")[0].replace(/-/g, "");
    const randDigits = Math.floor(100 + Math.random() * 900);
    const bookingId = `HD-${dateStr}-${randDigits}`;

    // Compute main fields for backwards compatibility
    const mainRoomType = rooms.map((r: any) => `${r.quantity}x ${r.roomType}`).join(", ");
    const mainSubtype = rooms.map((r: any) => r.selectedSubtype).join(", ");

    const newBooking = new Booking({
      bookingId,
      guestName,
      phone,
      dob: dob || "N/A",
      checkIn,
      checkOut,
      rooms: roomDetailsForSave,
      roomType: mainRoomType,
      selectedSubtype: mainSubtype,
      totalAmount: calculatedTotal,
      paidAmount: advancePaid,
      dueAmount: balanceDue,
      paymentStatus: "Advance Paid",
      bookingStatus: "Confirmed",
      specialRequests: specialRequests || "",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });

    await newBooking.save();

    return NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed!",
      booking: newBooking
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to finalize booking" }, { status: 500 });
  }
}
