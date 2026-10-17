import { NextResponse } from "next/server";
import {
  adminCookie, adminDefaults, adminEmail, adminSession, checkCredentials, clearAdminCookie, createAdminToken,
} from "@/lib/server/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const session = adminSession(request);
  return NextResponse.json({ signedIn: Boolean(session), email: session?.email ?? null, defaults: adminDefaults() });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { email?: string; passcode?: string };
    if (!checkCredentials(body.email ?? "", body.passcode ?? "")) {
      // Small fixed delay blunts trivial guessing without needing a rate-limit table.
      await new Promise((resolve) => setTimeout(resolve, 350));
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, email: adminEmail() });
    response.headers.set("Set-Cookie", adminCookie(createAdminToken(adminEmail())));
    return response;
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearAdminCookie());
  return response;
}
