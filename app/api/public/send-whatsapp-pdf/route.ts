import { NextResponse } from "next/server";
import { corsResponse, handleOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    const { phone, pdfBase64, guestName, bookingId } = await request.json();

    if (!phone || !pdfBase64) {
      return corsResponse(NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 }));
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return corsResponse(NextResponse.json({ success: false, error: "WhatsApp credentials not configured on the server." }, { status: 500 }));
    }

    // Format phone number
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    // Convert Base64 back to buffer
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // Create Form Data to upload to Facebook Graph API
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    formData.append("file", blob, `Hotel_Devang_Receipt_${bookingId || "Booking"}.pdf`);
    formData.append("type", "application/pdf");
    formData.append("messaging_product", "whatsapp");

    // 1. Upload media to Meta WhatsApp servers
    const uploadRes = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/media`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.id) {
      console.error("Meta media upload error:", uploadData);
      return corsResponse(NextResponse.json({ success: false, error: "Failed to upload PDF receipt to Meta servers." }, { status: 502 }));
    }

    const mediaId = uploadData.id;

    // 2. Send the document message using media ID
    const sendRes = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "document",
        document: {
          id: mediaId,
          filename: `Hotel_Devang_Receipt_${bookingId || "Booking"}.pdf`,
          caption: `Dear ${guestName || "Guest"}, here is your official Provisional Booking Receipt from Hotel Devang Dwarka.`
        }
      })
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      console.error("Meta message send error:", sendData);
      return corsResponse(NextResponse.json({ success: false, error: "Failed to send PDF receipt via WhatsApp." }, { status: 502 }));
    }

    return corsResponse(NextResponse.json({ success: true, message: "PDF receipt successfully sent to WhatsApp!" }));

  } catch (err: any) {
    console.error("WhatsApp PDF endpoint error:", err);
    return corsResponse(NextResponse.json({ success: false, error: err.message || "Failed to process request" }, { status: 500 }));
  }
}
