import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { RoomPrice } from "@/lib/models/schema";
import { verifyToken } from "@/lib/auth";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session");
  if (!token || !token.value) return false;
  const payload = verifyToken(token.value);
  return payload && payload.role === "admin";
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

// GET: Fetch all active room prices from MongoDB, fallback to defaults
export async function GET() {
  try {
    await connectToDatabase();
    
    const dbPrices = await RoomPrice.find({});
    
    // Merge database prices with default fallbacks to ensure completeness
    const mergedPrices = defaultPrices.map(def => {
      const dbMatch = dbPrices.find(
        db => db.roomType === def.roomType && db.subtype === def.subtype
      );
      return {
        roomType: def.roomType,
        subtype: def.subtype,
        price: dbMatch ? dbMatch.price : def.price
      };
    });

    return NextResponse.json({ success: true, data: mergedPrices });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Save or update room prices in MongoDB (Admin protected)
export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized access blocked" }, { status: 401 });
    }

    await connectToDatabase();
    const { prices } = await request.json(); // Array of { roomType, subtype, price }

    if (!prices || !Array.isArray(prices)) {
      return NextResponse.json({ success: false, error: "Invalid price list payload" }, { status: 400 });
    }

    for (const item of prices) {
      const { roomType, subtype, price } = item;
      
      if (!roomType || !subtype || typeof price !== "number" || price < 0) {
        return NextResponse.json({ success: false, error: `Invalid rate format for ${roomType} ${subtype}` }, { status: 400 });
      }

      // Upsert room price record in database
      await RoomPrice.findOneAndUpdate(
        { roomType, subtype },
        { price },
        { new: true, upsert: true }
      );
    }

    return NextResponse.json({ success: true, message: "Room prices successfully updated in database!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
