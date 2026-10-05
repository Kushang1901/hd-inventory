import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { sendEmail } from "@/lib/mailClient";

async function checkAuth() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("admin_session");
  if (!tokenCookie || !tokenCookie.value) return false;
  const payload = verifyToken(tokenCookie.value);
  return payload && payload.role === "admin";
}

export async function POST(req: NextRequest) {
  try {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, text, replyTo } = body;

    if (!to || !to.trim()) {
      return NextResponse.json(
        { error: "Recipient email (To) is required" },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: "Email subject is required" },
        { status: 400 }
      );
    }

    if (!html && !text) {
      return NextResponse.json(
        { error: "Email content is required" },
        { status: 400 }
      );
    }

    const info = await sendEmail({
      to: to.trim(),
      subject: subject.trim(),
      html: html || `<p>${text}</p>`,
      text,
      replyTo,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
