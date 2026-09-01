"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { huskApi } from "@/lib/api";
import { DEMO_WALLET } from "@/lib/coverage";
import type { Address, AgentAutoBody, CoverageIntent, CustomEventBody, VerifyBody } from "@/lib/types";

export const qk = {
  health: ["health"] as const,
  calendar: ["calendar"] as const,
  holdings: (w?: string) => ["holdings", w?.toLowerCase()] as const,
  coverages: (w?: string) => ["coverages", w?.toLowerCase()] as const,
  quote: (id?: string) => ["quote", id] as const,
  demoQuote: (eventId?: string) => ["demo-quote", eventId] as const,
  broker: ["broker"] as const,
  settle: (id?: string) => ["settle", id] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: qk.health,
    queryFn: huskApi.health,
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useCalendar() {
  return useQuery({
    queryKey: qk.calendar,
    queryFn: huskApi.calendar,
    staleTime: 60_000,
  });
}

export function useHoldings(wallet?: Address) {
  return useQuery({
    queryKey: qk.holdings(wallet),
    queryFn: () => huskApi.holdings(wallet!),
    enabled: !!wallet,
  });
}

export function useCoverages(wallet?: Address) {
  return useQuery({
    queryKey: qk.coverages(wallet),
    queryFn: () => huskApi.coverages(wallet!),
    enabled: !!wallet,
    refetchInterval: (q) => {
      const rows = q.state.data?.coverages ?? [];
      const pending = rows.some((r) => r.status === "rfq_open" || r.status === "awaiting_signature");
      return pending ? 5_000 : 20_000;
    },
  });
}

export function useQuote(id?: string, refetchWhileOpen = false) {
  return useQuery({
    queryKey: qk.quote(id),
    queryFn: () => huskApi.getQuote(id!),
    enabled: !!id,
    refetchInterval: refetchWhileOpen ? 45_000 : false,
  });
}

export function useCoverageQuotes(quoteIds: (string | null)[]) {
  const ids = [...new Set(quoteIds.filter((id): id is string => !!id))];
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: qk.quote(id),
      queryFn: () => huskApi.getQuote(id),
      staleTime: 30_000,
      retry: 1,
    })),
  });
  const quotes = Object.fromEntries(
    results.flatMap((r) => (r.data?.quote ? [[r.data.quote.id, r.data.quote] as const] : [])),
  );
  return { quotes, isLoading: results.some((r) => r.isLoading) };
}

export function useDemoQuote(eventId?: string, enabled = false) {
  return useQuery({
    queryKey: qk.demoQuote(eventId),
    queryFn: () =>
      huskApi.quote({
        wallet: DEMO_WALLET,
        eventId,
        maxPremiumUsdc: 3,
        maxDrawdownPct: 10,
        coverageFraction: 1,
      }),
    enabled: enabled && !!eventId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useBrokerFees() {
  return useQuery({
    queryKey: qk.broker,
    queryFn: huskApi.brokerFees,
    staleTime: 60_000,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CoverageIntent) => huskApi.quote(body),
    onSuccess: (data) => {
      qc.setQueryData(qk.quote(data.quote.id), { ...data, status: "quoted" });
    },
  });
}

export function useCreatePlan() {
  return useMutation({
    mutationFn: (quoteId: string) => huskApi.plan(quoteId),
  });
}

export function useVerifyExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VerifyBody) => huskApi.verify(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: qk.coverages(vars.wallet) });
    },
  });
}

export function useSettlePlan(coverageId?: string, enabled = false) {
  return useQuery({
    queryKey: qk.settle(coverageId),
    queryFn: () => huskApi.settlePlan(coverageId!),
    enabled: !!coverageId && enabled,
    refetchInterval: (q) => {
      if (q.state.data?.settleCall || q.state.data?.error) return false;
      return 4_000;
    },
  });
}

export function useCustomEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomEventBody) => huskApi.createCustomEvent(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.calendar });
    },
  });
}

export function useAgentTurn() {
  return useMutation({
    mutationFn: (body: { wallet: Address; utterance: string; threadId?: string }) => huskApi.agentTurn(body),
  });
}

export function useAgentAuto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentAutoBody) => huskApi.agentAuto(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: qk.coverages(vars.wallet) });
    },
  });
}
