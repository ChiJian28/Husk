import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getShelf } from '../calendar/service.js';
import { getHoldings } from '../holdings/service.js';
import { listActiveCoverages } from '../coverage/service.js';

/** Context tools bound on the parse model. They cannot size a policy. */
export const listEventsTool = tool(
  async () => {
    const events = await getShelf();
    return JSON.stringify(
      events.slice(0, 12).map((e) => ({
        id: e.id,
        name: e.name,
        tsUtc: e.tsUtc,
        category: e.category,
        stale: e.stale,
      })),
    );
  },
  {
    name: 'list_events',
    description: 'List the coverage calendar shelf (official + supplement). Does not size a policy.',
    schema: z.object({}),
  },
);

export const getHoldingsTool = tool(
  async ({ wallet }) => JSON.stringify(await getHoldings(wallet)),
  {
    name: 'get_holdings',
    description: 'Read ETH/WETH/cbBTC/USDC balances for a wallet on Base.',
    schema: z.object({ wallet: z.string() }),
  },
);

export const getActiveCoverageTool = tool(
  async ({ wallet, asset }) => JSON.stringify(await listActiveCoverages(wallet, asset ?? 'ETH')),
  {
    name: 'get_active_coverage',
    description: 'List active Husk coverages for a wallet and asset.',
    schema: z.object({ wallet: z.string(), asset: z.enum(['ETH', 'BTC']).optional() }),
  },
);

export const huskContextTools = [listEventsTool, getHoldingsTool, getActiveCoverageTool];
