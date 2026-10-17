import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Studio — admin",
  description: "Internal panel for AI personas, story budget and call capacity.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="min-h-dvh bg-[#fff5f8] text-[#34101d]">{children}</div>;
}
