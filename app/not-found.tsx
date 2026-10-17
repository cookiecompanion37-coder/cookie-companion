import { EmptyState } from "@/components/ui/EmptyState";
import { WScreen } from "@/components/ui/WallpaperBg";

export default function NotFound(): React.JSX.Element {
  return (
    <WScreen id="sakura">
      <main className="relative z-10 flex h-full items-center justify-center p-6">
        <EmptyState
          mood="crumbled"
          title="Oops, that crumbled"
          body="That little page isn’t here. Let’s head back to the cozy corner."
          action={<a href="/" className="inline-flex min-h-12 items-center justify-center rounded-full brand-gradient px-6 font-display font-semibold text-white shadow-[0_14px_28px_-14px_rgba(214,18,83,.8)]">Back home</a>}
        />
      </main>
    </WScreen>
  );
}
