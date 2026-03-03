interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-[6px] bg-[var(--surface-card-muted)] ${className}`} />;
}
