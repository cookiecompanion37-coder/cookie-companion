"use client";

import { useMemo } from "react";
import { ArrowLeft, Clock, Heart, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WScreen } from "@/components/ui/WallpaperBg";
import { useStories } from "@/components/stories/StoryHost";
import { useNav } from "@/lib/nav";
import { formatRemaining, remainingMs, useStoryFeed, type Story } from "@/lib/storyFeed";
import { useAppState } from "@/lib/store";

/**
 * The full stories board. Cards are grouped per author so a tap opens that
 * person's reel at the right place.
 */
export function StoriesScreen(): React.JSX.Element {
  const nav = useNav();
  const state = useAppState();
  const { openReel, openComposer } = useStories();
  const { stories, loaded } = useStoryFeed();

  const groups = useMemo(() => {
    const map = new Map<string, Story[]>();
    for (const story of stories) {
      const key = story.authorId || story.authorName;
      map.set(key, [...(map.get(key) ?? []), story]);
    }
    return [...map.values()].map((list) => list.sort((a, b) => b.createdAt - a.createdAt));
  }, [stories]);

  const total = stories.length;
  const aiCount = stories.filter((story) => story.isAi).length;

  return (
    <WScreen id={state.wallpaper}>
      <main className="relative z-10 flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]">
          <button type="button" onClick={nav.pop} aria-label="Back" className="press grid h-10 w-10 place-items-center rounded-full bg-white/60 text-[#8a4258]">
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[21px] font-semibold leading-tight text-[#34101d]">Stories</h1>
            <p className="text-[10.5px] font-semibold text-[#a33b5e]">{total} live · {aiCount} from companions · gone in 24 h</p>
          </div>
          <button type="button" onClick={openComposer} aria-label="Add your story" className="press grid h-10 w-10 place-items-center rounded-full brand-gradient text-white shadow-[0_10px_22px_-12px_rgba(214,18,83,.9)]">
            <Plus size={19} />
          </button>
        </header>

        <div className="no-scrollbar mt-4 flex-1 overflow-y-auto px-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={openComposer} className="press card mb-4 flex w-full items-center gap-3 rounded-[22px] p-3 text-left">
            <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-[linear-gradient(150deg,#ffe0ea,#ffbcd1)] text-[#c60f4d]"><Plus size={20} /></span>
            <span className="min-w-0 flex-1">
              <strong className="block font-display text-[14px] font-semibold text-[#34101d]">Share a moment</strong>
              <span className="text-[11.5px] text-[#8a596b]">A photo, a small caption. It disappears tomorrow.</span>
            </span>
          </button>

          {!loaded && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[9/14] animate-pulse rounded-[22px] bg-white/60" />)}
            </div>
          )}

          {loaded && groups.length === 0 && (
            <div className="card mt-2 rounded-[24px] p-5 text-center">
              <Sparkles size={22} className="mx-auto text-[#c60f4d]" />
              <p className="mt-2 font-display text-[15px] font-semibold text-[#34101d]">Quiet in here</p>
              <p className="mt-1 text-[12px] text-[#8a596b]">New stories from your companions land every few minutes.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {groups.map((reel) => {
              const latest = reel[0]!;
              return (
                <button
                  key={latest.authorId || latest.authorName}
                  type="button"
                  onClick={() => openReel([...reel].sort((a, b) => a.createdAt - b.createdAt), 0)}
                  className="press group relative overflow-hidden rounded-[22px] text-left shadow-[0_18px_34px_-26px_rgba(120,10,50,.7)]"
                >
                  <div className="relative aspect-[9/14] w-full">
                    {latest.mediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={latest.mediaUrl} alt={latest.caption || latest.authorName} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[linear-gradient(140deg,#ffd9e5,#ffeedf)] text-4xl">{latest.authorEmoji}</div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,4,12,.02)_35%,rgba(20,4,12,.82)_100%)]" />
                    <span className="absolute left-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/70 text-[12px] font-bold text-white" style={{ background: latest.authorAccent }}>
                      {latest.authorName.trim().slice(0, 1).toUpperCase()}
                    </span>
                    {latest.isAi && (
                      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md">
                        <Sparkles size={9} /> AI
                      </span>
                    )}
                    <div className="absolute inset-x-3 bottom-2.5 text-white">
                      <p className="truncate text-[12px] font-bold">{latest.authorName}</p>
                      {latest.caption && <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-white/85">{latest.caption}</p>}
                      <div className="mt-1.5 flex items-center justify-between text-[9.5px] font-semibold text-white/75">
                        <span className="inline-flex items-center gap-1"><Clock size={10} /> {formatRemaining(remainingMs(latest))}</span>
                        <span className="inline-flex items-center gap-1"><Heart size={10} /> {latest.likeCount}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button variant="soft" full className="mt-4" onClick={openComposer}>
            <Plus size={16} /> Add to stories
          </Button>
        </div>
      </main>
    </WScreen>
  );
}
