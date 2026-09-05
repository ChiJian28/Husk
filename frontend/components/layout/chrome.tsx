"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, Stack } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { HuskMark, HuskPromptMark } from "@/components/brand/husk-mascot";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WalletButton } from "@/components/layout/wallet-button";
import { Button } from "@/components/ui/button";
import { useHealth } from "@/hooks/useApi";
import { useUi } from "@/stores/ui";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/positions", label: "Positions", icon: Stack },
] as const;

const DESKTOP_NAV = NAV;

export function DesktopTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const health = useHealth();
  const ready = health.data;
  const chatOpen = useUi((s) => s.chatOpen);
  const setChatOpen = useUi((s) => s.setChatOpen);

  const toggleAsk = () => {
    if (chatOpen) {
      setChatOpen(false);
      return;
    }
    if (pathname === "/ask") {
      router.push("/");
    }
    setChatOpen(true);
  };

  return (
    <header className="hidden lg:flex h-14 shrink-0 items-center justify-between border-b border-line bg-raised/95 px-6 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5">
          <HuskMark />
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">Husk</span>
            <span className="text-[11px] text-mute">Event coverage</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {DESKTOP_NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-input px-3 py-2 text-sm transition-colors duration-200 ease-husk",
                  active ? "bg-sunken text-ink" : "text-mute hover:bg-sunken hover:text-ink",
                )}
              >
                <Icon weight={active ? "fill" : "regular"} className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-4 border-r border-line pr-4 text-[12px] text-mute xl:flex">
          <div className="flex items-center gap-2">
            <span>Base</span>
            <span className={ready?.ok ? "text-payout" : "text-naked"}>
              {health.isLoading ? "…" : ready?.ok ? "live" : "degraded"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Book</span>
            <span data-numeric>{ready?.orderCount ?? "-"}</span>
          </div>
        </div>

        <Button
          variant={chatOpen ? "primary" : "outline"}
          size="sm"
          onClick={toggleAsk}
          className="gap-2"
        >
          <HuskPromptMark size={18} className="shrink-0" />
          Ask Husk
        </Button>
        <ThemeToggle />
        <WalletButton />
      </div>
    </header>
  );
}

/** @deprecated Use DesktopTopNav — kept for any stale imports */
export function DesktopRail() {
  return null;
}

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-header flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <HuskMark className="size-8" />
        <span className="text-sm font-semibold tracking-tight">Husk</span>
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <WalletButton compact />
      </div>
    </header>
  );
}

export { MobileNav } from "@/components/layout/mobile-nav";
