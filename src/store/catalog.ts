// Menu items, stock and payees (F-07 F-08 F-15). Names are typed in the app, never shipped in the repo.
import { CONFIG } from '../config';
import type { ItemFields } from '../contract';
import type { Core, Log } from './core';
import { isUpiId } from './rules/upi';
import * as amounts from './rules/amounts';

export type ItemDraft = Pick<ItemFields, 'name' | 'price' | 'swatch' | 'category' | 'stationId'> & {
  count: number | null;
  unit?: string | undefined;
  secondaryUnit?: string | undefined;
  unitMultiplier?: number | undefined;
  discountPct?: number | undefined;
  variants?: string | undefined;
  addons?: string | undefined;
};

function itemActions(core: Core, log: Log) {
  const st = () => core.get();
  return {
    /** Add or edit an item. Returns an error message or null. */
    saveItem(itemId: string | null, d: ItemDraft): string | null {
      const name = d.name.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars);
      if (!name) return 'Give the item a name';
      if (!Number.isSafeInteger(d.price) || d.price < 0 || d.price > CONFIG.limits.moneyMaxPaise) return 'Check the price';
      if (d.count !== null && (!Number.isSafeInteger(d.count) || d.count < 0)) return 'Stock must be 0 or more';
      const items = Object.values(st().folded.items).filter((i) => !i.removed);
      if (!itemId && items.length >= CONFIG.limits.itemsMax) return 'The menu is full';
      const order = itemId ? undefined : items.reduce((m, i) => Math.max(m, i.order), 0) + 1;
      const id = itemId ?? core.env.makeId();
      const swatch = Math.abs(Math.trunc(d.swatch)) % CONFIG.swatchCount;
      log.dispatch('item.set', {
        itemId: id,
        fields: {
          name, price: d.price, swatch, category: d.category.trim(), stationId: d.stationId, count: d.count,
          unit: d.unit ?? '',
          secondaryUnit: d.secondaryUnit ?? '',
          unitMultiplier: d.unitMultiplier ?? 1,
          discountPct: d.discountPct ?? 0,
          variants: d.variants ?? '',
          addons: d.addons ?? '',
          ...(order === undefined ? {} : { order, lowAt: CONFIG.stock.lowAtDefault }),
        },
      });
      return null;
    },
    removeItem(itemId: string) { log.dispatch('item.set', { itemId, fields: { removed: true } }); },
    /** F-08 press-and-hold panel: −/+ (never below 0) and Mark sold out. */
    adjustStock(itemId: string, delta: number) {
      const it = st().folded.items[itemId];
      if (!it) return;
      if (it.count === null) { if (delta > 0) log.dispatch('item.set', { itemId, fields: { count: Math.trunc(delta), soldOut: false } }); return; }
      if (it.count + delta < 0) return;
      log.dispatch('stock.adjust', { itemId, delta: Math.trunc(delta), reason: 'panel' });
      if (it.soldOut && it.count + delta > 0) log.dispatch('item.set', { itemId, fields: { soldOut: false } });
    },
    setSoldOut(itemId: string, soldOut: boolean) { log.dispatch('item.set', { itemId, fields: { soldOut } }); },
  };
}

/** P-3 A / PK-6 A: edit a category or station by id (a virtual one becomes a record with the same id; rename keeps it). */
function recordActions(log: Log) {
  const name = (t: string) => t.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars);
  return {
    setCategory(id: string, f: { name?: string; sortOrder?: number; defaultStation?: string; defaultSwatch?: number }, removed = false): string | null {
      const fields: Record<string, string | number> = {};
      if (f.name !== undefined) { if (!name(f.name)) return 'Give the category a name'; fields.name = name(f.name); }
      if (f.sortOrder !== undefined) fields.sort_order = Math.trunc(f.sortOrder);
      if (f.defaultStation !== undefined) fields.default_station = f.defaultStation;
      if (f.defaultSwatch !== undefined) fields.default_swatch = Math.abs(Math.trunc(f.defaultSwatch)) % CONFIG.swatchCount;
      log.dispatch('record.set', { table: 'category', id, fields, removed });
      return null;
    },
    setStation(id: string, f: { name?: string; icon?: string; colour?: string; sortOrder?: number }, removed = false): string | null {
      const fields: Record<string, string | number> = {};
      if (f.name !== undefined) { if (!name(f.name)) return 'Give the station a name'; fields.name = name(f.name); }
      if (f.icon !== undefined) fields.icon = f.icon.slice(0, 8);
      if (f.colour !== undefined) fields.colour = f.colour.slice(0, 20);
      if (f.sortOrder !== undefined) fields.sort_order = Math.trunc(f.sortOrder);
      log.dispatch('record.set', { table: 'station', id, fields, removed });
      return null;
    },
    /** P-13 day note (id = dayId; text and tags). */
    setDayNote(dayId: string, text: string, tags: string) {
      log.dispatch('record.set', { table: 'day_note', id: dayId, fields: { text: text.trim().slice(0, CONFIG.limits.recordTextMax), tags: tags.trim().slice(0, CONFIG.limits.noteMaxChars) }, removed: false });
    },
  };
}

/** F-15 UPI IDs and shared settings. */
function payeeActions(core: Core, log: Log) {
  const st = () => core.get();
  return {
    savePayee(payeeId: string | null, name: string, upiId: string): string | null {
      const n = name.trim().slice(0, CONFIG.limits.nameMaxChars);
      const u = upiId.trim().slice(0, CONFIG.limits.upiIdMaxChars);
      if (!n) return 'Add a name';
      if (!isUpiId(u)) return 'That does not look like a UPI ID (name@bank)';
      if (!payeeId && Object.keys(st().folded.payees).length >= CONFIG.limits.payeesMax) return 'Too many UPI IDs';
      log.dispatch('payee.set', { payeeId: payeeId ?? core.env.makeId(), name: n, upiId: u, removed: false });
      return null;
    },
    /** Shared stall settings (stall name, event name, printer branding). Trimmed and length-capped. */
    setSetting(key: string, value: string) { log.dispatch('setting.set', { key, value: value.trim().replace(/\s+/g, ' ').slice(0, CONFIG.limits.nameMaxChars) }); },
    /** F-45 tip choices / round-off steps for every phone: text in rupees; returns an error line or null. */
    setAmounts(key: amounts.AmountsKey, text: string): string | null {
      const r = amounts.parseRupees(text, key);
      if ('error' in r) return r.error;
      log.dispatch('setting.set', { key, value: r.ok.join(',') });
      return null;
    },
    removePayee(payeeId: string) {
      const p = st().folded.payees[payeeId];
      if (p) log.dispatch('payee.set', { payeeId, name: p.name, upiId: p.upiId, removed: true });
    },
  };
}

export function catalogActions(core: Core, log: Log) { return { ...itemActions(core, log), ...payeeActions(core, log), ...recordActions(log) }; }
