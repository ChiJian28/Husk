"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-medium transition-[transform,background-color,box-shadow,opacity] duration-200 ease-husk disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary:
          "bg-husk text-husk-fg shadow-husk hover:brightness-110",
        secondary:
          "bg-raised text-ink border border-line hover:bg-sunken",
        ghost: "text-ink hover:bg-sunken",
        naked: "bg-naked text-[#1a1204] hover:brightness-110",
        danger: "bg-danger text-white hover:brightness-110",
        outline: "border border-line text-ink hover:border-husk hover:text-husk",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
