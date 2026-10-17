import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // The dev server is proxied by the Arena preview host, so accept it.
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  devIndicators: false,
};

export default nextConfig;
