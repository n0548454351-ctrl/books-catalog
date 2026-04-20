import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Option A: forward to a webhook / email service ────────────────────────
  // Replace with your preferred service (Resend, SendGrid, Formspree, etc.)
  // Example with a generic webhook:
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, ts: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("Contact webhook failed:", err);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }
  } else {
    // ── Option B: log to console in dev, save to Supabase if available ──────
    console.log("[CONTACT]", { name, email, subject, message });
  }

  return NextResponse.json({ success: true });
}
