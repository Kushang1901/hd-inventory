import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase, prisma } from "@/lib/db";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

// Price lookup helper (server-side safety verification)
async function getRoomRate(roomType: string, subtype: string): Promise<number> {
  const isAC = subtype.includes("AC") && !subtype.includes("Non-AC");
  const subtypeNormalized = isAC ? "AC" : "Non-AC";
  
  try {
    const record = await prisma.roomPrice.findFirst({
      where: { roomType, subtype: subtypeNormalized }
    });
    if (record) {
      return record.price;
    }
  } catch (err) {
    console.error("Error querying RoomPrice database collection:", err);
  }

  // Fallbacks:
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
      return corsResponse(NextResponse.json({ success: false, error: "Missing verification or booking parameters" }, { status: 400 }));
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
      return corsResponse(NextResponse.json({ success: false, error: "Payment verification failed. Invalid signature." }, { status: 400 }));
    }

    const checkIn = new Date(checkInStr.split("T")[0] + "T00:00:00.000Z");
    const checkOut = new Date(checkOutStr.split("T")[0] + "T00:00:00.000Z");

    // Enforce 3-month rolling booking window limit
    const maxFutureDate = new Date();
    maxFutureDate.setUTCMonth(maxFutureDate.getUTCMonth() + 3);
    maxFutureDate.setUTCHours(23, 59, 59, 999);
    if (checkIn > maxFutureDate) {
      return corsResponse(NextResponse.json({ success: false, error: "Bookings are only allowed within the next 3 months." }, { status: 400 }));
    }

    // Secondary Overbooking Validation Checks
    const activeOverlappingBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: { not: "Cancelled" },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn }
      }
    });

    const totalCapacities: { [key: string]: number } = {
      "Standard": 2,
      "Deluxe": 31,
      "Super Deluxe": 8,
      "Suite": 2
    };

    const bookedCounts: { [key: string]: number } = {
      "Standard": 0,
      "Deluxe": 0,
      "Super Deluxe": 0,
      "Suite": 0
    };

    activeOverlappingBookings.forEach((b: any) => {
      if (b.rooms && b.rooms.length > 0) {
        b.rooms.forEach((room: any) => {
          const type = room.roomType;
          if (bookedCounts[type] !== undefined) {
            bookedCounts[type] += Number(room.quantity) || 1;
          }
        });
      } else if (b.roomType) {
        const type = b.roomType;
        if (bookedCounts[type] !== undefined) {
          bookedCounts[type] += 1;
        }
      }
    });

    const requestedCounts: { [key: string]: number } = {
      "Standard": 0,
      "Deluxe": 0,
      "Super Deluxe": 0,
      "Suite": 0
    };

    for (const room of rooms) {
      const type = room.roomType;
      if (requestedCounts[type] !== undefined) {
        requestedCounts[type] += Number(room.quantity) || 0;
      }
    }

    for (const type of Object.keys(totalCapacities)) {
      const requested = requestedCounts[type];
      if (requested > 0) {
        const cap = totalCapacities[type];
        const booked = bookedCounts[type] || 0;
        const remaining = Math.max(0, cap - booked);
        
        if (requested > remaining) {
          return corsResponse(NextResponse.json({
            success: false,
            error: `Overbooking validation block: Only ${remaining} ${type} room(s) are available on these dates, but you requested ${requested}.`
          }, { status: 400 }));
        }
      }
    }

    // Dynamic price sheet calculations on server side (Zero-Tampering Security)
    let calculatedTotal = 0;
    const timeDiff = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.round(timeDiff / (1000 * 60 * 60 * 24));

    const roomDetailsForSave = await Promise.all(rooms.map(async (room: any) => {
      const baseRate = await getRoomRate(room.roomType, room.selectedSubtype);
      const mattressCount = (room.guests > 2 && room.roomType !== "Standard") ? (room.guests - 2) : 0;
      const rate = baseRate + (mattressCount * 350);
      calculatedTotal += rate * room.quantity * nights;
      
      return {
        roomType: room.roomType,
        selectedSubtype: room.selectedSubtype,
        quantity: Number(room.quantity),
        guests: Number(room.guests),
        extraMattress: room.guests > 2,
        pricePerNight: rate
      };
    }));

    const advancePaid = Math.round(calculatedTotal * 0.5);
    const balanceDue = calculatedTotal - advancePaid;

    // Generate Booking ID: HD-YYYYMMDD-[3 RANDOM DIGITS]
    const dateStr = checkIn.toISOString().split("T")[0].replace(/-/g, "");
    const randDigits = Math.floor(100 + Math.random() * 900);
    const bookingId = `HD-${dateStr}-${randDigits}`;

    // Compute main fields for backwards compatibility
    const mainRoomType = rooms.map((r: any) => `${r.quantity}x ${r.roomType}`).join(", ");
    const mainSubtype = rooms.map((r: any) => r.selectedSubtype).join(", ");

    const createdBooking = await prisma.booking.create({
      data: {
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
      }
    });


    return corsResponse(NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed!",
      booking: createdBooking
    }));

  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message || "Failed to finalize booking" }, { status: 500 }));
  }
}
