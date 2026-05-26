import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Booking, RoomPrice } from "@/lib/models/schema";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}


// Price lookup helper (server-side safety verification)
async function getRoomRate(roomType: string, subtype: string): Promise<number> {
  const isAC = subtype.includes("AC") && !subtype.includes("Non-AC");
  const subtypeNormalized = isAC ? "AC" : "Non-AC";
  
  try {
    const record = await RoomPrice.findOne({ roomType, subtype: subtypeNormalized });
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

async function sendAutoWhatsAppReceipt(booking: any) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log("WhatsApp credentials not set in .env. Skipping automatic receipt dispatch.");
    return;
  }

  try {
    let cleanPhone = booking.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    const checkInDateStr = new Date(booking.checkIn).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    const checkOutDateStr = new Date(booking.checkOut).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    
    let roomsDetails = "";
    booking.rooms.forEach((room: any) => {
        const mattressCount = room.guests > 2 && room.roomType !== "Standard" ? room.guests - 2 : 0;
        const desc = `${room.quantity}x ${room.roomType} (${room.selectedSubtype})${mattressCount > 0 ? ` + ${mattressCount} Extra Mattress${mattressCount > 1 ? 'es' : ''}` : ''}`;
        roomsDetails += `• ${desc} (Rate: ₹${room.pricePerNight}/night)\n`;
    });

    const textMessage = `*HOTEL DEVANG DWARKA*\n*Provisional Booking Confirmation*\n\nDear *${booking.guestName}*,\n\nYour stay reservation at Hotel Devang has been provisionally confirmed!\n\n*Booking Details:*\n• *Booking ID:* ${booking.bookingId}\n• *Stay Period:* ${checkInDateStr} to ${checkOutDateStr}\n• *Primary Guest:* ${booking.guestName}\n• *Phone Number:* +${cleanPhone}\n\n*Room Setup:*\n${roomsDetails}\n*Tariff Breakdown:*\n• *Sum Stay Tariff:* ₹${booking.totalAmount.toLocaleString("en-IN")}\n• *Advance Paid (Online):* ₹${booking.paidAmount.toLocaleString("en-IN")}\n• *BALANCE DUE AT CHECK-IN:* *₹${booking.dueAmount.toLocaleString("en-IN")}*\n\n*Important Guidelines:*\n• *Checkout Timing:* 10:00 AM standard (max grace up to 10:30 AM).\n• *Check-in Timing:* Starts from 12:30 PM due to room cleaning.\n• *Mandatory Security:* Physical government-approved photo ID is required for all adult members at check-in.\n\nThank you for choosing Hotel Devang! We look forward to welcoming you to sacred Dwarka!\n\n_Ph: +91 98244 02132_\n_Website: hoteldevang.com_`;

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: false,
          body: textMessage
        }
      })
    });

    const data = await response.json();
    console.log("WhatsApp Auto-Receipt sent successfully:", data);
  } catch (error) {
    console.error("Failed to automatically dispatch WhatsApp receipt:", error);
  }
}

async function sendOwnerWhatsAppNotification(booking: any) {
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL || "https://hotel-booking-1-gg1m.onrender.com";
  try {
    console.log(`Sending owner WhatsApp notification request to: ${serviceUrl}/api/whatsapp/notify...`);
    const response = await fetch(`${serviceUrl}/api/whatsapp/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        bookingId: booking.bookingId,
        guestName: booking.guestName,
        phone: booking.phone,
        roomType: booking.roomType,
        selectedSubtype: booking.selectedSubtype,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        dueAmount: booking.dueAmount,
        paymentStatus: booking.paymentStatus,
        specialRequests: booking.specialRequests,
        rooms: booking.rooms
      })
    });
    const data = await response.json();
    console.log("Owner WhatsApp notification response:", data);
  } catch (error) {
    console.error("Failed to notify owner via Express WhatsApp service:", error);
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
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "prfL6Ukue8SXh2D2OrMPODzL";
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

    // Await background auto-WhatsApp receipt dispatcher
    await sendAutoWhatsAppReceipt(newBooking).catch(err => {
      console.error("WhatsApp auto-dispatch background error:", err);
    });
 
    // Await notifying Owner on WhatsApp via our Express service
    await sendOwnerWhatsAppNotification(newBooking).catch(err => {
      console.error("Failed to trigger owner WhatsApp notification background task:", err);
    });

    return corsResponse(NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed!",
      booking: newBooking
    }));

  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message || "Failed to finalize booking" }, { status: 500 }));
  }
}
