import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await client.from("diaries").select("id,title,body,mood,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: "Could not load diary" }, { status: 503 }) : NextResponse.json({ entries: data }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const input = await request.json();
    if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 120 || typeof input.body !== "string" || !input.body.trim() || input.body.length > 10000 || !["happy", "grateful", "reflective", "low", "hopeful"].includes(input.mood)) return NextResponse.json({ error: "Add a title, a reflection, and a mood." }, { status: 400 });
    const { error } = await client.from("diaries").insert({ user_id: user.id, title: input.title.trim(), body: input.body.trim(), mood: input.mood });
    return error ? NextResponse.json({ error: "Could not save entry" }, { status: 503 }) : NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not save entry" }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  const { error } = await client.from("diaries").delete().eq("user_id", user.id).eq("id", id);
  return error ? NextResponse.json({ error: "Could not delete entry" }, { status: 503 }) : NextResponse.json({ ok: true });
}
