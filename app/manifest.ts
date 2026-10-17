import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cookie — AI Companion",
    short_name: "Cookie",
    description: "A cozy place to chat with your AI companion.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFE9F0",
    theme_color: "#F5286E",
    icons: [
      { src: "/cookie-icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/cookie-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/cookie-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
