import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase, prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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
    const settlementId = searchParams.get("settlementId");

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ 
        success: false, 
        error: "Razorpay API credentials are not configured. Please check your .env file." 
      }, { status: 500 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Scenario 1: Fetch payments for a specific settlement (View Breakdown modal)
    if (settlementId) {
      // 1. Fetch settlement details to get created_at timestamp and status
      const settlementRes = await fetch(
        `https://api.razorpay.com/v1/settlements/${settlementId}`,
        { headers: { Authorization: authHeader } }
      );

      if (!settlementRes.ok) {
        const errorText = await settlementRes.text();
        throw new Error(`Razorpay Settlement API Error: ${errorText}`);
      }

      const settlement = await settlementRes.json();
      const settlementCreatedAt: number = settlement.created_at;
      const isProcessed: boolean = settlement.status === "processed";

      // 2. PRIMARY METHOD: Use Razorpay's Settlement Recon API to get the exact
      //    list of payment IDs for this settlement. This is always accurate, unlike
      //    settlement_id on individual payment objects which can lag by 24-72 hrs.
      let reconPaymentIds: Set<string> = new Set();
      let reconSucceeded = false;

      try {
        const d = new Date(settlementCreatedAt * 1000);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const day = d.getUTCDate();

        const reconRes = await fetch(
          `https://api.razorpay.com/v1/settlements/recon/combined?year=${year}&month=${month}&day=${day}&count=100`,
          { headers: { Authorization: authHeader } }
        );

        if (reconRes.ok) {
          const reconData = await reconRes.json();
          const reconItems: any[] = reconData.items || [];
          // Filter recon items that belong to THIS specific settlement
          for (const item of reconItems) {
            if (item.settlement_id === settlementId && item.entity_id) {
              reconPaymentIds.add(item.entity_id);
            }
          }
          reconSucceeded = reconPaymentIds.size > 0;
        }
      } catch {
        // Recon failed — will fall back to time-window method below
      }

      // 3. Fetch payments: use a time window that covers the settlement period
      const fromTime = settlementCreatedAt - 30 * 24 * 60 * 60; // 30 days before
      const toTime   = settlementCreatedAt + 2 * 24 * 60 * 60;  // 2 days after

      const paymentsRes = await fetch(
        `https://api.razorpay.com/v1/payments?from=${fromTime}&to=${toTime}&count=100`,
        { headers: { Authorization: authHeader } }
      );

      if (!paymentsRes.ok) {
        const errorText = await paymentsRes.text();
        throw new Error(`Razorpay Payments API Error: ${errorText}`);
      }

      const paymentsData = await paymentsRes.json();
      const payments: any[] = paymentsData.items || [];

      // 4. Match payments to this settlement using the best available method:
      //    - If recon succeeded → match by recon payment ID set (most accurate)
      //    - Fallback → match by settlement_id field OR by time-window for pending settlements
      const matchedPayments = payments.filter((pay: any) => {
        if (reconSucceeded) {
          // Trust the recon result — includes payments Razorpay hasn't linked yet
          return reconPaymentIds.has(pay.id);
        }
        // Fallback: direct settlement_id match on the payment object
        if (pay.settlement_id === settlementId) return true;
        // Fallback: for not-yet-processed settlements, include captured payments with no settlement_id
        if (!isProcessed && (!pay.settlement_id || pay.settlement_id === null)) {
          return pay.status === "captured" && pay.created_at <= settlementCreatedAt;
        }
        return false;
      });

      // 5. Connect to DB and map to local bookings
      await connectToDatabase();
      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { razorpayPaymentId: { not: null } },
            { razorpayOrderId: { not: null } }
          ]
        },
        select: {
          bookingId: true,
          guestName: true,
          phone: true,
          checkIn: true,
          checkOut: true,
          totalAmount: true,
          paidAmount: true,
          bookingStatus: true,
          razorpayPaymentId: true,
          razorpayOrderId: true
        }
      });

      const mappedPayments = matchedPayments.map((pay: any) => {
        const booking = bookings.find(
          (b) => b.razorpayPaymentId === pay.id || b.razorpayOrderId === pay.order_id
        );
        return {
          id: pay.id,
          amount: pay.amount / 100,
          status: pay.status,
          method: pay.method,
          email: pay.email,
          contact: pay.contact,
          created_at: pay.created_at,
          settlement_id: pay.settlement_id || (reconSucceeded ? settlementId : null),
          booking: booking ? {
            bookingId: booking.bookingId,
            guestName: booking.guestName,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: booking.bookingStatus,
            totalAmount: booking.totalAmount,
            paidAmount: booking.paidAmount
          } : null
        };
      });

      return NextResponse.json({ success: true, data: mappedPayments });
    }

    // Scenario 2: Main dashboard load (Overview stats, settlements list, and recent payments list)
    // 1. Fetch settlements
    const settlementsRes = await fetch(
      "https://api.razorpay.com/v1/settlements?count=50",
      { headers: { Authorization: authHeader } }
    );
    if (!settlementsRes.ok) {
      const errorText = await settlementsRes.text();
      throw new Error(`Razorpay Settlements API Error: ${errorText}`);
    }
    const settlementsData = await settlementsRes.json();
    const settlements = settlementsData.items || [];

    // 2. Fetch payments
    const paymentsRes = await fetch(
      "https://api.razorpay.com/v1/payments?count=100",
      { headers: { Authorization: authHeader } }
    );
    if (!paymentsRes.ok) {
      const errorText = await paymentsRes.text();
      throw new Error(`Razorpay Payments API Error: ${errorText}`);
    }
    const paymentsData = await paymentsRes.json();
    const payments = paymentsData.items || [];

    // 3. Build a paymentId -> settlementId map using Razorpay's Settlement Recon API.
    //    Razorpay can delay updating settlement_id on individual payments by 24-72 hrs
    //    even after the money has been transferred. The recon API is always up-to-date.
    const paymentToSettlementMap: Record<string, string> = {};

    const processedSettlementsForRecon = settlements.filter((s: any) => s.status === "processed");

    // Collect unique dates (UTC) for processed settlements to avoid duplicate recon calls
    const uniqueReconDates = new Set<string>();
    for (const settle of processedSettlementsForRecon) {
      const d = new Date(settle.created_at * 1000);
      // Key: YYYY-MM-DD in UTC
      uniqueReconDates.add(
        `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`
      );
    }

    // Fetch recon data for each unique date and build the map
    await Promise.allSettled(
      Array.from(uniqueReconDates).map(async (dateKey) => {
        const [year, month, day] = dateKey.split("-");
        try {
          const reconRes = await fetch(
            `https://api.razorpay.com/v1/settlements/recon/combined?year=${year}&month=${month}&day=${day}&count=100`,
            { headers: { Authorization: authHeader } }
          );
          if (!reconRes.ok) return; // skip silently if recon fails for this date
          const reconData = await reconRes.json();
          const reconItems: any[] = reconData.items || [];
          for (const item of reconItems) {
            // entity_id is the payment ID; settlement_id is the batch it belongs to
            if (item.entity_id && item.settlement_id) {
              paymentToSettlementMap[item.entity_id] = item.settlement_id;
            }
          }
        } catch {
          // silently skip recon errors — we'll fall back to raw payment data
        }
      })
    );

    // 4. Connect DB and fetch bookings
    await connectToDatabase();
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { razorpayPaymentId: { not: null } },
          { razorpayOrderId: { not: null } }
        ]
      },
      select: {
        bookingId: true,
        guestName: true,
        phone: true,
        checkIn: true,
        checkOut: true,
        totalAmount: true,
        paidAmount: true,
        bookingStatus: true,
        razorpayPaymentId: true,
        razorpayOrderId: true
      }
    });

    // 5. Map payments to DB bookings.
    //    Use the recon-derived settlement_id as a fallback when Razorpay API
    //    hasn't yet populated settlement_id directly on the payment object.
    const mappedPayments = payments.map((pay: any) => {
      const booking = bookings.find(
        (b) => b.razorpayPaymentId === pay.id || b.razorpayOrderId === pay.order_id
      );
      // Prefer live settlement_id from payment; fall back to recon map
      const effectiveSettlementId: string | null =
        pay.settlement_id || paymentToSettlementMap[pay.id] || null;

      return {
        id: pay.id,
        amount: pay.amount / 100, // paise to INR
        fee: pay.fee ? pay.fee / 100 : 0,
        tax: pay.tax ? pay.tax / 100 : 0,
        status: pay.status,
        method: pay.method,
        email: pay.email,
        contact: pay.contact,
        created_at: pay.created_at,
        settlement_id: effectiveSettlementId,
        booking: booking ? {
          bookingId: booking.bookingId,
          guestName: booking.guestName,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.bookingStatus,
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount
        } : null
      };
    });

    // 6. Calculate statistics (using effective settlement_id — recon-enriched)
    const capturedPayments = mappedPayments.filter((p: any) => p.status === "captured");
    const totalOnlineRevenue = capturedPayments.reduce((acc: number, p: any) => acc + p.amount, 0);

    const settledPayments = capturedPayments.filter((p: any) => p.settlement_id !== null);
    const totalSettledAmount = settledPayments.reduce((acc: number, p: any) => acc + p.amount, 0);

    // Summing actual bank payouts from the settlements list
    const processedSettlements = settlements.filter((s: any) => s.status === "processed");
    const totalPayoutsFromSettlements = processedSettlements.reduce((acc: number, s: any) => acc + (s.amount / 100), 0);
    const totalFeesFromSettlements = processedSettlements.reduce((acc: number, s: any) => acc + ((s.fees || 0) / 100), 0);
    const totalTaxFromSettlements = processedSettlements.reduce((acc: number, s: any) => acc + ((s.tax || 0) / 100), 0);

    // Net received is the sum of payouts that went into the bank
    const netReceivedInBank = totalPayoutsFromSettlements;

    // Truly pending = captured payments with no settlement link even after recon cross-check
    const pendingPayments = capturedPayments.filter((p: any) => p.settlement_id === null);
    const pendingSettlementAmount = pendingPayments.reduce((acc: number, p: any) => acc + p.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        settlements: settlements.map((s: any) => ({
          id: s.id,
          amount: s.amount / 100,
          status: s.status,
          fees: (s.fees || 0) / 100,
          tax: (s.tax || 0) / 100,
          utr: s.utr,
          created_at: s.created_at
        })),
        payments: mappedPayments,
        summary: {
          pendingSettlement: pendingSettlementAmount,
          totalSettled: totalSettledAmount,
          netReceivedInBank: netReceivedInBank,
          totalOnlineRevenue: totalOnlineRevenue,
          totalFees: totalFeesFromSettlements,
          totalTax: totalTaxFromSettlements,
          pendingCount: pendingPayments.length
        }
      }
    });

  } catch (err: any) {
    console.error("Settlements API route error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
