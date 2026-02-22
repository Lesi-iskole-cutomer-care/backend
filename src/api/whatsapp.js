// src/api/whatsapp.js
import fetch from "node-fetch";

/** Normalize Sri Lankan mobile numbers to 94XXXXXXXXX (digits only). */
function normalizeSLMobile(input) {
  if (!input) return "";
  let num = String(input).replace(/\D+/g, ""); // keep only digits

  // 07XXXXXXXX -> 94XXXXXXXXX
  if (num.startsWith("0")) num = "94" + num.slice(1);

  // 7XXXXXXXX  -> 947XXXXXXXX (fallback)
  if (!num.startsWith("94")) num = "94" + num;

  return num;
}

/**
 * Send a WhatsApp text via ChatBizz API.
 *
 * Requires .env:
 *   WAPP_INSTANCE=xxxx
 *   WAPP_TOKEN=xxxx
 *
 * Docs (pattern):
 *   POST https://app.chatbizz.cc/api/send
 *   {
 *     "number": "94XXXXXXXXX",
 *     "type": "text",
 *     "message": "Your message",
 *     "instance_id": "WAPP_INSTANCE",
 *     "access_token": "WAPP_TOKEN"
 *   }
 */
export async function sendWhatsApp(to, body) {
  if (!to) throw new Error("Recipient number required");
  if (!body) throw new Error("Message body required");

  const INSTANCE = process.env.WAPP_INSTANCE;
  const TOKEN = process.env.WAPP_TOKEN;
  const num = normalizeSLMobile(to);

  // ✅ Dev fallback: if env is not set, just log instead of calling API
  if (!INSTANCE || !TOKEN) {
    console.log("==========================================");
    console.log("[DEV] WhatsApp (ChatBizz) SIMULATED SEND");
    console.log("Number  :", num);
    console.log("Message :", body);
    console.log("[DEV] Missing WAPP_INSTANCE or WAPP_TOKEN in .env");
    console.log("==========================================");
    return { ok: true, dev: true, number: num, body };
  }

  const url = "https://app.chatbizz.cc/api/send";

  const payload = {
    number: num,
    type: "text",
    message: body,
    instance_id: INSTANCE,
    access_token: TOKEN,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const txt = await res.text();

    console.log("==========================================");
    console.log("[ChatBizz] Request Payload:", payload);
    console.log(`[ChatBizz] Response (${res.status}):`, txt);
    console.log("==========================================");

    if (!res.ok) {
      throw new Error(`ChatBizz error ${res.status}: ${txt}`);
    }

    // Try to parse JSON, but it's okay if it's plain text
    try {
      const json = JSON.parse(txt);
      return { ok: true, response: json };
    } catch {
      return { ok: true, response: txt };
    }
  } catch (err) {
    console.error("[ChatBizz] SEND ERROR:", err.message);
    throw err;
  }
}
