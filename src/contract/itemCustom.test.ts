import { describe, expect, it } from 'vitest';
import { calcItemPrice, formatItemCustomName, parseAddons, parseVariants } from './itemCustom';

describe('itemCustom', () => {
  it('parses valid variants JSON', () => {
    const raw = JSON.stringify([
      { id: '1', name: 'Half', price: 6000 },
      { id: '2', name: 'Full', price: 10000 },
    ]);
    const res = parseVariants({ variants: raw });
    expect(res).toHaveLength(2);
    expect(res[0]?.name).toBe('Half');
    expect(res[0]?.price).toBe(6000);
  });

  it('handles invalid or empty variants JSON gracefully', () => {
    expect(parseVariants({ variants: '' })).toEqual([]);
    expect(parseVariants({ variants: 'bad json' })).toEqual([]);
    expect(parseVariants({ variants: '{}' })).toEqual([]);
  });

  it('parses valid addons JSON', () => {
    const raw = JSON.stringify([
      { id: 'a1', name: 'Extra Cheese', price: 2000 },
      { id: 'a2', name: 'Mayo', price: 1000 },
    ]);
    const res = parseAddons({ addons: raw });
    expect(res).toHaveLength(2);
    expect(res[0]?.name).toBe('Extra Cheese');
    expect(res[1]?.price).toBe(1000);
  });

  it('calculates custom item price with variant, addons, and discount', () => {
    const base = 5000; // ₹50
    const variant = { id: 'v1', name: 'Large', price: 8000 }; // ₹80
    const addons = [{ id: 'a1', name: 'Cheese', price: 2000 }]; // ₹20
    // Total sub = 8000 + 2000 = 10000 (₹100). 10% off = 1000 -> 9000
    const finalPrice = calcItemPrice(base, variant, addons, 10);
    expect(finalPrice).toBe(9000);
  });

  it('formats custom item name clearly', () => {
    const name = formatItemCustomName(
      'Burger',
      { id: '1', name: 'Large', price: 12000 },
      [{ id: 'a1', name: 'Extra Cheese', price: 2000 }, { id: 'a2', name: 'Mayo', price: 1000 }]
    );
    expect(name).toBe('Burger (Large) + Extra Cheese, Mayo');
  });
});
