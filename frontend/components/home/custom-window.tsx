"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomEvent } from "@/hooks/useApi";
import { ApiError } from "@/lib/errors";
import { useUi } from "@/stores/ui";

export function CustomWindow() {
  const [name, setName] = useState("48h floor");
  const [when, setWhen] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const create = useCustomEvent();
  const selectEvent = useUi((s) => s.selectEvent);
  const setPolicyOpen = useUi((s) => s.setPolicyOpen);
  const setCustomOpen = useUi((s) => s.setCustomOpen);

  return (
    <form
      className="mt-4 grid gap-3 rounded-card border border-line bg-raised p-4 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!when) {
          setErr("Pick an end time.");
          return;
        }
        const ts = new Date(when).toISOString();
        try {
          const res = await create.mutateAsync({ name: name || "Custom window", tsUtc: ts, assets: ["ETH"] });
          selectEvent(res.event.id);
          setPolicyOpen(true);
          setCustomOpen(false);
        } catch (error) {
          setErr(error instanceof ApiError ? error.message : "Could not create window");
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="cw-name">Name</Label>
        <Input id="cw-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cw-when">Covers until</Label>
        <Input id="cw-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Use window"}
        </Button>
      </div>
      {err ? <p className="text-xs text-danger sm:col-span-3">{err}</p> : null}
    </form>
  );
}
