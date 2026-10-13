import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getEmailAttachment } from "@/lib/mailClient";

async function checkAuth() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("admin_session");
  if (!tokenCookie || !tokenCookie.value) return false;
  const payload = verifyToken(tokenCookie.value);
  return payload && payload.role === "admin";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid } = await params;
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "INBOX";
    const indexStr = searchParams.get("index") || "0";
    const download = searchParams.get("download") === "1";
    const index = parseInt(indexStr, 10);

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const att = await getEmailAttachment({
      folder,
      uid: parseInt(uid, 10),
      index: isNaN(index) ? 0 : index,
    });

    if (!att) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const dispositionType = download ? "attachment" : "inline";
    const cleanFilename = (att.filename || "attachment").replace(/["\r\n]/g, "_");

    return new NextResponse(att.content as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Disposition": `${dispositionType}; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
        "Content-Length": String(att.content.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Error fetching attachment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch attachment" },
      { status: 500 }
    );
  }
}
