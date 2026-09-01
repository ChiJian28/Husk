"use client";

import type { ComponentProps } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function AccordionRoot(props: ComponentProps<typeof Accordion.Root>) {
  return <Accordion.Root {...props} />;
}

export function AccordionItem({ className, ...props }: ComponentProps<typeof Accordion.Item>) {
  return <Accordion.Item className={cn("border-t border-line", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof Accordion.Trigger>) {
  return (
    <Accordion.Header>
      <Accordion.Trigger
        className={cn(
          "group flex w-full items-center justify-between py-3 text-left text-sm text-mute hover:text-ink",
          className,
        )}
        {...props}
      >
        {children}
        <CaretDown className="size-4 transition-transform duration-200 ease-husk group-data-[state=open]:rotate-180" />
      </Accordion.Trigger>
    </Accordion.Header>
  );
}

export function AccordionContent({ className, ...props }: ComponentProps<typeof Accordion.Content>) {
  return <Accordion.Content className={cn("pb-4 text-sm text-mute", className)} {...props} />;
}
