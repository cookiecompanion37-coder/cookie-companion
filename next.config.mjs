import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateEnv = path.join(__dirname, "supabase.env");
if (existsSync(privateEnv)) Object.assign(process.env, parseEnv(readFileSync(privateEnv, "utf8")));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // The dev server is proxied by the Arena preview host, so accept it.
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
    ] }];
  },
};

export default nextConfig;
