import { getReadClient } from '../thetanuts/client.js';
import { generate0800Grid } from './spanEvent.js';

export async function liveBookExpiries(): Promise<number[]> {
  try {
    const orders = await getReadClient().api.fetchOrders();
    const set = new Set<number>();
    for (const o of orders) {
      const exp = Number(o.order.expiry);
      if (Number.isFinite(exp) && exp > 0) set.add(exp);
    }
    return [...set];
  } catch {
    return [];
  }
}

export async function settlementGrid(nowUnix = Math.floor(Date.now() / 1000)): Promise<number[]> {
  const book = await liveBookExpiries();
  const daily = generate0800Grid(nowUnix, 14);
  return [...new Set([...book, ...daily])].sort((a, b) => a - b);
}
