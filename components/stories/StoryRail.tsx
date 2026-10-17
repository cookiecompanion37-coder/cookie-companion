"use client";

import { useMemo } from "react";
import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { useStories } from "@/components/stories/StoryHost";
import { useNav } from "@/lib/nav";
import { useStoryFeed, type Story } from "@/lib/storyFeed";
import { cn } from "@/lib/utils";

function reelsOf(stories: Story[]): Story[][] {
  const groups = new Map<string, Story[]>();
  for (const story of stories) {
    const key = story.authorId || story.authorName;
    const list = groups.get(key) ?? [];
    list.push(story);
    groups.set(key, list);
  }
  return [...groups.values()].map((list) => list.sort((a, b) => a.createdAt - b.createdAt));
}

/** Instagram-style rail: your story first, then the people you follow. */
export function StoryRail({ className }: { className?: string }): React.JSX.Element {
  const nav = useNav();
  const { openReel, openComposer } = useStories();
  const { stories, loaded } = useStoryFeed();

  const reels = useMemo(() => reelsOf(stories), [stories]);
  const mine = useMemo(() => reels.find((reel) => reel[0]?.mine), [reels]);
  const others = useMemo(() => reels.filter((reel) => !reel[0]?.mine).slice(0, 12), [reels]);

  return (
    <section className={cn("px-5", className)} aria-label="Stories">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="font-display text-[17px] font-semibold text-[#34101d]">Stories</h2>
        <button type="button" onClick={() => nav.push({ name: "stories" })} className="press flex items-center gap-0.5 text-[11px] font-bold text-[#a33b5e]">
          See all <ChevronRight size={13} />
        </button>
      </div>

      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
        <div className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => mine ? openReel(mine, mine.length - 1) : openComposer()}
            className="relative grid h-[60px] w-[60px] place-items-center overflow-hidden rounded-full p-[2.5px]"
            aria-label={mine ? "Open your story" : "Add your story"}
          >
            <span className={cn("absolute inset-0 rounded-full", mine ? "brand-gradient" : "border-2 border-dashed border-[#d68aa4] bg-white/60")} />
            {mine ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mine[mine.length - 1]!.mediaUrl} alt="Your story" className="relative h-full w-full rounded-full border-2 border-[#fff4f7] object-cover" />
            ) : (
              <Plus size={20} className="relative text-[#c60f4d]" />
            )}
          </button>
          <span className="w-full truncate text-center text-[10px] font-bold text-[#8a4258]">{mine ? "You" : "Your story"}</span>
        </div>

        {others.map((reel) => {
          const latest = reel[reel.length - 1]!;
          return (
            <button
              key={latest.authorId || latest.authorName}
              type="button"
              onClick={() => openReel(reel, 0)}
              className="flex w-[64px] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className="relative grid h-[60px] w-[60px] place-items-center rounded-full p-[2.5px]"
                style={{ background: `linear-gradient(145deg, ${latest.authorAccent}, #f5286e 70%, #ffd2e1)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={latest.mediaUrl} alt={latest.authorName} loading="lazy" className="absolute inset-[2.5px] h-[calc(100%-5px)] w-[calc(100%-5px)] rounded-full border-2 border-[#fff4f7] object-cover" />
                {latest.isAi && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[#c60f4d] shadow-sm">
                    <Sparkles size={10} strokeWidth={2.6} />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[10px] font-bold text-[#5c2a3b]">{latest.authorName}</span>
            </button>
          );
        })}

        {!loaded && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
            <span className="h-[60px] w-[60px] animate-pulse rounded-full bg-white/60" />
            <span className="h-2 w-9 animate-pulse rounded-full bg-white/60" />
          </div>
        ))}
      </div>
    </section>
  );
}
