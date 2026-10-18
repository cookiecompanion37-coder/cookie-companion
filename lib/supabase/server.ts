import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Account service is not configured");
  return createServerClient(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", httpOnly: true },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => { items.forEach(({ name, value, options }) => store.set(name, value, options)); },
    },
  });
}
