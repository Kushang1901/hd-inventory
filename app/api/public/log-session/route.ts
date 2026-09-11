import { NextResponse } from "next/server";
import { prisma, connectToDatabase } from "@/lib/db";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const { sessionId, page, eventType, timestamp } = body;

    if (!sessionId) {
      return corsResponse(
        NextResponse.json(
          { success: false, error: "sessionId is required" },
          { status: 400 }
        )
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : undefined;

    await prisma.visitorSession.create({
      data: {
        sessionId: String(sessionId),
        page: String(page || "unknown"),
        eventType: String(eventType || "page_visit"),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        userAgent,
        ip,
      },
    });

    return corsResponse(
      NextResponse.json({ success: true, message: "Session logged" })
    );
  } catch (error: any) {
    console.error("Error logging visitor session:", error);
    return corsResponse(
      NextResponse.json(
        { success: false, error: error.message || "Failed to log session" },
        { status: 500 }
      )
    );
  }
}
