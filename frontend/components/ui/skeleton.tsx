import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-input bg-sunken",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.4s_ease_infinite] after:bg-gradient-to-r after:from-transparent after:via-ink/8 after:to-transparent",
        className,
      )}
    />
  );
}
