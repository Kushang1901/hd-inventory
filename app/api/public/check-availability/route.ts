import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Booking, BlockedDate } from "@/lib/models/schema";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}


export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const checkInStr = searchParams.get("checkIn");
    const checkOutStr = searchParams.get("checkOut");

    if (!checkInStr || !checkOutStr) {
      return corsResponse(NextResponse.json({ success: false, error: "Missing checkIn or checkOut dates" }, { status: 400 }));
    }

    const checkIn = new Date(checkInStr.split("T")[0] + "T00:00:00.000Z");
    const checkOut = new Date(checkOutStr.split("T")[0] + "T00:00:00.000Z");

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return corsResponse(NextResponse.json({ success: false, error: "Invalid date format" }, { status: 400 }));
    }

    if (checkIn >= checkOut) {
      return corsResponse(NextResponse.json({ success: false, error: "Check-out date must be after check-in" }, { status: 400 }));
    }

    // Enforce 3-month rolling booking window limit
    const maxFutureDate = new Date();
    maxFutureDate.setUTCMonth(maxFutureDate.getUTCMonth() + 3);
    maxFutureDate.setUTCHours(23, 59, 59, 999);
    if (checkIn > maxFutureDate) {
      return corsResponse(NextResponse.json({ success: false, error: "Bookings are only allowed within the next 3 months." }, { status: 400 }));
    }

    // 1. Fetch blocked dates overlapping with the selected range
    // Block overlap condition: block.startDate <= checkOut && block.endDate >= checkIn
    const overlappingBlocks = await BlockedDate.find({
      startDate: { $lte: checkOut },
      endDate: { $gte: checkIn }
    });

    const isHotelFullyBlocked = overlappingBlocks.some(block => block.roomType === "All");
    const blockedRoomTypes = new Set(
      overlappingBlocks
        .filter(block => block.roomType !== "All")
        .map(block => block.roomType)
    );

    // 2. Define standard total physical capacities
    const totalCapacities: { [key: string]: number } = {
      "Standard": 2,
      "Deluxe": 31,
      "Super Deluxe": 8,
      "Suite": 2
    };

    // 3. Fetch overlapping active bookings (not Cancelled)
    const activeOverlappingBookings = await Booking.find({
      bookingStatus: { $ne: "Cancelled" },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    });

    const bookedCounts: { [key: string]: number } = {
      "Standard": 0,
      "Deluxe": 0,
      "Super Deluxe": 0,
      "Suite": 0
    };

    activeOverlappingBookings.forEach((b: any) => {
      if (b.rooms && b.rooms.length > 0) {
        // New multiple room structure
        b.rooms.forEach((room: any) => {
          const type = room.roomType;
          if (bookedCounts[type] !== undefined) {
            bookedCounts[type] += room.quantity || 1;
          }
        });
      } else if (b.roomType) {
        // Legacy single room structure
        const type = b.roomType;
        if (bookedCounts[type] !== undefined) {
          bookedCounts[type] += 1;
        }
      }
    });

    // 4. Room Configuration Details (Zero Hardcoded values in frontend)
    const roomTypesMetadata = [
      {
        id: "Standard",
        name: "Standard Room",
        maxPersons: 2,
        subtypes: [
          { name: "AC Room", code: "AC", price: 1500 },
          { name: "Non-AC Room", code: "Non-AC", price: 1200 }
        ]
      },
      {
        id: "Deluxe",
        name: "Deluxe Room",
        maxPersons: 5,
        subtypes: [
          { name: "AC Room", code: "AC", price: 1700 },
          { name: "Non-AC Room", code: "Non-AC", price: 1400 }
        ]
      },
      {
        id: "Super Deluxe",
        name: "Super Deluxe Room",
        maxPersons: 5,
        subtypes: [
          { name: "AC Room", code: "AC", price: 1900 },
          { name: "Non-AC Room", code: "Non-AC", price: 1600 }
        ]
      },
      {
        id: "Suite",
        name: "Suite Room",
        maxPersons: 5,
        subtypes: [
          { name: "AC Room", code: "AC", price: 3000 }
        ]
      }
    ];

    // Calculate dynamic availability
    const roomsAvailability = roomTypesMetadata.map((room) => {
      let available = totalCapacities[room.id] - (bookedCounts[room.id] || 0);

      // Apply date block rules
      if (isHotelFullyBlocked || blockedRoomTypes.has(room.id)) {
        available = 0;
      }

      return {
        ...room,
        totalCapacity: totalCapacities[room.id],
        bookedCount: bookedCounts[room.id] || 0,
        availableCount: Math.max(0, available)
      };
    });

    // Check if the whole hotel is booked out or blocked
    const totalAvailableRooms = roomsAvailability.reduce((sum, r) => sum + r.availableCount, 0);

    return corsResponse(NextResponse.json({
      success: true,
      available: totalAvailableRooms > 0,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      rooms: roomsAvailability,
    }));
  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }));
  }
}
