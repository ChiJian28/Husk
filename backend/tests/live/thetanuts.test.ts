import { describe, expect, it } from 'vitest';
import { getReadClient } from '../../src/thetanuts/client.js';

const live = process.env.LIVE === '1';

describe.skipIf(!live)('live thetanuts', () => {
  it('calendar 200 is covered by sync; getMarketData ETH; fetchOrders', async () => {
    const client = getReadClient();
    const md = await client.api.getMarketData();
    expect(Number(md.prices?.ETH)).toBeGreaterThan(0);
    const orders = await client.api.fetchOrders();
    expect(orders.length).toBeGreaterThanOrEqual(0);
    const put = orders.find((o) => {
      const impl = o.rawApiData?.implementation?.toLowerCase() ?? '';
      const name = client.chainConfig.optionImplementations[impl]?.name;
      return name === 'PUT' || name === 'PUT_SPREAD';
    });
    if (put) {
      const preview = client.optionBook.previewFillOrder(put, 1_000000n);
      expect(preview.totalCollateral).toBeGreaterThan(0n);
    }
  });
});
