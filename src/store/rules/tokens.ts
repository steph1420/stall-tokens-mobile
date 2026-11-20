// F-13 Tokens restart per day; each Counter device draws from its own range (D-TOKEN).
import type { Order } from '../../contract';

export interface Range { readonly from: number; readonly to: number }

/** Next token in this device's range for the day; wraps to the start if the range is used up.
 * Deleted and cancelled orders release their token number back to the pool so it is immediately reused. */
export function nextToken(orders: readonly Order[], dayId: string, range: Range): number {
  let max = range.from - 1;
  const used = new Set<number>();
  const released = new Set<number>();

  for (const o of orders) {
    if (o.dayId !== dayId || o.token < range.from || o.token > range.to) continue;
    if (o.deleted || o.cancel) {
      released.add(o.token);
    } else {
      used.add(o.token);
      max = Math.max(max, o.token);
    }
  }

  for (const t of used) released.delete(t);
  if (released.size > 0) {
    const min = Math.min(...released);
    if (min >= range.from && min <= range.to) return min;
  }

  return max + 1 > range.to ? range.from : max + 1;
}

export const formatToken = (t: number, pad: number): string => `#${String(t).padStart(pad, '0')}`;
