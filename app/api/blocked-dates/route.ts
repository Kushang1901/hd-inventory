import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { BlockedDate } from "@/lib/models/schema";
import { verifyToken } from "@/lib/auth";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session");
  if (!token || !token.value) return false;
  const payload = verifyToken(token.value);
  return payload && payload.role === "admin";
}

// GET: Fetch all blocked date ranges
export async function GET() {
  try {
    await connectToDatabase();
    const blocks = await BlockedDate.find().sort({ startDate: 1 });
    return NextResponse.json({ success: true, data: blocks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add a new blocked date range
export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { startDate, endDate, roomType, reason } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Start date and end date are required" }, { status: 400 });
    }

    // Normalize to UTC start and end of day to prevent local timezone shifts
    const start = new Date(startDate.split("T")[0] + "T00:00:00.000Z");
    const end = new Date(endDate.split("T")[0] + "T23:59:59.999Z");

    if (start > end) {
      return NextResponse.json({ success: false, error: "Start date must be before or equal to end date" }, { status: 400 });
    }

    const newBlock = new BlockedDate({
      startDate: start,
      endDate: end,
      roomType: roomType || "All",
      reason: reason || "",
    });

    await newBlock.save();

    return NextResponse.json({ success: true, data: newBlock });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing blocked date range
export async function PUT(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id, startDate, endDate, roomType, reason } = await request.json();

    if (!id || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Block ID, start date, and end date are required" }, { status: 400 });
    }

    // Normalize to UTC to prevent day-shift bugs
    const start = new Date(startDate.split("T")[0] + "T00:00:00.000Z");
    const end = new Date(endDate.split("T")[0] + "T23:59:59.999Z");

    if (start > end) {
      return NextResponse.json({ success: false, error: "Start date must be before or equal to end date" }, { status: 400 });
    }

    const updatedBlock = await BlockedDate.findByIdAndUpdate(
      id,
      { startDate: start, endDate: end, roomType: roomType || "All", reason: reason || "" },
      { new: true }
    );

    if (!updatedBlock) {
      return NextResponse.json({ success: false, error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedBlock });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


// DELETE: Remove a blocked date range
export async function DELETE(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Block ID is required" }, { status: 400 });
    }

    await BlockedDate.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Blocked date removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
