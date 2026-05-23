import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { connectToDatabase } from "@/lib/db";
import { BlockedDate } from "@/lib/models/schema";
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

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(23, 59, 59, 999);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkIn >= checkOut) {
      return corsResponse(NextResponse.json({ success: false, error: "Invalid booking dates" }, { status: 400 }));
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

    // Validate rooms capacity and compute totals
    let computedTotalAmount = 0;
    const timeDiff = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

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
      const rate = baseRate + (extraMattress ? 300 : 0);
      computedTotalAmount += rate * quantity * nights;
    }

    // Generate Razorpay Order for the ₹1,000 advance
    const advanceAmount = 1000; // in INR
    
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
