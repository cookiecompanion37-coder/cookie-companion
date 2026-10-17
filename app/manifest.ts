import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Cookie — AI Companion", short_name: "Cookie", description: "A cozy place to chat with your AI companion.", start_url: "/", display: "standalone", orientation: "portrait", background_color: "#FFFBF0", theme_color: "#FFFBF0", icons: [
    { src: "/cookie-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/cookie-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/cookie-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ] };
}
