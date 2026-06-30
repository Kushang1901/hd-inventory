const keyId = "rzp_live_SsrjT2eFY7oLhR";
const keySecret = "prfL6Ukue8SXh2D2OrMPODzL";
const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
const settlementId = "setl_T7lWzWjeDjRke5";

async function test() {
  try {
    console.log("--- Testing Proposed Logic ---");
    
    // 1. Fetch settlement
    const settlementRes = await fetch(
      `https://api.razorpay.com/v1/settlements/${settlementId}`,
      { headers: { Authorization: authHeader } }
    );
    if (!settlementRes.ok) {
      console.log("Settlement fetch failed:", await settlementRes.text());
      return;
    }
    const settlement = await settlementRes.json();
    console.log("Settlement:", settlement);
    const settlementCreatedAt = settlement.created_at;
    const isProcessed = settlement.status === "processed";

    // 2. Fetch payments
    const fromTime = settlementCreatedAt - 30 * 24 * 60 * 60;
    const toTime = settlementCreatedAt + 1 * 24 * 60 * 60;
    const paymentsRes = await fetch(
      `https://api.razorpay.com/v1/payments?from=${fromTime}&to=${toTime}&count=100`,
      { headers: { Authorization: authHeader } }
    );
    if (!paymentsRes.ok) {
      console.log("Payments fetch failed:", await paymentsRes.text());
      return;
    }
    const paymentsData = await paymentsRes.json();
    const payments = paymentsData.items || [];
    console.log(`Fetched ${payments.length} payments in window`);

    // 3. Filter
    const matchedPayments = payments.filter((pay) => {
      if (pay.settlement_id === settlementId) {
        return true;
      }
      if (!isProcessed && (!pay.settlement_id || pay.settlement_id === null)) {
        return pay.status === "captured" && pay.created_at <= settlementCreatedAt;
      }
      return false;
    });

    console.log(`Matched ${matchedPayments.length} payments:`);
    console.log(matchedPayments.map(p => ({
      id: p.id,
      amount: p.amount / 100,
      status: p.status,
      settlement_id: p.settlement_id
    })));
  } catch (err) {
    console.error("Test error:", err);
  }
}

test();
