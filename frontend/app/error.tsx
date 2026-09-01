"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something broke</h1>
      <p className="max-w-md text-sm text-mute">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
