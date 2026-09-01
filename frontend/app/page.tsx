"use client";

import { CalendarShelf } from "@/components/home/calendar-shelf";
import { CoverageHero } from "@/components/home/coverage-hero";
import { PolicyPanel } from "@/components/policy/policy-panel";
import { useUi } from "@/stores/ui";

export default function HomePage() {
  const policyOpen = useUi((s) => s.policyOpen);

  return (
    <div className="lg:grid lg:min-h-[100dvh] lg:grid-cols-[minmax(22rem,5fr)_minmax(0,7fr)]">
      <div className="border-b border-line px-5 py-8 md:px-8 lg:border-b-0 lg:border-r lg:py-10">
        <CoverageHero />
      </div>
      <div className="relative flex min-h-0 flex-col px-5 py-8 md:px-8 lg:py-10">
        {policyOpen ? <PolicyPanel /> : <CalendarShelf />}
      </div>
    </div>
  );
}
