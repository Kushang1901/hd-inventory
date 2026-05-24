import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { SeasonalPrice } from "@/lib/models/schema";
import { verifyToken } from "@/lib/auth";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session");
  if (!token || !token.value) return false;
  const payload = verifyToken(token.value);
  return payload && payload.role === "admin";
}

// GET: Fetch all active and future seasonal price overrides
export async function GET() {
  try {
    await connectToDatabase();
    
    // Sort by startDate
    const prices = await SeasonalPrice.find({}).sort({ startDate: 1 });
    
    return NextResponse.json({ success: true, data: prices });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add or update a seasonal price override (Admin protected)
export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized access blocked" }, { status: 401 });
    }

    await connectToDatabase();
    const { startDate, endDate, roomType, subtype, price, reason } = await request.json();

    if (!startDate || !endDate || !roomType || !subtype || typeof price !== "number" || price < 0) {
      return NextResponse.json({ success: false, error: "Missing or invalid seasonal price fields" }, { status: 400 });
    }

    const start = new Date(startDate.split("T")[0] + "T00:00:00.000Z");
    const end = new Date(endDate.split("T")[0] + "T00:00:00.000Z");

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ success: false, error: "Invalid date range" }, { status: 400 });
    }

    // Check for overlap collision for the SAME room type and subtype
    const overlapping = await SeasonalPrice.findOne({
      roomType,
      subtype,
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    if (overlapping) {
      const startStr = new Date(overlapping.startDate).toLocaleDateString("en-IN");
      const endStr = new Date(overlapping.endDate).toLocaleDateString("en-IN");
      return NextResponse.json({ 
        success: false, 
        error: `Date overlap detected! A special rate is already scheduled for ${roomType} (${subtype}) from ${startStr} to ${endStr} (${overlapping.reason || "no reason"}).` 
      }, { status: 400 });
    }

    const newOverride = new SeasonalPrice({
      startDate: start,
      endDate: end,
      roomType,
      subtype,
      price,
      reason: reason || ""
    });

    await newOverride.save();

    return NextResponse.json({ success: true, message: "Seasonal price override successfully scheduled!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a seasonal price override (Admin protected)
export async function DELETE(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized access blocked" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing override ID parameter" }, { status: 400 });
    }

    const deleted = await SeasonalPrice.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Price override record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Seasonal price override successfully deleted!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
