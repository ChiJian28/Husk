import { z } from 'zod';

export const AssetSchema = z.enum(['ETH', 'BTC']);
export type Asset = z.infer<typeof AssetSchema>;

export const StructureSchema = z.enum(['PUT_SPREAD', 'PUT']);
export type Structure = z.infer<typeof StructureSchema>;

export const RouteSchema = z.enum(['OPTIONBOOK', 'RFQ']);
export type Route = z.infer<typeof RouteSchema>;

export const QuoteStatusSchema = z.enum([
  'quoted',
  'awaiting_signature',
  'rfq_open',
  'active',
  'expired_unpaid',
  'expired_paid',
  'cancelled',
  'failed',
]);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  source: z.enum(['thetanuts_calendar', 'supplement', 'custom']),
  name: z.string(),
  category: z.enum(['macro', 'crypto_expiry', 'custom']),
  importance: z.enum(['high', 'medium', 'low']),
  assets: z.array(AssetSchema),
  tsUtc: z.string(),
  tsPrecision: z.enum(['datetime', 'date_only']),
  officialThesis: z.string().optional(),
  stale: z.boolean(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CoverageIntentSchema = z.object({
  wallet: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((s) => s.toLowerCase() as `0x${string}`),
  asset: AssetSchema.default('ETH'),
  eventId: z.string().optional(),
  customWindowEndUtc: z.string().optional(),
  maxDrawdownPct: z.coerce.number().positive().max(80).default(10),
  coverageFraction: z.coerce.number().min(0).max(1).default(1),
  maxPremiumUsdc: z.coerce.number().positive().max(10_000).default(3),
  structurePreference: StructureSchema.optional(),
  allowStack: z.boolean().optional(),
});
export type CoverageIntent = z.infer<typeof CoverageIntentSchema>;

export const PayoffPointSchema = z.object({
  price: z.string(),
  bagAloneUsd: z.string(),
  bagPlusPolicyUsd: z.string(),
});

export const PolicyQuoteSchema = z.object({
  id: z.string(),
  intent: CoverageIntentSchema,
  event: CalendarEventSchema,
  spot: z.object({ source: z.string(), price: z.number(), asOf: z.string() }),
  bag: z.object({
    eth: z.string(),
    weth: z.string(),
    cbbtc: z.string(),
    usdc: z.string(),
    protectedNotionalAsset: z.string(),
  }),
  structure: StructureSchema,
  strikesUsd: z.array(z.number()),
  strikesChain: z.array(z.string()),
  expiryUnix: z.number(),
  expiryIso: z.string(),
  expiryReason: z.string(),
  numContractsHuman: z.string(),
  numContractsChain: z.string(),
  premiumUsdc: z.string(),
  brokerFeeUsdc: z.string(),
  totalDebitUsdc: z.string(),
  deductiblePct: z.number(),
  maxPayoutUsdc: z.string(),
  maxLossUsdc: z.string(),
  route: RouteSchema,
  bookOrderRef: z.unknown().optional(),
  rfqRequest: z.unknown().optional(),
  payoff: z.array(PayoffPointSchema),
  dryRun: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()),
  copy: z.object({
    userSentence: z.string(),
    settlement: z.literal('Chainlink TWAP'),
  }),
  createdAt: z.string(),
  existingCoverageId: z.string().optional(),
});
export type PolicyQuote = z.infer<typeof PolicyQuoteSchema>;

export const UnsignedCallSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/) as z.ZodType<`0x${string}`>,
  data: z.string().regex(/^0x[a-fA-F0-9]*$/) as z.ZodType<`0x${string}`>,
  value: z.string(),
  description: z.string(),
});
export type UnsignedCall = z.infer<typeof UnsignedCallSchema>;

export const ExecutionPlanSchema = z.object({
  quoteId: z.string(),
  calls: z.array(UnsignedCallSchema),
  spender: z.string().regex(/^0x[a-fA-F0-9]{40}$/) as z.ZodType<`0x${string}`>,
  approveAmountUsdc: z.string(),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

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
  optionType: 'PUT';
  lowerStrike: number;
  upperStrike: number;
  strike: number;
  expiry: number;
  numContracts: number;
  isLong: true;
  offerDeadlineMinutes: number;
  collateralToken: 'USDC';
  reservePrice: number;
  referralId?: string;
};
