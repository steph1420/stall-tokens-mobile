import { describe, expect, it } from 'vitest';
import type { Order } from '../../contract';
import { formatToken, nextToken } from './tokens';

const o = (token: number, dayId = 'd1') => ({ token, dayId }) as Order;
describe('tokens (F-13, D-TOKEN)', () => {
  const r1 = { from: 1, to: 500 };
  const r2 = { from: 501, to: 1000 };
  it('counts up per day and restarts on a new day', () => {
    expect(nextToken([], 'd1', r1)).toBe(1);
    expect(nextToken([o(1), o(2), o(46)], 'd1', r1)).toBe(47);
    expect(nextToken([o(46)], 'd2', r1)).toBe(1);
  });
  it('keeps two counters apart by range', () => {
    expect(nextToken([o(46), o(501)], 'd1', r2)).toBe(502);
    expect(nextToken([o(46), o(501)], 'd1', r1)).toBe(47);
  });
  it('wraps when a range is used up', () => { expect(nextToken([o(500)], 'd1', r1)).toBe(1); });
  it('releases token number when an order is deleted or cancelled', () => {
    const oDel = (token: number, dayId = 'd1') => ({ token, dayId, deleted: true }) as Order;
    const oCancel = (token: number, dayId = 'd1') => ({ token, dayId, cancel: { reason: 'mistake' } }) as Order;
    expect(nextToken([o(1), oDel(2)], 'd1', r1)).toBe(2);
    expect(nextToken([oDel(1)], 'd1', r1)).toBe(1);
    expect(nextToken([o(1), o(2), oDel(3)], 'd1', r1)).toBe(3);
    // Non-max order deleted releases gap
    expect(nextToken([oDel(1), o(2)], 'd1', r1)).toBe(1);
    expect(nextToken([o(1), oDel(2), o(3)], 'd1', r1)).toBe(2);
    // Cancelled order releases token
    expect(nextToken([o(1), oCancel(2)], 'd1', r1)).toBe(2);
  });
  it('pads for display', () => { expect(formatToken(47, 3)).toBe('#047'); expect(formatToken(1234, 3)).toBe('#1234'); });
});
