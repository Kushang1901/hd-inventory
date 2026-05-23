import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { connectToDatabase } from "@/lib/db";
import { Booking, BlockedDate } from "@/lib/models/schema";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SsUweEky8qbyAL",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rkpHwK2w8V4TTQkzWtTlsYRq"
});

// Price lookup helper (Dynamic lookup on server side for safety)
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
      return 3000; // Suite only has AC
    default:
      return 1500;
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const { checkIn: checkInStr, checkOut: checkOutStr, rooms } = await request.json();

    if (!checkInStr || !checkOutStr || !rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return corsResponse(NextResponse.json({ success: false, error: "Missing required booking details" }, { status: 400 }));
    }

    const checkIn = new Date(checkInStr.split("T")[0] + "T00:00:00.000Z");
    const checkOut = new Date(checkOutStr.split("T")[0] + "T00:00:00.000Z");

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkIn >= checkOut) {
      return corsResponse(NextResponse.json({ success: false, error: "Invalid booking dates" }, { status: 400 }));
    }

    // Enforce 3-month rolling booking window limit
    const maxFutureDate = new Date();
    maxFutureDate.setUTCMonth(maxFutureDate.getUTCMonth() + 3);
    maxFutureDate.setUTCHours(23, 59, 59, 999);
    if (checkIn > maxFutureDate) {
      return corsResponse(NextResponse.json({ success: false, error: "Bookings are only allowed within the next 3 months." }, { status: 400 }));
    }

    // Verify room dates are not blocked
    const overlappingBlocks = await BlockedDate.find({
      startDate: { $lte: checkOut },
      endDate: { $gte: checkIn }
    });

    const isHotelFullyBlocked = overlappingBlocks.some(block => block.roomType === "All");
    if (isHotelFullyBlocked) {
      return corsResponse(NextResponse.json({ success: false, error: "The hotel is completely blocked on these dates" }, { status: 400 }));
    }

    const blockedTypes = new Set(overlappingBlocks.map(block => block.roomType));

    // Verify requested room capacity against live active bookings database records
    const activeOverlappingBookings = await Booking.find({
      bookingStatus: { $ne: "Cancelled" },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
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
            error: `Overbooking protection: Only ${remaining} ${type} room(s) are available on these dates, but you requested ${requested}.`
          }, { status: 400 }));
        }
      }
    }

    // Validate rooms capacity and compute totals
    let computedTotalAmount = 0;
    const timeDiff = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.round(timeDiff / (1000 * 60 * 60 * 24));

    for (const room of rooms) {
      const { roomType, selectedSubtype, quantity, guests, extraMattress } = room;
      
      if (!roomType || !selectedSubtype || !quantity || !guests) {
        return corsResponse(NextResponse.json({ success: false, error: "Missing parameters inside room details" }, { status: 400 }));
      }

      if (blockedTypes.has(roomType)) {
        return corsResponse(NextResponse.json({ success: false, error: `${roomType} is blocked on the selected dates` }, { status: 400 }));
      }

      // Check capacity rules
      const maxAllowed = roomType === "Standard" ? 2 : 5;
      if (guests > maxAllowed) {
        return corsResponse(NextResponse.json({
          success: false, 
          error: `${roomType} rooms only allow a maximum of ${maxAllowed} persons. You entered ${guests} persons.`
        }, { status: 400 }));
      }

      const baseRate = getRoomRate(roomType, selectedSubtype);
      const mattressCount = (guests > 2 && roomType !== "Standard") ? (guests - 2) : 0;
      const rate = baseRate + (mattressCount * 350);
      computedTotalAmount += rate * quantity * nights;
    }

    // Generate Razorpay Order for the 50% advance booking payment
    const advanceAmount = Math.round(computedTotalAmount * 0.5); // in INR
    
    const razorpayOptions = {
      amount: advanceAmount * 100, // in paise
      currency: "INR",
      receipt: `devang_rcpt_${Date.now()}`,
      notes: {
        checkIn: checkInStr,
        checkOut: checkOutStr,
        totalAmount: computedTotalAmount
      }
    };

    const order = await razorpay.orders.create(razorpayOptions);

    return corsResponse(NextResponse.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_SsUweEky8qbyAL",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      totalBookingAmount: computedTotalAmount
    }));

  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message || "Razorpay order creation failed" }, { status: 500 }));
  }
}
