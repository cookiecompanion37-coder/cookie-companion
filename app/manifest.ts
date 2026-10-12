import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Cookie — AI Companion", short_name: "Cookie", description: "A cozy place to chat with your AI companion.", start_url: "/", display: "standalone", orientation: "portrait", background_color: "#FFF8EC", theme_color: "#FFF8EC", icons: [
    { src: "/cookie-logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/cookie-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/cookie-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ] };
}
