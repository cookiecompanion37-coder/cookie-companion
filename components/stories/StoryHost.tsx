"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { StoryComposer } from "@/components/stories/StoryComposer";
import { StoryViewer } from "@/components/stories/StoryViewer";
import type { Story } from "@/lib/storyFeed";

interface Reel {
  stories: Story[];
  start: number;
}

interface StoryHostValue {
  openReel(stories: Story[], start?: number): void;
  openComposer(): void;
}

const StoryHostContext = createContext<StoryHostValue | null>(null);

export function StoryHost({ children }: { children: ReactNode }): JSX.Element {
  const [reel, setReel] = useState<Reel | null>(null);
  const [composer, setComposer] = useState(false);

  const openReel = useCallback((stories: Story[], start = 0) => {
    if (!stories.length) return;
    setReel({ stories, start: Math.max(0, Math.min(start, stories.length - 1)) });
  }, []);

  const value = useMemo<StoryHostValue>(() => ({ openReel, openComposer: () => setComposer(true) }), [openReel]);

  return (
    <StoryHostContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {reel && <StoryViewer stories={reel.stories} start={reel.start} onClose={() => setReel(null)} />}
      </AnimatePresence>
      <StoryComposer open={composer} onClose={() => setComposer(false)} />
    </StoryHostContext.Provider>
  );
}

export function useStories(): StoryHostValue {
  const value = useContext(StoryHostContext);
  if (!value) throw new Error("useStories must be used within StoryHost");
  return value;
}
