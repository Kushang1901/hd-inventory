import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password, recaptchaToken } = await request.json();

    // Verify reCAPTCHA token if configured or fallback to provided secret
    const recaptchaSecret = process.env.LOGIN_RECAPTCHA_SECRET_KEY || "6LffN_osAAAAAGIhL6CVegE9T9y0EguY8-VhxFIH";
    if (recaptchaSecret) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { success: false, error: "Please complete the reCAPTCHA verification." },
          { status: 400 }
        );
      }

      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`;
      const verifyRes = await fetch(verifyUrl, { method: "POST" });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json(
          { success: false, error: "reCAPTCHA verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

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
