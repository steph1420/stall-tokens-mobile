// F-06 Menu (20-polish/menu.html p2, Mobile Redesign Bundle M1): 2-col tactile touch grid,
// whole-card tap-to-add, horizontal Category Ribbon, floating island cart dock in thumb zone.
import { useState } from 'react';
import { CONFIG } from '../../../config';
import type { Item } from '../../../contract';
import { bill, useApp, type Folded } from '../../../store';
import { buzz } from '../../kit/haptics';
import { Icon } from '../../kit/Icon';
import { usePress } from '../../kit/hold';
import { Money } from '../../kit/Money';
import s from './Menu.module.css';

function stockLabel(it: Item, left: number): { text: string; tone: 'quiet' | 'low' | 'out' } | null {
  if (it.soldOut || (it.count !== null && left <= 0)) return { text: 'Sold out', tone: 'out' };
  if (it.count === null) return null;
  return { text: `${String(Math.max(0, left))} left`, tone: left <= it.lowAt ? 'low' : 'quiet' };
}

function CardStepper({ name, qty, onInc, onDec }: { name: string; qty: number; onInc: () => void; onDec: () => void }) {
  if (qty <= 0) return null;
  return (
    <div className={s.qty}>
      <button type="button" className={s.qb} aria-label={`One less ${name}`} onClick={(e) => { e.stopPropagation(); onDec(); }}>−</button>
      <span className={s.qn} aria-live="polite">{qty}</span>
      <button type="button" className={s.qb} aria-label={`One more ${name}`} onClick={(e) => { e.stopPropagation(); onInc(); }}>+</button>
    </div>
  );
}

function useCardPress(it: Item, hasCustom: boolean) {
  const c = useApp((st) => st.counter);
  const haptics = useApp((st) => st.prefs.haptics);
  const openSheet = useApp((st) => st.openSheet);
  return usePress(
    () => {
      buzz(haptics, 'tap');
      if (hasCustom) openSheet({ kind: 'customizeItem', itemId: it.id });
      else c.addItem(it.id);
    },
    () => { buzz(haptics, 'hold'); openSheet({ kind: 'stock', itemId: it.id }); }
  );
}

function CardMid({ it, badge, note, hasCustom }: { it: Item; badge: ReturnType<typeof stockLabel>; note: string; hasCustom: boolean }) {
  return (
    <div className={s.cardMid}>
      <div className={s.priceRow}>
        <Money p={it.price} className={s.price} />
        {it.discountPct > 0 ? <span className={s.discBadge}>{`${String(it.discountPct)}% off`}</span> : null}
        {hasCustom ? <span className={s.optTag}>Options ›</span> : null}
      </div>
      {badge ? <div className={badge.tone === 'low' ? s.stockLow : badge.tone === 'out' ? s.stockOut : s.stock}>{badge.text}</div> : null}
      {note ? <div className={s.snippet}>{note}</div> : null}
    </div>
  );
}

function Card({ it }: { it: Item }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const lines = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId]?.lines : undefined)) ?? [];
  const mine = lines.filter((l) => l.itemId === it.id);
  const qty = mine.reduce((n, l) => n + l.qty, 0);
  const note = [...mine].reverse().find((l) => l.status === 'draft' && l.note)?.note ?? mine.find((l) => l.note)?.note ?? '';
  const left = useApp((st) => (it.count === null ? Number.POSITIVE_INFINITY : st.counter.available(it.id)));
  const badge = stockLabel(it, left);
  const hasCustom = Boolean((it.variants && it.variants !== '[]' && it.variants.trim() !== '') || (it.addons && it.addons !== '[]' && it.addons.trim() !== ''));
  const press = useCardPress(it, hasCustom);
  const noteLine = [...mine].reverse().find((l) => l.status === 'draft') ?? mine[mine.length - 1];
  const cls = [s.card, qty > 0 ? s.isIn : '', badge?.tone === 'out' ? s.isOut : ''].join(' ');

  return (
    <article className={cls} style={{ '--item-accent': `var(--dl-stall-swatch-${String(it.swatch)})` } as React.CSSProperties}>
      <div role="button" tabIndex={0} className={s.hit} aria-label={`${it.name}, add one${badge ? `, ${badge.text}` : ''}`} {...press} />
      <span className={s.accent} />
      <div className={s.cardTop}>
        <div className={s.name}>{it.name}{it.unit ? <span className={s.unitTag}>{`/${it.unit}`}</span> : null}</div>
        {qty > 0 ? <span className={s.badgePill} aria-label={`${String(qty)} added`}>{qty}</span> : null}
      </div>
      <CardMid it={it} badge={badge} note={note} hasCustom={hasCustom} />
      {qty > 0 && noteLine ? (
        <button type="button" className={note ? s.pencilHas : s.pencil} aria-label={note ? 'Edit note' : 'Add note'}
          onClick={(e) => { e.stopPropagation(); openSheet({ kind: 'lineNote', lineId: noteLine.lineId }); }}><Icon name="pencil" /></button>
      ) : null}
      <CardStepper name={it.name} qty={qty} onInc={() => { if (hasCustom) openSheet({ kind: 'customizeItem', itemId: it.id }); else c.addItem(it.id); }} onDec={() => { c.removeItem(it.id); }} />
    </article>
  );
}

type Sort = 'menu' | 'az' | 'sold';
const matches = (i: Item, q: string) => { const t = q.trim().toLowerCase(); return !t || i.name.toLowerCase().includes(t) || i.category.toLowerCase().includes(t); };

/** F-57 P2 menu sort: the stall's own order, A to Z, or most sold on the current day. */
function sortItems(items: Item[], sort: Sort, f: Folded): Item[] {
  const byMenu = (a: Item, b: Item) => a.order - b.order || a.name.localeCompare(b.name);
  if (sort === 'az') return [...items].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'menu') return [...items].sort(byMenu);
  const day = f.days[f.days.length - 1]?.id;
  const sold = new Map<string, number>();
  for (const o of Object.values(f.orders)) if (o.dayId === day && !o.deleted && !o.cancel) for (const l of o.lines) sold.set(l.itemId, (sold.get(l.itemId) ?? 0) + l.qty);
  return [...items].sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0) || byMenu(a, b));
}

function CategoryRibbon({ categories, cat, onSelect, showTool, onToggleTool }: {
  categories: readonly string[]; cat: string; onSelect: (c: string) => void; showTool: boolean; onToggleTool: () => void;
}) {
  return (
    <div className={s.ribbonRow}>
      {categories.length > 0 ? (
        <div className={s.ribbon} role="tablist" aria-label="Categories">
          <button type="button" role="tab" aria-selected={cat === 'all'} className={cat === 'all' ? s.pillOn : s.pill} onClick={() => { onSelect('all'); }}>All</button>
          {categories.map((cName) => (
            <button type="button" key={cName} role="tab" aria-selected={cat === cName} className={cat === cName ? s.pillOn : s.pill} onClick={() => { onSelect(cName); }}>{cName}</button>
          ))}
        </div>
      ) : null}
      {showTool ? (
        <button type="button" className={s.toolBtn} aria-label="Toggle search and sort" onClick={onToggleTool}><Icon name="more" /></button>
      ) : null}
    </div>
  );
}

function SearchTools({ q, onQ, sort, onSort }: { q: string; onQ: (v: string) => void; sort: Sort; onSort: (v: Sort) => void }) {
  return (
    <div className={s.tools}>
      <input className={s.search} type="search" value={q} placeholder="Find an item" aria-label="Find an item" onChange={(e) => { onQ(e.target.value); }} />
      <select className={s.sort} value={sort} aria-label="Sort the menu" onChange={(e) => { onSort(e.target.value as Sort); }}>
        <option value="menu">Menu order</option><option value="az">A to Z</option><option value="sold">Most sold today</option>
      </select>
    </div>
  );
}

function CartDock({ subtotal, count, onBilling, orderNote, onOrderNote }: {
  subtotal: number; count: number; onBilling: () => void; orderNote: string; onOrderNote: () => void;
}) {
  return (
    <footer className={s.bar}>
      <button type="button" className={orderNote ? s.notePillHas : s.notePill} onClick={onOrderNote} aria-label={orderNote ? `Order note: ${orderNote}` : 'Add order note'}>
        <Icon name="note" />
        <span>{orderNote || 'Order note'}</span>
      </button>
      <div className={s.meta}>
        <Money p={subtotal} className={s.total} />
        <span className={s.count}>{`· ${String(count)} ${count === 1 ? 'item' : 'items'}`}</span>
      </div>
      <button type="button" className={s.next} onClick={onBilling} disabled={count === 0}>
        Billing <Icon name="next" className={s.nextIcon} />
      </button>
    </footer>
  );
}

export function MenuScreen() {
  const folded = useApp((st) => st.folded);
  const order = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<Sort>('menu');
  const [showSearch, setShowSearch] = useState(false);

  const all = Object.values(folded.items).filter((i) => !i.removed && !i.supply);
  const categories = Array.from(new Set(all.map((i) => i.category.trim()).filter(Boolean)));
  const byCat = cat === 'all' ? all : all.filter((i) => i.category.trim() === cat);
  const items = sortItems(byCat.filter((i) => matches(i, q)), sort, folded);
  const count = order?.lines.reduce((n, l) => n + l.qty, 0) ?? 0;

  return (
    <>
      <CategoryRibbon categories={categories} cat={cat} onSelect={setCat} showTool={all.length > CONFIG.menu.searchFrom} onToggleTool={() => { setShowSearch(!showSearch); }} />
      {showSearch && all.length > CONFIG.menu.searchFrom ? <SearchTools q={q} onQ={setQ} sort={sort} onSort={setSort} /> : null}
      {items.length === 0 ? <p className={s.none}>{`Nothing called “${q.trim()}”.`}</p> : null}
      <main className={s.grid}>
        {items.map((it) => <Card key={it.id} it={it} />)}
        <button type="button" className={s.add} onClick={() => { openSheet({ kind: 'item', itemId: null }); }}>
          <span className={s.plus}><Icon name="plusBig" /></span><span className={s.addLabel}>Add item</span>
        </button>
      </main>
      <CartDock
        subtotal={order ? bill.subtotal(order) : 0}
        count={count}
        orderNote={order?.note ?? ''}
        onOrderNote={() => { openSheet({ kind: 'orderNote' }); }}
        onBilling={() => { c.setPage('billing'); }}
      />
    </>
  );
}
