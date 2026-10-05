import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getEmailDetail } from "@/lib/mailClient";

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

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const email = await getEmailDetail({
      folder,
      uid: parseInt(uid, 10),
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (error: any) {
    console.error("Error fetching email detail:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch email detail" },
      { status: 500 }
    );
  }
}
