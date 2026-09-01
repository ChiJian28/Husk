import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "mute",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "mute" | "husk" | "naked" | "payout" | "danger";
}) {
  const tones = {
    mute: "bg-sunken text-mute",
    husk: "bg-husk-soft text-husk",
    naked: "bg-naked/15 text-naked",
    payout: "bg-payout/15 text-payout",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
