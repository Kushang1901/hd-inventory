import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { listEmails, toggleStarEmail, deleteEmail } from "@/lib/mailClient";

async function checkAuth() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("admin_session");
  if (!tokenCookie || !tokenCookie.value) return false;
  const payload = verifyToken(tokenCookie.value);
  return payload && payload.role === "admin";
}

export async function GET(req: NextRequest) {
  try {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "inbox";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = await listEmails({ folder, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching emails:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { uid, folder, action, value } = body;

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    if (action === "star") {
      await toggleStarEmail({
        folder: folder || "INBOX",
        uid: Number(uid),
        starred: Boolean(value),
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating email flag:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update email" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuthed = await checkAuth();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const folder = searchParams.get("folder") || "INBOX";

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    await deleteEmail({
      folder,
      uid: Number(uid),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete email" },
      { status: 500 }
    );
  }
}
