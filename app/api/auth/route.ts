import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export async function GET() {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    return NextResponse.json({ user: user ? { id: user.id, email: user.email, name: user.user_metadata.name ?? "friend" } : null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Account service unavailable" }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!rateLimit(`auth:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}`)) return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  try {
    const body = await request.json();
    const client = await createClient();
    if (body.action === "signout") {
      const { error } = await client.auth.signOut();
      return error ? NextResponse.json({ error: "Could not sign out. Try again." }, { status: 503 }) : NextResponse.json({ ok: true });
    }
    if (!["signin", "signup"].includes(body.action) || typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) return NextResponse.json({ error: "Enter a valid email and a password of 8–128 characters." }, { status: 400 });
    if (body.action === "signup" && (body.adult !== true || typeof body.name !== "string" || body.name.trim().length < 2)) return NextResponse.json({ error: "Enter your name and confirm you are 18 or older." }, { status: 400 });
    const credentials = { email: body.email.trim().toLowerCase(), password: body.password };
    const result = body.action === "signup"
      ? await client.auth.signUp({ ...credentials, options: { data: { name: body.name.trim().slice(0, 32), adult: true }, emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${new URL(request.url).origin}/auth/callback` } })
      : await client.auth.signInWithPassword(credentials);
    if (result.error) {
      const error = result.error;
      const message =
        error.status === 429 ? "Too many attempts. Try again shortly."
        : error.code === "email_not_confirmed" ? "Confirm your email before signing in."
        : error.code === "weak_password" ? "Choose a stronger password."
        : error.code === "user_already_exists" || error.code === "email_exists" || /already registered/i.test(error.message) ? "An account with this email already exists. Try signing in instead."
        : error.code === "email_address_invalid" || /invalid/i.test(error.message) ? "That email address isn't accepted. Please use a different email."
        : error.code === "signup_disabled" ? "New signups are currently disabled."
        : error.code === "over_email_send_rate_limit" ? "Too many confirmation emails sent. Try again shortly."
        : error.status && error.status >= 500 ? "Account service unavailable. Please try again."
        : body.action === "signup" ? `Could not create the account: ${error.message}` : "Invalid email or password.";
      return NextResponse.json({ error: message }, { status: error.status === 429 ? 429 : 400 });
    }
    return NextResponse.json({ ok: true, confirmationRequired: !result.data.session });
  } catch { return NextResponse.json({ error: "Account service unavailable. Please try again." }, { status: 503 }); }
}
