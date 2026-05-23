import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "devang_admin_secret_key_2026";

export function signToken(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${base64Header}.${base64Payload}`);
  const signature = hmac.digest().toString("base64url");
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

export function verifyToken(token: string): any {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${header}.${payload}`);
  const expectedSignature = hmac.digest().toString("base64url");
  
  if (signature !== expectedSignature) {
    return null;
  }
  
  try {
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    // Check expiration if present
    if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
      return null;
    }
    return decodedPayload;
  } catch {
    return null;
  }
}
