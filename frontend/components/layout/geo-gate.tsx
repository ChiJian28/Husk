"use client";

import { useHealth } from "@/hooks/useApi";
import { isGeoBlocked } from "@/lib/errors";
import { HuskMascot } from "@/components/brand/husk-mascot";

export function GeoGate({ children }: { children: React.ReactNode }) {
  const health = useHealth();
  if (health.isError && isGeoBlocked(health.error)) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
        <HuskMascot mood="error" size={180} />
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Not available here</h1>
          <p className="text-sm text-mute leading-relaxed">
            Husk cannot offer coverage from your region. This is a product restriction, not a wallet error.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
