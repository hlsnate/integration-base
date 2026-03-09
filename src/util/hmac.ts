import { timingSafeEqual } from "@std/crypto";

/** Hash-Based Message Authentication Code validation */
export async function verifyHMAC(
  data: string,
  key: string,
  header: string,
): Promise<boolean> {
  try {
    if (!header || !key) return false;

    let expectedSignature: string;
    if (header.startsWith("sha256=")) {
      // GitHub/Standard: "sha256=abc123..."
      expectedSignature = header.slice(7);
    } else if (header.includes("v1=")) {
      // Stripe: "t=1234567890,v1=abc123..."
      const match = header.match(/v1=([a-f0-9]+)/i);
      if (!match) return false;
      expectedSignature = match[1];
    } else {
      // Raw hex: "abc123..."
      expectedSignature = header;
    }

    // Validate hex format
    if (!/^[a-f0-9]+$/i.test(expectedSignature)) {
      return false;
    }

    const actualSignature = await generateHMAC(data, key);
    return secureCompare(actualSignature, expectedSignature);
  } catch (err) {
    console.error("HMAC verification failed:", err);
    return false;
  }
}

export async function generateHMAC(data: string, key: string): Promise<string> {
  const keyData = new TextEncoder().encode(key);
  const dataToSign = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  // lowercase both — hex is case-insensitive, normalise before comparison
  return timingSafeEqual(
    encoder.encode(a.toLowerCase()),
    encoder.encode(b.toLowerCase()),
  );
}
