"use client";

import { CalendarShelf } from "@/components/home/calendar-shelf";
import { CoverageHero } from "@/components/home/coverage-hero";
import { PolicyPanel } from "@/components/policy/policy-panel";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";

export default function HomePage() {
  const policyOpen = useUi((s) => s.policyOpen);
  const chatOpen = useUi((s) => s.chatOpen);

  return (
    <div
      className={cn(
        "lg:flex lg:min-h-0 lg:flex-col",
        chatOpen ? "lg:h-[calc(100dvh-3.5rem)]" : "lg:h-[calc(100dvh-3.5rem-5.5rem)]",
      )}
    >
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(22rem,5fr)_minmax(0,7fr)] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col border-b border-line px-5 py-8 md:px-8 lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r lg:py-10">
          <CoverageHero />
        </div>
        <div className="relative flex min-h-0 flex-col px-5 py-8 md:px-8 lg:h-full lg:min-h-0 lg:overflow-hidden lg:py-10">
          {policyOpen ? <PolicyPanel /> : <CalendarShelf />}
        </div>
      </div>
    </div>
  );
}
