"use client";

import type { ComponentProps } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: ComponentProps<typeof Dialog.Content> & { side?: "right" | "bottom" }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-overlay bg-sunken/70 backdrop-blur-[2px]" />
      <Dialog.Content
        className={cn(
          "fixed z-overlay flex flex-col bg-raised text-ink shadow-lift",
          side === "right" && "inset-y-0 right-0 w-full max-w-lg border-l border-line",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-card border-t border-line",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-pill p-1 text-mute hover:bg-sunken hover:text-ink">
          <X className="size-5" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
