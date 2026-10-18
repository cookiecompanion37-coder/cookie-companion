import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ data: null, user: null }, { headers: { "Cache-Control": "no-store" } });
    const { data, error } = await client.from("user_state").select("data").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ data: data?.data ?? null, user: { id: user.id, name: user.user_metadata.name ?? "friend", email: user.email } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load saved data" }, { status: 503 }); }
}
export async function PUT(request: Request) {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to save" }, { status: 401 });
    const text = await request.text();
    if (text.length > 2_000_000) return NextResponse.json({ error: "Saved data is too large" }, { status: 413 });
    const input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    const { session, plan: _plan, credits: _credits, ...saved } = input;
    const data = { ...saved, session: { name: typeof session?.name === "string" ? session.name.slice(0,32) : user.user_metadata.name, email: user.email, vibe: typeof session?.vibe === "string" ? session.vibe.slice(0,40) : "Cozy", interests: Array.isArray(session?.interests) ? session.interests.filter((v: unknown) => typeof v === "string").slice(0,5) : [] } };
    const { error } = await client.from("user_state").upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not save your changes" }, { status: 503 }); }
}
export async function DELETE() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [state, diaries] = await Promise.all([client.from("user_state").delete().eq("user_id", user.id), client.from("diaries").delete().eq("user_id", user.id)]);
  if (state.error || diaries.error) return NextResponse.json({ error: "Could not delete saved data" }, { status: 503 });
  await client.auth.signOut();
  return NextResponse.json({ ok: true });
}
