"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { compressFile } from "@/lib/media";
import { addLocalStory, type Story } from "@/lib/storyFeed";
import { useAppState } from "@/lib/store";
import { uid } from "@/lib/utils";

/**
 * Post a story: compress in the browser, upload once, then create the row.
 * The image is never hot-linked from a provider or kept in Postgres.
 */
export function StoryComposer({ open, onClose }: { open: boolean; onClose(): void }): React.JSX.Element | null {
  const state = useAppState();
  const input = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await compressFile(file, 900, 0.82);
      if (!dataUrl) setError("couldn't read that image");
      else setPreview(dataUrl);
    } finally { setBusy(false); }
  };

  const share = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    const name = state.session?.name || "you";
    try {
      let mediaUrl = preview;
      let stored = false;
      try {
        const response = await fetch("/api/storage/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: preview, folder: "stories/user" }),
        });
        if (response.ok) {
          const data = await response.json() as { url?: string; stored?: boolean };
          if (data.url) { mediaUrl = data.url; stored = Boolean(data.stored); }
        }
      } catch { /* offline: still show the story locally */ }

      let story: Story | null = null;
      if (stored && /^https?:\/\//i.test(mediaUrl)) {
        try {
          const response = await fetch("/api/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaUrl, caption: caption.trim(), authorName: name, scene: "your-moment" }),
          });
          if (response.ok) {
            const data = await response.json() as { story?: Story };
            story = data.story ?? null;
          }
        } catch { /* fall back to a local story */ }
      }
      if (!story) {
        const now = Date.now();
        story = {
          id: `local-${uid()}`, authorId: "you", authorName: name, authorEmoji: "", authorAccent: "#F19AB8",
          mediaUrl, caption: caption.trim(), scene: "your-moment", isAi: false,
          likeCount: 0, createdAt: now, expiresAt: now + 24 * 60 * 60_000, mine: true,
        };
      }
      addLocalStory(story);
      setPreview("");
      setCaption("");
      onClose();
    } catch {
      setError("something went wrong — try again");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-[#2a0512]/55 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="New story">
      <button type="button" aria-label="Close composer" className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-[460px] rounded-t-[30px] border-t border-white/60 bg-[#fff7f9] px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-24px_60px_-30px_rgba(120,10,50,.6)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[19px] font-semibold text-[#34101d]">New story</h2>
            <p className="text-[11px] font-medium text-[#8a596b]">Visible for 24 hours, then gone.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="press grid h-9 w-9 place-items-center rounded-full bg-white text-[#a33b5e] shadow-sm">
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="press relative grid aspect-[9/16] w-[122px] shrink-0 place-items-center overflow-hidden rounded-[20px] border border-dashed border-[#d68aa4] bg-white/70 text-[#c60f4d]"
            aria-label="Choose a photo"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Story preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-[10.5px] font-semibold">
                {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={22} />}
                add photo
              </span>
            )}
          </button>
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(event) => void pick(event.target.files?.[0])} />

          <div className="min-w-0 flex-1">
            <label htmlFor="story-caption" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a33b5e]">Caption</label>
            <textarea
              id="story-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 120))}
              placeholder="say something small…"
              rows={4}
              className="mt-1.5 w-full resize-none rounded-[18px] border border-white/90 bg-white px-3.5 py-3 text-[13px] text-[#34101d] outline-none placeholder:text-[#bd93a1] focus:border-[#f5a3bd]"
            />
            <p className="mt-1 text-right text-[10px] font-semibold text-[#a97c8b]">{caption.length}/120</p>
            <p className="mt-1 text-[10.5px] leading-snug text-[#8a596b]">Portrait photos look best — viewers see the full 9:16 frame.</p>
          </div>
        </div>

        {error && <p className="mt-2 text-[11.5px] font-semibold text-[#c60f4d]">{error}</p>}

        <Button full className="mt-3" onClick={() => void share()} disabled={!preview || busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          {busy ? "Sharing…" : "Share to stories"}
        </Button>
      </div>
    </div>
  );
}
