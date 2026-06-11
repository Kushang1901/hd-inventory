import { NextResponse } from "next/server";
import { connectToDatabase, prisma } from "@/lib/db";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    await connectToDatabase();

    // Auto-seed/verify blocked dates on live Atlas database to synchronize registry
    const seedBlocks = async () => {
      const blockedRanges = [
        { startDate: "2026-05-23T00:00:00.000Z", endDate: "2026-06-14T23:59:59.999Z", roomType: "All", reason: "......." },
        { startDate: "2026-05-23T00:00:00.000Z", endDate: "2026-05-23T23:59:59.999Z", roomType: "All", reason: "" },
        { startDate: "2026-06-17T00:00:00.000Z", endDate: "2026-06-24T23:59:59.999Z", roomType: "All", reason: "" },
        { startDate: "2026-07-06T00:00:00.000Z", endDate: "2026-07-08T23:59:59.999Z", roomType: "All", reason: "" },
        { startDate: "2026-07-10T00:00:00.000Z", endDate: "2026-07-17T23:59:59.999Z", roomType: "All", reason: "" },
        { startDate: "2026-08-04T00:00:00.000Z", endDate: "2026-08-11T23:59:59.999Z", roomType: "All", reason: "" },
        { startDate: "2026-08-19T00:00:00.000Z", endDate: "2026-08-20T23:59:59.999Z", roomType: "All", reason: "" },
        { startDate: "2026-09-03T00:00:00.000Z", endDate: "2026-09-04T23:59:59.999Z", roomType: "All", reason: "" }
      ];

      for (const range of blockedRanges) {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);
        const exists = await prisma.blockedDate.findFirst({
          where: {
            startDate: start,
            endDate: end,
            roomType: range.roomType
          }
        });
        if (!exists) {
          await prisma.blockedDate.create({
            data: {
              startDate: start,
              endDate: end,
              roomType: range.roomType,
              reason: range.reason
            }
          });
        }
      }
    };

    await seedBlocks().catch(err => console.error("Blocked Dates Auto-seeding error:", err));
    
    // Fetch only check-in, check-out and room parameters for privacy compliance
    const bookings = await prisma.booking.findMany({
      where: {
        bookingStatus: { not: "Cancelled" }
      },
      select: {
        checkIn: true,
        checkOut: true,
        rooms: true,
        roomType: true
      }
    });

    const blocks = await prisma.blockedDate.findMany();
    const restrictions = await prisma.roomRestriction.findMany();

    return corsResponse(NextResponse.json({
      success: true,
      bookings,
      blocks,
      restrictions
    }));
  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }));
  }
}
