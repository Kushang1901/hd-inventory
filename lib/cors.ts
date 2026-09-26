import { NextResponse } from "next/server";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-telegram-bot-api-secret-token",
    "Access-Control-Max-Age": "86400",
  };
}

export function corsResponse(response: NextResponse) {
  const headers = corsHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function handleOptions() {
  const response = new NextResponse(null, { 
    status: 200, 
    headers: corsHeaders() 
  });
  return response;
}
