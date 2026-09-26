import { NextResponse } from "next/server";
import crypto from "crypto";
import { signToken } from "@/lib/auth";

// Rate limiting state: max 5 failed attempts per 15 minutes per IP
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const now = Date.now();

    // Check rate limit lockout
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.lockedUntil > now) {
      const waitSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Locked out for security. Try again in ${waitSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const { username, password, recaptchaToken } = await request.json();

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA token if configured in environment
    const recaptchaSecret = process.env.LOGIN_RECAPTCHA_SECRET_KEY;
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

    const isMatch = safeCompare(username, expectedUsername) && safeCompare(password, expectedPassword);

    if (isMatch) {
      // Clear failed attempts on successful login
      loginAttempts.delete(ip);

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

    // Record failed attempt
    const current = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
    }
    loginAttempts.set(ip, current);

    // Artificial backoff delay (300ms) to defeat high-speed automated brute-forcing
    await new Promise((res) => setTimeout(res, 300));

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
