import { NextResponse } from "next/server";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // Allow all origins for public APIs, or specify "https://hoteldevang.com"
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
