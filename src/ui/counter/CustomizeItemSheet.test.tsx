import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoreProvider } from '../../store';
import { makeTestStore } from '../../store/testkit';
import { CustomizeItemSheet } from './CustomizeItemSheet';

afterEach(cleanup);

describe('CustomizeItemSheet', () => {
  it('allows picking variant, toggling addons, and adds custom line to order', async () => {
    const { store } = makeTestStore();
    await store.getState().start();
    const s = () => store.getState();

    const variants = JSON.stringify([
      { id: 'v1', name: 'Regular', price: 5000 },
      { id: 'v2', name: 'Large', price: 8000 },
    ]);
    const addons = JSON.stringify([
      { id: 'a1', name: 'Extra Cheese', price: 2000 },
    ]);

    s().catalog.saveItem(null, {
      name: 'Burger',
      price: 5000,
      swatch: 0,
      category: 'Food',
      stationId: 'kitchen',
      count: null,
      variants,
      addons,
      discountPct: 10,
    });

    const burger = Object.values(s().folded.items).find((i) => i.name === 'Burger');
    expect(burger).toBeDefined();
    if (!burger) return;

    act(() => {
      s().counter.newOrder();
    });

    const onClose = vi.fn();

    render(
      <StoreProvider store={store}>
        <CustomizeItemSheet itemId={burger.id} onClose={onClose} />
      </StoreProvider>
    );

    expect(screen.getByText('Burger')).toBeDefined();
    expect(screen.getByText('Regular')).toBeDefined();
    expect(screen.getByText('Large')).toBeDefined();
    expect(screen.getByText('Extra Cheese')).toBeDefined();

    // Select Large variant
    fireEvent.click(screen.getByText('Large'));

    // Toggle Extra Cheese addon
    fireEvent.click(screen.getByText('Extra Cheese'));

    // Click Add to order
    fireEvent.click(screen.getByText('Add to order'));

    expect(onClose).toHaveBeenCalled();

    const order = s().folded.orders[s().ui.orderId ?? ''];
    expect(order).toBeDefined();
    expect(order?.lines).toHaveLength(1);
    expect(order?.lines[0]?.name).toBe('Burger (Large) + Extra Cheese');
    // Price: (8000 + 2000) * 0.9 = 9000
    expect(order?.lines[0]?.price).toBe(9000);
  });
});
