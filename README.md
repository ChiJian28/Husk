# Husk

Event coverage for onchain bags. Connect a wallet, pick the thing that can hurt you — CPI, FOMC, an unlock — and an AI underwriter sizes a defined-risk Thetanuts put spread that expires at the next Chainlink TWAP settlement after the print. Max loss is the premium. If the bag dumps, the option pays USDC on-chain.

This repository ships **backend** (HTTP + CLI) and **frontend** (Next.js + RainbowKit on Base). The UI buy flow signs the same encoded calldata as curl/CLI.

Dual-track for MUBA x Thetanuts 2026: Best Product on the SDK + AI × Options. Without Thetanuts RFQ / put spreads / cash settlement, the product does not exist.

## Architecture

```
Wallet (UI / curl / CLI)
        │
   Hono /v1  (Zod-validated JSON)
        │
  Underwriter (deterministic TS)  ←  Gemini only parses language + explains frozen numbers
        │
  Book match ──► OptionBook fill (optional PartnerFeeBroker)
        │
        └── else RFQ ──► OptionFactory (custom expiry) ──► early settle
        │
  Supabase  (quotes, coverages, encrypted RFQ keys, calendar snapshots)
        │
  Jobs: calendar sync · RFQ offer watch · settlement keeper
```

- **Chain:** Base mainnet only (`8453`). No testnet.
- **Numbers:** SDK / chain only (`previewFillOrder`, `utils.calculatePayout`). No Black-Scholes.
- **Default structure:** long put spread. Vanilla put is a documented fallback.
- **Agent:** LangGraph. LLM cannot choose strikes. Default path returns unsigned calldata. Autonomous path is optional, cap-gated (`AGENT_MAX_NOTIONAL_USDC`), USDC-only.

## Sponsor integration 

| Thetanuts surface | Where Husk uses it |
|---|---|
| `@thetanuts-finance/thetanuts-client` | `backend/src/thetanuts/client.ts` — every market, book, RFQ, payout number |
| Calendar API `calendar.thetanuts.finance` | `backend/src/calendar/` — coverage shelf |
| OptionBook `previewFillOrder` / `encodeFillOrder` | `backend/src/router/bookMatch.ts`, `backend/src/execution/encode.ts` |
| PartnerFeeBroker (10 bps, disclosed) | `backend/src/broker/partnerFee.ts` — Book path `to = broker`, referrer = zero |
| OptionFactory `buildSpreadRFQ` / `encodeRequestForQuotation` / `encodeSettleQuotationEarly` | RFQ main path, event-aligned expiry |
| `client.utils.calculatePayout` | Policy card max payout + bag payoff series |
| Chainlink TWAP `chainConfig.twapConsumer` | Settlement copy; keeper |
| LangGraph + Gemini | `backend/src/agent/graph.ts` — underwriter persona, not a generic trader |
| Encrypted ECDH keys | `backend/src/rfq/keys.ts` — AES-256-GCM in Supabase, never in LLM transcripts |

AgentKit was **not** pulled in as a library (its Coinbase wallet tree exhausted disk on this machine). Autonomous writes use the same ethers signer + a fail-closed `assertSafetyPolicy` (`backend/src/execution/autonomous.ts`) with the official cap semantics: max notional, PUT/PUT_SPREAD only, exact approve.

## Tech stack

TypeScript, Node 20, Hono, Zod, ethers v6, Thetanuts client `^0.3.0`, Supabase, LangGraph, Gemini (`@langchain/google-genai`), LangSmith, pino, vitest.

## Quickstart

```bash
cd backend
cp .env.example .env   # already filled in this workspace
# apply SQL in supabase/migrations/0001_init.sql to the existing Supabase project
npm test
npm run dev            # http://localhost:8787
```

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8787
npm install && npm run dev         # http://localhost:3000
```

Use a non-Infura Base RPC in MetaMask (or `NEXT_PUBLIC_RPC_URL`) — RFQ `requestForQuotation` estimates ~140M gas and exceeds Infura’s 25M per-tx cap.

### curl

```bash
curl -s localhost:8787/v1/health | jq
curl -s localhost:8787/v1/calendar | jq '.events[:3]'
curl -s localhost:8787/v1/holdings/$HUSK_OPERATOR_ADDRESS | jq
curl -s -X POST localhost:8787/v1/quotes \
  -H 'content-type: application/json' \
  -d '{"wallet":"'"$HUSK_OPERATOR_ADDRESS"'","asset":"ETH","maxDrawdownPct":10,"maxPremiumUsdc":3,"coverageFraction":1}'
curl -s -X POST localhost:8787/v1/agent/turn \
  -H 'content-type: application/json' \
  -d '{"wallet":"'"$HUSK_OPERATOR_ADDRESS"'","utterance":"Cover my ETH through Friday CPI, max 3 USDC"}'
```

Cron (Bearer `CRON_SECRET`):

- `POST /v1/jobs/sync-calendar`
- `POST /v1/jobs/watch-rfqs`
- `POST /v1/jobs/settle`

Local in-process cron: `ENABLE_INPROCESS_CRON=true`.

### CLI smokes (no send)

```bash
cd backend
npx tsx src/scripts/smoke-calendar.ts
npx tsx src/scripts/smoke-quote.ts --wallet 0xYOUR --max 3
npx tsx src/scripts/smoke-rfq-dryrun.ts
```

### Real $1 RFQ (UI or CLI)

Burner holds ~0.002 ETH on Base. Official demo bar is 1–3 USDC premium.

**UI (done):** FOMC policy → Buy coverage → approve + `requestForQuotation` on Base mainnet (see Proof table). At **$1 USDC** the RFQ lands on-chain; professional MMs typically ignore sub-economic tickets — that is honest liquidity, not a product bug.

**CLI alternative:**

```bash
cd backend
npx tsx src/scripts/smoke-fill-tiny.ts --i-understand-mainnet
```

Default HTTP/agent path is encode-only. Cron jobs will not send unless `HUSK_JOBS_SEND=true`.

## Env

See `backend/.env.example`. Required to boot: RPC, Gemini, LangSmith, Supabase URL + service role + DB URL, `HUSK_ENCRYPTION_MASTER_KEY` (64 hex), `CRON_SECRET`, `CHAIN_ID=8453`. Signer key is optional (encode-only mode).

Never commit `.env`. Never log private keys or RFQ ECDH secrets.

## Proof table

Live Base mainnet. **RFQ request sent via UI** (2026-09-05, block ~50911648). Coverage is **rfq_open** — no maker offer at $1 notional (expected). Full fill (early settle → `active`) is optional stretch: OptionBook or ~$3+ RFQ.

| What | Value |
|---|---|
| Operator / burner | [`0x078c418ded28f40bb7f5c88170440fece54ced1a`](https://basescan.org/address/0x078c418ded28f40bb7f5c88170440fece54ced1a) |
| PartnerFeeBroker | [`0xb371a71c7bfc344b1aed3c3ba4c837f50d49a540`](https://basescan.org/address/0xb371a71c7bfc344b1aed3c3ba4c837f50d49a540) — on-chain `feeBps() = 10` |
| OptionBook | [`0x1bDff855d6811728acaDC00989e79143a2bdfDed`](https://basescan.org/address/0x1bDff855d6811728acaDC00989e79143a2bdfDed) (`client.chainConfig.contracts.optionBook`) |
| OptionFactory | [`0x8118daD971dEbffB49B9280047659174128A8B94`](https://basescan.org/address/0x8118daD971dEbffB49B9280047659174128A8B94) (`client.chainConfig.contracts.optionFactory`) |
| TWAP consumer | [`0xE909fb38767e0ac5F7a347DF9Dd4222217E10816`](https://basescan.org/address/0xE909fb38767e0ac5F7a347DF9Dd4222217E10816) (`client.chainConfig.twapConsumer`) |
| USDC (Base) | [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) |
| USDC approve (UI, $1 FOMC) | [`0xe341ebfcd2911bfdf36c7da50d53ffc628b61fa5118328a8f7be003b7aa13f49`](https://basescan.org/tx/0xe341ebfcd2911bfdf36c7da50d53ffc628b61fa5118328a8f7be003b7aa13f49) |
| RFQ request tx (UI, $1 FOMC) | [`0x8fe7b1f864c24e3d2f9e2713a22258a0dba8a70ecb8e914b948d60d09ebab16e`](https://basescan.org/tx/0x8fe7b1f864c24e3d2f9e2713a22258a0dba8a70ecb8e914b948d60d09ebab16e) — `requestForQuotation` |
| Coverage status | **rfq_open** — Husk sized, encoded, and broadcast correctly; MMs did not offer at $1 |
| Full fill / early settle | _optional — Book route or larger RFQ notional_ |

**Demo note:** At **$1 USDC** premium the full RFQ pipeline works on-chain (approve → Factory deposit → open quotation). Makers usually skip tickets below economic size; Husk still supports the transaction end-to-end. Pitch: “system works; liquidity is the honest constraint.”

Live read check (2026-09-01): ~368 OptionBook orders, ETH spot from SDK (~2473), official calendar schema 2 with NFP `fred:50:2026-09-04` and CPI `fred:10:2026-09-11`, broker `feeBps = 10`. Sample PolicyQuote: NFP put spread 2150/2250, expiry **2026-09-05T08:00Z** (next Chainlink TWAP **after** the print). CPI quote expiry **2026-09-12T08:00Z**.

After the RFQ request tx lands (UI or signed plan):

```bash
# 1. POST /v1/quotes  →  POST /v1/quotes/:id/plan  → sign the two calls
# 2. Attach the request tx to the quote (parses QuotationRequested → status rfq_open)
curl -s -X POST localhost:8787/v1/executions/verify \
  -H 'content-type: application/json' \
  -d '{"wallet":"0xYOUR","quoteId":"QUOTE_UUID","txHash":"0xREQUEST_TX"}'
# 3. When a maker offers, fetch unsigned early-settle calldata (does not send)
curl -s -X POST localhost:8787/v1/coverages/COVERAGE_UUID/settle-plan
# 4. After you sign settle, verify again (parses QuotationSettled → status active)
```

Jobs never broadcast unless `HUSK_JOBS_SEND=true` (default false), even when a signer key is present. The settlement keeper **observes** `isExpired` / `isSettled` / `calculatePayout`; it does not encode r12-removed `payout()`.

## Notes 

- Settlement language is **Chainlink TWAP**, not Deribit. Deribit is MM pricing / a public spot tick.
- `client.option.payout()` in SDK 0.3 throws on r12 (`INVALID_PARAMS`); there is **no user-callable settlement trigger**. The keeper records `expired_paid` / `expired_unpaid` from `isSettled` + `calculatePayout` after factory `notifyTradeSettled`.
- One professional maker is the honest liquidity picture. RFQ is the custom-expiry rail, not a fabricated auction crowd. **$1 RFQ on mainnet** ([approve](https://basescan.org/tx/0xe341ebfcd2911bfdf36c7da50d53ffc628b61fa5118328a8f7be003b7aa13f49) + [request](https://basescan.org/tx/0x8fe7b1f864c24e3d2f9e2713a22258a0dba8a70ecb8e914b948d60d09ebab16e)) proves encode + broadcast; no offer at that size is expected market behavior.
- Book revenue: PartnerFeeBroker, disclosed bps. RFQ `referralId` is attached when set; Factory fee withdraw is owner-only — we do not claim we can self-claim RFQ fees.
