export type Address = `0x${string}`;
export type TxHash = `0x${string}`;
export type HexData = `0x${string}`;
export type Iso8601 = string;
export type DecimalString = string;

export type Ok<T extends object> = { requestId: string } & T;

export type Err = {
  requestId: string;
  error: { code: string; message: string };
};

export type Asset = "ETH" | "BTC";
export type Structure = "PUT_SPREAD" | "PUT";
export type Route = "OPTIONBOOK" | "RFQ";

export type QuoteStatus =
  | "quoted"
  | "awaiting_signature"
  | "rfq_open"
  | "active"
  | "expired_unpaid"
  | "expired_paid"
  | "cancelled"
  | "failed";

export type CalendarEvent = {
  id: string;
  source: "thetanuts_calendar" | "supplement" | "custom";
  name: string;
  category: "macro" | "crypto_expiry" | "custom";
  importance: "high" | "medium" | "low";
  assets: Asset[];
  tsUtc: Iso8601;
  tsPrecision: "datetime" | "date_only";
  stale: boolean;
};

export type CalendarFreshness = {
  stale: boolean;
  lastFetchedAt?: Iso8601;
  lastError?: string;
};

export type CoverageIntent = {
  wallet: Address;
  asset?: Asset;
  eventId?: string;
  customWindowEndUtc?: Iso8601;
  maxDrawdownPct?: number;
  coverageFraction?: number;
  maxPremiumUsdc?: number;
  structurePreference?: Structure;
  allowStack?: boolean;
};

export type PayoffPoint = {
  price: DecimalString;
  bagAloneUsd: DecimalString;
  bagPlusPolicyUsd: DecimalString;
};

export type BookOrderRef = {
  nonce: string;
  maker: string;
  expiry: number;
  implementation: string;
  implName: string;
  strikes: string[];
  price: string;
  availableAmount: string;
};

export type RfqBuildSnapshot = {
  underlying: Asset;
  optionType: "PUT";
  lowerStrike: number;
  upperStrike: number;
  strike: number;
  expiry: number;
  numContracts: number;
  isLong: true;
  offerDeadlineMinutes: number;
  collateralToken: "USDC";
  reservePrice: number;
  referralId?: string;
};

export type PolicyQuote = {
  id: string;
  intent: CoverageIntent;
  event: CalendarEvent;
  spot: { source: string; price: number; asOf: Iso8601 };
  bag: {
    eth: DecimalString;
    weth: DecimalString;
    cbbtc: DecimalString;
    usdc: DecimalString;
    protectedNotionalAsset: DecimalString;
  };
  structure: Structure;
  strikesUsd: number[];
  strikesChain: string[];
  expiryUnix: number;
  expiryIso: Iso8601;
  expiryReason: string;
  numContractsHuman: DecimalString;
  numContractsChain: string;
  premiumUsdc: DecimalString;
  brokerFeeUsdc: DecimalString;
  totalDebitUsdc: DecimalString;
  deductiblePct: number;
  maxPayoutUsdc: DecimalString;
  maxLossUsdc: DecimalString;
  route: Route;
  bookOrderRef?: BookOrderRef;
  rfqRequest?: RfqBuildSnapshot;
  payoff: PayoffPoint[];
  dryRun: Record<string, unknown>;
  warnings: string[];
  copy: {
    userSentence: string;
    settlement: "Chainlink TWAP";
  };
  createdAt: Iso8601;
  existingCoverageId?: string;
};

export type UnsignedCall = {
  to: Address;
  data: HexData;
  value: DecimalString;
  description: string;
};

export type ExecutionPlan = {
  quoteId: string;
  calls: UnsignedCall[];
  spender: Address;
  approveAmountUsdc: DecimalString;
};

export type CoverageRow = {
  id: string;
  quote_id: string | null;
  wallet: string;
  asset: string;
  event_id: string | null;
  status: QuoteStatus;
  route: Route;
  structure: Structure;
  option_address: string | null;
  quotation_id: string | null;
  open_tx: string | null;
  settle_tx: string | null;
  payout_tx: string | null;
  premium_usdc_onchain: string | null;
  broker_fee_usdc: string | null;
  max_payout_usdc: string | null;
  expiry_unix: number;
  verified: boolean;
  created_at: Iso8601;
  updated_at: Iso8601;
};

export type FillVerification =
  | {
      ok: true;
      kind: "book_fill";
      route: "OPTIONBOOK";
      optionAddress: string;
      buyer: string;
      premiumUsdc: DecimalString;
    }
  | {
      ok: true;
      kind: "rfq_requested";
      route: "RFQ";
      quotationId: string;
      buyer: string;
      premiumUsdc: DecimalString;
    }
  | {
      ok: true;
      kind: "rfq_settled";
      route: "RFQ";
      quotationId: string;
      optionAddress: string;
      buyer: string;
      premiumUsdc: DecimalString;
    };

export type WatchRfqResult = {
  offers: number;
  settled?: boolean;
  settleCall?: UnsignedCall;
  offeror?: string;
  offerAmountUsdc?: DecimalString;
  rejectedAboveReserve?: { offeror: string; offerAmountUsdc: DecimalString }[];
  error?: string;
};

export type PingResponse = Ok<{ ok: true; pong: true }>;
export type LiveHealthResponse = Ok<{ ok: true; status: "live" }>;

export type ReadyHealthResponse = Ok<{
  ok: true;
  chainId: 8453;
  encodeOnly: boolean;
  block: number | null;
  ethPrice: number | null;
  orderCount: number | null;
  rpcError?: string;
  supabase: { ok: boolean; error?: string };
  calendar: CalendarFreshness;
}>;

export type CalendarResponse = Ok<{
  events: CalendarEvent[];
  freshness: CalendarFreshness;
}>;

export type CalendarSyncResponse = Ok<{ events: CalendarEvent[]; stale: boolean }>;

export type CustomEventBody = {
  name: string;
  tsUtc: Iso8601;
  assets?: Asset[];
};

export type CustomEventResponse = Ok<{ event: CalendarEvent }>;

export type HoldingsResponse = Ok<{
  wallet: string;
  eth: DecimalString;
  weth: DecimalString;
  cbbtc: DecimalString;
  usdc: DecimalString;
  ethBag: DecimalString;
  chain: {
    ethWei: string;
    wethWei: string;
    cbbtc: string;
    usdc: string;
  };
}>;

export type QuoteBody = CoverageIntent;
export type QuoteResponse = Ok<{ quote: PolicyQuote }>;
export type QuoteGetResponse = Ok<{ quote: PolicyQuote; status: QuoteStatus }>;
export type PlanResponse = Ok<{ plan: ExecutionPlan }>;

export type AgentTurnBody = {
  wallet: Address;
  utterance: string;
  threadId?: string;
};

export type AgentTurnResponse = Ok<{
  refusal?: string;
  clarify?: string;
  quote?: PolicyQuote;
  plan?: ExecutionPlan;
  userSentence?: string;
  langsmithUrl?: string;
  langsmithRunId?: string;
}>;

export type AgentAutoBody = {
  wallet: Address;
  utterance: string;
  maxNotionalUsdc?: number;
};

export type AgentAutoResponse = Ok<
  AgentTurnResponse & {
    hashes?: TxHash[];
    coverage?: { coverageId: string; status: string };
  }
>;

export type VerifyBody = {
  txHash: TxHash;
  quoteId: string;
  wallet: Address;
};

export type VerifyResponse = Ok<{
  coverageId: string;
  status: QuoteStatus;
  verification: FillVerification;
  next: string;
}>;

export type CoverageListResponse = Ok<{ coverages: CoverageRow[] }>;
export type SettlePlanResponse = Ok<{ coverageId: string } & WatchRfqResult>;

export type BrokerFeesResponse =
  | Ok<{ configured: false; feeBps: 0; accumulatedUsdc: "0" }>
  | Ok<{
      configured: true;
      broker: Address;
      feeBps: string;
      accumulatedUsdc: DecimalString;
      intendedBps: number;
    }>;
