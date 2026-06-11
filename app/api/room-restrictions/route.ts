import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase, prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Total physical room counts per type
const ROOM_TOTALS: Record<string, number> = {
  "Standard": 2,
  "Deluxe": 31,
  "Super Deluxe": 8,
  "Suite": 2
};

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session");
  if (!token || !token.value) return false;
  const payload = verifyToken(token.value);
  return payload && payload.role === "admin";
}

// GET: Fetch all room restrictions
export async function GET() {
  try {
    await connectToDatabase();
    const restrictions = await prisma.roomRestriction.findMany({
      orderBy: { startDate: "asc" }
    });
    return NextResponse.json({ success: true, data: restrictions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a new room restriction
export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { startDate, endDate, roomType, blockedCount, reason } = await request.json();

    if (!startDate || !endDate || !roomType || blockedCount === undefined) {
      return NextResponse.json(
        { success: false, error: "startDate, endDate, roomType, and blockedCount are required" },
        { status: 400 }
      );
    }

    const totalRooms = ROOM_TOTALS[roomType];
    if (!totalRooms) {
      return NextResponse.json(
        { success: false, error: `Unknown room type: ${roomType}. Valid types: ${Object.keys(ROOM_TOTALS).join(", ")}` },
        { status: 400 }
      );
    }

    const blocked = parseInt(String(blockedCount), 10);
    if (isNaN(blocked) || blocked < 1 || blocked > totalRooms) {
      return NextResponse.json(
        { success: false, error: `blockedCount must be between 1 and ${totalRooms} for ${roomType} rooms.` },
        { status: 400 }
      );
    }

    const start = new Date(startDate.split("T")[0] + "T00:00:00.000Z");
    const end = new Date(endDate.split("T")[0] + "T23:59:59.999Z");

    if (start > end) {
      return NextResponse.json(
        { success: false, error: "Start date must be before or equal to end date" },
        { status: 400 }
      );
    }

    const restriction = await prisma.roomRestriction.create({
      data: {
        startDate: start,
        endDate: end,
        roomType,
        totalRooms,
        blockedCount: blocked,
        reason: reason || ""
      }
    });

    return NextResponse.json({ success: true, data: restriction });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing room restriction
export async function PUT(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id, startDate, endDate, roomType, blockedCount, reason } = await request.json();

    if (!id || !startDate || !endDate || !roomType || blockedCount === undefined) {
      return NextResponse.json(
        { success: false, error: "id, startDate, endDate, roomType, and blockedCount are required" },
        { status: 400 }
      );
    }

    const totalRooms = ROOM_TOTALS[roomType];
    if (!totalRooms) {
      return NextResponse.json(
        { success: false, error: `Unknown room type: ${roomType}` },
        { status: 400 }
      );
    }

    const blocked = parseInt(String(blockedCount), 10);
    if (isNaN(blocked) || blocked < 1 || blocked > totalRooms) {
      return NextResponse.json(
        { success: false, error: `blockedCount must be between 1 and ${totalRooms} for ${roomType} rooms.` },
        { status: 400 }
      );
    }

    const start = new Date(startDate.split("T")[0] + "T00:00:00.000Z");
    const end = new Date(endDate.split("T")[0] + "T23:59:59.999Z");

    if (start > end) {
      return NextResponse.json(
        { success: false, error: "Start date must be before or equal to end date" },
        { status: 400 }
      );
    }

    const updated = await prisma.roomRestriction.update({
      where: { id },
      data: {
        startDate: start,
        endDate: end,
        roomType,
        totalRooms,
        blockedCount: blocked,
        reason: reason || ""
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a room restriction
export async function DELETE(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Restriction ID is required" }, { status: 400 });
    }

    await prisma.roomRestriction.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Room restriction removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
