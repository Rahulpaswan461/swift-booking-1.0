import crypto from "node:crypto"
import { dodoConfig } from "../config/dodo.js"

export function verifyDodoSignature(rawBody, headers) {
  let secret
  try { secret = dodoConfig().webhookSecret } catch { return false }
  if (!secret) {
    console.warn("[Dodo sig] no webhook secret configured for the selected environment")
    return false
  }

  const id = headers["webhook-id"]
  const timestamp = headers["webhook-timestamp"]
  const signatureHeader = headers["webhook-signature"]
  if (!id || !timestamp || !signatureHeader) {
    console.warn("[Dodo sig] missing signature headers", { id: !!id, timestamp: !!timestamp, signature: !!signatureHeader })
    return false
  }

  // Reject stale deliveries (>5 min) to prevent replay
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) {
    console.warn("[Dodo sig] timestamp rejected (stale or unparseable)", { timestamp, ageSeconds: age })
    return false
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64")

  const matched = signatureHeader.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return false
    }
  })
  if (!matched) {
    console.warn("[Dodo sig] HMAC mismatch — check the selected environment’s webhook secret", {
      expectedPrefix: expected.slice(0, 8),
      headerPrefix: signatureHeader.slice(0, 24),
    })
  }
  return matched
}

