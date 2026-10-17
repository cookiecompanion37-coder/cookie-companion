import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fredoka = localFont({ src: "./fonts/Fredoka-variable.ttf", weight: "500 700", variable: "--font-fredoka", display: "swap" });
const nunito = localFont({ src: "./fonts/Nunito-variable.ttf", weight: "400 800", variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Cookie — your cozy AI companion",
  description: "Meet a companion who remembers the little things. Chat, call, and share little moments.",
  applicationName: "Cookie",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Cookie" },
  icons: { icon: "/cookie-icon.png", apple: "/cookie-logo.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#FFE9F0", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}><body>{children}</body></html>;
}
