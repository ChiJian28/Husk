"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Stack } from "@phosphor-icons/react";
import { HuskPromptMark } from "@/components/brand/husk-mascot";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const askActive = pathname === "/ask";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-nav lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="relative mx-auto w-full pb-[env(safe-area-inset-bottom)]">
        <svg
          className="block h-[var(--mobile-nav-height)] w-full"
          viewBox="0 0 375 84"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="mobile-nav-shadow" x="-10%" y="-30%" width="120%" height="160%">
              <feDropShadow dx="0" dy="-6" stdDeviation="10" floodColor="var(--ink)" floodOpacity="0.1" />
            </filter>
            <radialGradient id="mobile-nav-notch" cx="50%" cy="42%" r="26%">
              <stop offset="0%" stopColor="var(--sunken)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--raised)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            filter="url(#mobile-nav-shadow)"
            d="M0 22 H152 C162 22 172 52 187.5 52 C203 52 213 22 223 22 H375 V84 H0 Z"
            fill="var(--raised)"
          />
          <path
            d="M0 22 H152 C162 22 172 52 187.5 52 C203 52 213 22 223 22 H375"
            fill="none"
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <ellipse cx="187.5" cy="44" rx="34" ry="18" fill="url(#mobile-nav-notch)" />
        </svg>

        <div className="absolute inset-x-0 bottom-0 grid h-[var(--mobile-nav-height)] grid-cols-3 items-end px-3 pb-2.5">
          <Link
            href="/"
            className={cn(
              "col-start-1 flex flex-col items-center gap-0.5 text-[11px] transition-colors duration-200 ease-husk",
              pathname === "/" ? "text-husk" : "text-mute",
            )}
          >
            <span className="flex size-8 items-center justify-center">
              <House weight={pathname === "/" ? "fill" : "regular"} className="size-[18px]" />
            </span>
            Home
          </Link>

          <Link
            href="/ask"
            aria-current={askActive ? "page" : undefined}
            className="col-start-2 flex flex-col items-center justify-end gap-1 pb-0.5"
          >
            <span
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full bg-husk p-0.5 shadow-husk",
                "transition-[transform,box-shadow] duration-200 ease-husk active:scale-95",
                askActive && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--husk)_28%,transparent)]",
              )}
            >
              <HuskPromptMark size={50} rounded="full" />
            </span>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors duration-200 ease-husk",
                askActive ? "text-husk" : "text-ink",
              )}
            >
              Ask Husk
            </span>
          </Link>

          <Link
            href="/positions"
            className={cn(
              "col-start-3 flex flex-col items-center gap-0.5 text-[11px] transition-colors duration-200 ease-husk",
              pathname === "/positions" ? "text-husk" : "text-mute",
            )}
          >
            <span className="flex size-8 items-center justify-center">
              <Stack weight={pathname === "/positions" ? "fill" : "regular"} className="size-[18px]" />
            </span>
            Positions
          </Link>
        </div>
      </div>
    </nav>
  );
}
