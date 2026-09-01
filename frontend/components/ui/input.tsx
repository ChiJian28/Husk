import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-input border border-line bg-raised px-3 text-sm text-ink placeholder:text-mute/70",
        "focus-visible:border-husk",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full resize-none rounded-input border border-line bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-mute/70",
        "focus-visible:border-husk",
        className,
      )}
      {...props}
    />
  );
}
