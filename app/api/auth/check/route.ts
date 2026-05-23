import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("admin_session");
    
    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    const payload = verifyToken(tokenCookie.value);
    
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    return NextResponse.json({ authenticated: true, role: "admin" });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
