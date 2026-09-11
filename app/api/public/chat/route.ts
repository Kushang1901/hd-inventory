import { NextResponse } from "next/server";
import { corsResponse, handleOptions } from "@/lib/cors";
import { generateAssistantReply } from "@/lib/assistantService";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, messages, userMessage } = body;

    const result = await generateAssistantReply({
      sessionId,
      messages,
      userMessage,
      mode: "guest", // Always guest mode on public route
    });

    return corsResponse(
      NextResponse.json({
        success: true,
        ...result,
      })
    );
  } catch (error: any) {
    console.error("Public chat API error:", error);
    return corsResponse(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Public assistant service error",
        },
        { status: 500 }
      )
    );
  }
}
