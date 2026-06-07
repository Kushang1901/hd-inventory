import { NextResponse } from "next/server";
import { connectToDatabase, prisma } from "@/lib/db";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

const defaultPrices = [
  { roomType: "Standard", subtype: "AC", price: 1500 },
  { roomType: "Standard", subtype: "Non-AC", price: 1200 },
  { roomType: "Deluxe", subtype: "AC", price: 1700 },
  { roomType: "Deluxe", subtype: "Non-AC", price: 1400 },
  { roomType: "Super Deluxe", subtype: "AC", price: 1900 },
  { roomType: "Super Deluxe", subtype: "Non-AC", price: 1600 },
  { roomType: "Suite", subtype: "AC", price: 3000 }
];

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date"); // Optional check date, defaults to today
    
    // Parse target date to UTC midnight
    let targetDate: Date;
    if (dateStr) {
      targetDate = new Date(dateStr.split("T")[0] + "T00:00:00.000Z");
    } else {
      // Local time of hotel is in India (UTC+5:30)
      const todayLocal = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
      const todayStr = todayLocal.toISOString().split("T")[0];
      targetDate = new Date(todayStr + "T00:00:00.000Z");
    }

    if (isNaN(targetDate.getTime())) {
      return corsResponse(NextResponse.json({ success: false, error: "Invalid date format" }, { status: 400 }));
    }

    // Fetch all standard database prices
    const dbPrices = await prisma.roomPrice.findMany({});
    
    // Fetch any active seasonal overrides for the target date
    const activeOverrides = await prisma.seasonalPrice.findMany({
      where: {
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      }
    });

    // Merge everything dynamically
    const mergedPrices = defaultPrices.map(def => {
      // Check for seasonal override first
      const seasonalMatch = activeOverrides.find(
        p => p.roomType === def.roomType && p.subtype === def.subtype
      );
      if (seasonalMatch) {
        return {
          roomType: def.roomType,
          subtype: def.subtype,
          price: seasonalMatch.price,
          isSeasonal: true,
          reason: seasonalMatch.reason || "Festival rate override"
        };
      }

      // Fall back to standard configured price in database
      const dbMatch = dbPrices.find(
        db => db.roomType === def.roomType && db.subtype === def.subtype
      );
      return {
        roomType: def.roomType,
        subtype: def.subtype,
        price: dbMatch ? dbMatch.price : def.price,
        isSeasonal: false
      };
    });

    return corsResponse(NextResponse.json({
      success: true,
      date: targetDate.toISOString().split("T")[0],
      prices: mergedPrices
    }));

  } catch (err: any) {
    return corsResponse(NextResponse.json({ success: false, error: err.message }, { status: 500 }));
  }
}
