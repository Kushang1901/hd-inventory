import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.ADMIN_USERNAME || "admin";
    const expectedPassword = process.env.ADMIN_PASSWORD || "devang2026";

    if (username === expectedUsername && password === expectedPassword) {
      // Create session payload with 24 hours expiry
      const payload = {
        role: "admin",
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };

      const token = signToken(payload);

      const response = NextResponse.json({ success: true, message: "Logged in successfully" });
      
      // Set secure HTTP-only cookie
      response.cookies.set({
        name: "admin_session",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours in seconds
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
