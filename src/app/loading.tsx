import { SkeletonBlock } from "@/components/ui/SkeletonBlock";

export default function GlobalLoading() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-[469px] flex-col gap-3 bg-[var(--bg-body)] px-5 py-4">
      <SkeletonBlock className="h-8 w-40" />
      <SkeletonBlock className="h-12 w-full rounded-xl" />
      <SkeletonBlock className="h-40 w-full rounded-2xl" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
    </main>
  );
}
