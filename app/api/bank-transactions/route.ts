import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getLiveHdfcTransactions } from "@/lib/hdfcBankService";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session");
  if (!token || !token.value) return false;
  const payload = verifyToken(token.value);
  return payload && payload.role === "admin";
}

export async function GET(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "ALL"; // ALL, CREDIT, DEBIT
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // In-memory live extraction from HDFC alerts (Zero database storage)
    const { transactions, summary } = await getLiveHdfcTransactions();

    // In-memory filtering
    let filtered = transactions;

    if (type === "CREDIT") {
      filtered = filtered.filter((t) => t.type === "CREDIT");
    } else if (type === "DEBIT") {
      filtered = filtered.filter((t) => t.type === "DEBIT");
    }

    if (search) {
      filtered = filtered.filter((t) => {
        return (
          t.utr.toLowerCase().includes(search) ||
          t.partyName.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.amount.toString().includes(search) ||
          t.mode.toLowerCase().includes(search) ||
          t.rawSubject.toLowerCase().includes(search)
        );
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: filtered,
        summary,
        totalMatches: filtered.length,
      },
    });
  } catch (err: any) {
    console.error("Error in bank-transactions API:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch live bank transactions",
      },
      { status: 500 }
    );
  }
}

