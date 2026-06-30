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

    // Scenario 1: Fetch payments for a specific settlement ID
    if (settlementId) {
      const paymentsRes = await fetch(
        `https://api.razorpay.com/v1/payments?settlement_id=${settlementId}&count=100`,
        { headers: { Authorization: authHeader } }
      );

      if (!paymentsRes.ok) {
        const errorText = await paymentsRes.text();
        throw new Error(`Razorpay API Error: ${errorText}`);
      }

      const paymentsData = await paymentsRes.json();
      const payments = paymentsData.items || [];

      // Connect to DB and map bookings
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

      const mappedPayments = payments.map((pay: any) => {
        const booking = bookings.find(
          (b) => b.razorpayPaymentId === pay.id || b.razorpayOrderId === pay.order_id
        );
        return {
          id: pay.id,
          amount: pay.amount / 100, // paise to INR
          status: pay.status,
          method: pay.method,
          email: pay.email,
          contact: pay.contact,
          created_at: pay.created_at,
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

    // 3. Connect DB and fetch bookings
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

    // 4. Map payments to DB bookings
    const mappedPayments = payments.map((pay: any) => {
      const booking = bookings.find(
        (b) => b.razorpayPaymentId === pay.id || b.razorpayOrderId === pay.order_id
      );
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
        settlement_id: pay.settlement_id,
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

    // 5. Calculate statistics
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
