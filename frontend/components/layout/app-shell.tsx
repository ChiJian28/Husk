"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AskHusk } from "@/components/ask/ask-husk";
import { DesktopPromptBar } from "@/components/ask/prompt-bar";
import { DesktopTopNav, MobileNav, MobileTopBar } from "@/components/layout/chrome";
import { GeoGate } from "@/components/layout/geo-gate";
import { RfqWatcher } from "@/components/policy/rfq-watcher";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chatOpen = useUi((s) => s.chatOpen);
  const setChatOpen = useUi((s) => s.setChatOpen);

  useEffect(() => {
    if (pathname === "/ask" && typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setChatOpen(true);
      router.replace("/");
    }
  }, [pathname, router, setChatOpen]);

  return (
    <GeoGate>
      <div className="flex min-h-[100dvh] flex-col lg:min-h-[100dvh]">
        <DesktopTopNav />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
              <MobileTopBar />
              <main
                className={cn(
                  "relative flex-1",
                  "pb-[5.75rem] lg:pb-[5.5rem]",
                  chatOpen && "lg:pb-0",
                )}
              >
                {children}
              </main>
            </div>

            {chatOpen ? (
              <div className="hidden min-h-0 lg:flex">
                <AskHusk variant="panel" />
              </div>
            ) : null}
          </div>
        </div>

        <DesktopPromptBar />
        <MobileNav />
        <RfqWatcher />
      </div>
    </GeoGate>
  );
}
