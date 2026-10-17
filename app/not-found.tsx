import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound(): React.JSX.Element {
  return <main className="app-shell"><div className="mesh-bg"/><div className="paper-grain"/><div className="flex h-full items-center justify-center p-6"><EmptyState mood="crumbled" title="Oops, that crumbled" body="That little page isn’t here. Let’s head back to the cozy corner." action={<a href="/" className="inline-flex min-h-12 items-center justify-center rounded-full px-6 font-display font-bold text-choc shadow-[0_12px_24px_-12px_rgba(214,124,178,.8)] [background:linear-gradient(135deg,#ffd9a6,#ffb3d1_45%,#c9b0ff)]">Back home</a>}/></div></main>;
}
