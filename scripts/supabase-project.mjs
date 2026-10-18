import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = parseEnv(readFileSync(new URL("../supabase.env", import.meta.url), "utf8"));
const projectRef = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (!env.SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN is missing from supabase.env");
const endpoint = `https://mcp.supabase.com/mcp?project_ref=${encodeURIComponent(projectRef)}`;
let session;
let sequence = 0;
async function request(method, params, notification = false) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(session ? { "Mcp-Session-Id": session } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...(notification ? {} : { id: ++sequence }), method, params }),
    signal: AbortSignal.timeout(60000),
  });
  session = response.headers.get("mcp-session-id") || session;
  const text = await response.text();
  if (!response.ok) throw new Error(`Supplied-project MCP returned HTTP ${response.status}`);
  if (!text.trim()) return;
  const event = text.split("\n").filter((line) => line.startsWith("data: ")).at(-1);
  const payload = JSON.parse(event ? event.slice(6) : text);
  if (payload.error) throw new Error(payload.error.message);
  if (payload.result?.isError) throw new Error(JSON.stringify(payload.result.content));
  return payload.result;
}
await request("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "cookie-project-tools", version: "1.0.0" } });
await request("notifications/initialized", {}, true);
const mode = process.argv[2] || "--inspect";
if (mode === "--inspect") {
  const result = await request("tools/call", { name: "execute_sql", arguments: {
    query: "select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position",
  } });
  console.log(JSON.stringify(result));
} else if (mode === "--migrate") {
  const query = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  console.log(JSON.stringify(await request("tools/call", { name: "apply_migration", arguments: { name: "cookie_companion_schema", query } })));
} else if (mode === "--diaries") {
  const query = readFileSync(new URL("../supabase/diaries.sql", import.meta.url), "utf8");
  console.log(JSON.stringify(await request("tools/call", { name: "apply_migration", arguments: { name: "cookie_private_diaries", query } })));
} else if (mode === "--advisors") {
  console.log(JSON.stringify(await request("tools/call", { name: "get_advisors", arguments: { type: "security" } })));
} else {
  throw new Error("Choose --inspect, --migrate, --diaries, or --advisors");
}
