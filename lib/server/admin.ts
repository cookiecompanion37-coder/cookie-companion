import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal admin gate.
 *
 * One email + one passcode, exchanged for an HMAC-signed HttpOnly cookie. No
 * third-party auth, no session table, no per-request database read — which is
 * exactly what a low-traffic internal panel needs on a free tier.
 *
 * Access stays disabled until explicit credentials and a strong signing secret
 * are configured. No development credentials are accepted in production.
 */

export const ADMIN_COOKIE = "cookie_admin";
const SESSION_HOURS = 12;

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export function adminPasscode(): string {
  return process.env.ADMIN_PASSCODE ?? "";
}

export function adminDefaults(): boolean {
  return !process.env.ADMIN_PASSCODE || !process.env.ADMIN_EMAIL || (process.env.ADMIN_SECRET?.length ?? 0) < 32;
}

function secret(): string {
  if (adminDefaults()) throw new Error("Admin credentials and a 32-character ADMIN_SECRET must be configured.");
  return process.env.ADMIN_SECRET!;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createAdminToken(email: string): string {
  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = `${email}|${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined | null): { email: string } | null {
  if (!token || adminDefaults()) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let payload: string;
  try { payload = Buffer.from(encoded, "base64url").toString("utf8"); } catch { return null; }
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [email, expiresRaw] = payload.split("|");
  const expires = Number(expiresRaw);
  if (!email || !Number.isFinite(expires) || expires < Date.now()) return null;
  if (email.toLowerCase() !== adminEmail()) return null;
  return { email };
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function adminSession(request: Request): { email: string } | null {
  return verifyAdminToken(readCookie(request, ADMIN_COOKIE));
}

/** Admin cookie OR `Authorization: Bearer <CRON_SECRET>` (used by schedulers). */
export function isTrustedRequest(request: Request): boolean {
  if (adminSession(request)) return true;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(bearer && cronSecret && bearer === cronSecret);
}

export function adminCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure}`;
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Only compare after normalising; avoids leaking which half failed. */
export function checkCredentials(email: string, passcode: string): boolean {
  if (adminDefaults()) return false;
  const emailOk = email.trim().toLowerCase() === adminEmail();
  const expected = Buffer.from(adminPasscode());
  const given = Buffer.from(passcode);
  const passOk = expected.length === given.length && timingSafeEqual(expected, given);
  return emailOk && passOk;
}
