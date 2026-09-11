import { NextResponse } from "next/server";
import { corsResponse, handleOptions } from "@/lib/cors";
import { generateAssistantReply } from "@/lib/assistantService";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, messages, userMessage, mode } = body;

    const result = await generateAssistantReply({
      sessionId,
      messages,
      userMessage,
      mode: mode || "admin",
    });

    return corsResponse(
      NextResponse.json({
        success: true,
        ...result,
      })
    );
  } catch (error: any) {
    console.error("Chat API error:", error);
    return corsResponse(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Assistant service error",
        },
        { status: 500 }
      )
    );
  }
}
