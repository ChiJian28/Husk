import axios, { type AxiosError } from "axios";
import { API_URL } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import type {
  Address,
  AgentAutoBody,
  AgentAutoResponse,
  AgentTurnBody,
  AgentTurnResponse,
  BrokerFeesResponse,
  BriefResponse,
  CalendarResponse,
  CoverageIntent,
  CoverageListResponse,
  CustomEventBody,
  CustomEventResponse,
  HoldingsResponse,
  PlanResponse,
  QuoteGetResponse,
  QuoteResponse,
  QuoteStressResponse,
  ReadyHealthResponse,
  SettlePlanResponse,
  CancelPlanResponse,
  VerifyBody,
  VerifyResponse,
} from "@/lib/types";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});

function throwApi(err: AxiosError<{ requestId?: string; error?: { code: string; message: string } }>): never {
  const data = err.response?.data;
  if (data?.error) {
    throw new ApiError(data.error.code, data.error.message, err.response?.status ?? 500, data.requestId);
  }
  throw new ApiError("NETWORK", err.message || "Network error", err.response?.status ?? 0);
}

api.interceptors.response.use(
  (res) => {
    const body = res.data as { error?: { code: string; message: string }; requestId?: string };
    if (body && typeof body === "object" && body.error) {
      throw new ApiError(body.error.code, body.error.message, res.status, body.requestId);
    }
    return res;
  },
  (err: AxiosError<{ requestId?: string; error?: { code: string; message: string } }>) => {
    throwApi(err);
  },
);

export const huskApi = {
  health: async () => (await api.get<ReadyHealthResponse>("/v1/health")).data,
  calendar: async () => (await api.get<CalendarResponse>("/v1/calendar")).data,
  createCustomEvent: async (body: CustomEventBody) =>
    (await api.post<CustomEventResponse>("/v1/calendar/custom", body)).data,
  holdings: async (wallet: Address) => (await api.get<HoldingsResponse>(`/v1/holdings/${wallet}`)).data,
  brief: async (wallet: Address) => (await api.get<BriefResponse>(`/v1/brief/${wallet}`)).data,
  quote: async (body: CoverageIntent) => (await api.post<QuoteResponse>("/v1/quotes", body)).data,
  getQuote: async (id: string) => (await api.get<QuoteGetResponse>(`/v1/quotes/${id}`)).data,
  quoteStress: async (id: string, drawdownPct?: number) =>
    (
      await api.get<QuoteStressResponse>(`/v1/quotes/${id}/stress`, {
        params: drawdownPct !== undefined ? { drawdownPct } : undefined,
      })
    ).data,
  plan: async (id: string) => (await api.post<PlanResponse>(`/v1/quotes/${id}/plan`)).data,
  agentTurn: async (body: AgentTurnBody) => (await api.post<AgentTurnResponse>("/v1/agent/turn", body)).data,
  agentAuto: async (body: AgentAutoBody) => (await api.post<AgentAutoResponse>("/v1/agent/autonomous", body)).data,
  verify: async (body: VerifyBody) => (await api.post<VerifyResponse>("/v1/executions/verify", body)).data,
  coverages: async (wallet: Address) => (await api.get<CoverageListResponse>(`/v1/coverages/${wallet}`)).data,
  settlePlan: async (coverageId: string) =>
    (await api.post<SettlePlanResponse>(`/v1/coverages/${coverageId}/settle-plan`)).data,
  cancelPlan: async (coverageId: string) =>
    (await api.post<CancelPlanResponse>(`/v1/coverages/${coverageId}/cancel-plan`)).data,
  brokerFees: async () => (await api.get<BrokerFeesResponse>("/v1/fees/broker")).data,
};
