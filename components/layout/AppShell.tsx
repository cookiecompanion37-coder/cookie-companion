"use client";

import type { JSX } from "react";
import { EngineProvider } from "@/lib/engine/EngineProvider";
import { NavProvider } from "@/lib/nav";
import { ToastProvider } from "@/components/ui/Toast";
import { ShellContent } from "@/components/layout/ShellContent";
import { StoryHost } from "@/components/stories/StoryHost";

export function AppShell(): JSX.Element {
  return <NavProvider><ToastProvider><EngineProvider><StoryHost><ShellContent/></StoryHost></EngineProvider></ToastProvider></NavProvider>;
}
