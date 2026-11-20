// Counter actions (F-05..F-18). Every rule about what a tap may do lives here; screens only call these.
import { CONFIG } from '../config';
import type { Discount, Line, Order, Paise, PaySource, PaymentBody } from '../contract';
import type { Core, Log } from './core';
import { liveOrders } from './fold/fold';
import { due, held, preRound, subtotal, total } from './rules/bill';
import { checkPayment } from './rules/pay';
import { isOpen, type Page } from './rules/status';
import { istDate, rollover } from './rules/day';
import { nextToken } from './rules/tokens';
import type { PayDraft, UiState } from './ui';
import { holding } from './rules/handling';

/** Q-DRAFT-SYNC device label: serving name + short device id, e.g. "Ravi · 3f9a". */
export const deviceLabel = (servingName: string, deviceId: string): string =>
  [servingName.trim(), deviceId.slice(0, 4)].filter(Boolean).join(' · ');

function makeCtx(core: Core, log: Log) {
  const st = () => core.get();
  const toast = (text: string) => { core.set((s) => ({ ui: { ...s.ui, toast: { text, id: (s.ui.toast?.id ?? 0) + 1 } } })); };
  const ui = (patch: Partial<UiState>) => { core.set((s) => ({ ui: { ...s.ui, ...patch } })); };
  const current = (): Order | null => {
    const id = st().ui.orderId;
    const o = id ? st().folded.orders[id] : undefined;
    return o && !o.deleted && !o.cancel ? o : null;
  };
  const startDay = (): string => {
    const now = core.env.now();
    const dayId = `${istDate(now)}-${core.env.makeId().slice(0, 4)}`;
    log.dispatch('day.start', { dayId, label: istDate(now) });
    return dayId;
  };
  /** W-22: today's day. A closed (locked) day from an earlier date rolls over by itself; an open one is kept until the
   * Counter's question is answered (`startToday`, P2 asks it). */
  const currentDay = (): string => {
    const { days, locks } = st().folded;
    const last = days[days.length - 1];
    const r = rollover(days, locks, core.env.now());
    return !last || r === 'none' || r === 'new' ? startDay() : last.id;
  };
  /** Stock left for new taps: count minus what draft lines of live orders still hold. Cancelled orders hold nothing
   * (W-32); sent lines are already out of the count (committed). Drafts from every Counter hold stock (Q-DRAFT-SYNC). */
  const available = (itemId: string): number => {
    const it = st().folded.items[itemId];
    if (!it || it.removed || it.soldOut || it.supply) return 0;
    if (it.count === null) return Number.POSITIVE_INFINITY;
    const drafts = liveOrders(st().folded).filter((o) => !o.cancel)
      .reduce((n, o) => n + o.lines.filter((l) => l.itemId === itemId).reduce((m, l) => m + Math.max(0, l.qty - l.committed), 0), 0);
    return it.count - drafts;
  };
  const editable = (l: Line) => l.status === 'draft' || l.status === 'waiting';
  /** s127: true (with a calm toast) when another phone has the current order; nothing changes here until Take over. */
  const locked = (): boolean => {
    const s = st();
    const o = current();
    if (!o || holding(o, s.prefs.deviceId, { heard: s.heard, since: s.syncSince }, core.env.now()).kind !== 'busy') return false;
    toast('Another phone has this order · tap Take over to change it');
    return true;
  };
  return { core, log, st, toast, ui, current, currentDay, startDay, available, editable, locked };
}
type Ctx = ReturnType<typeof makeCtx>;

/** An order nothing has been put in yet: no lines with qty, no payments, not sent. */
const empty = (o: Order) => !o.sent && o.payments.length === 0 && o.lines.every((l) => l.qty === 0);
/** W-22: a new IST date while yesterday's day is still open, and the question not answered today. */
function askDay(x: Ctx): boolean {
  const f = x.st().folded;
  const t = x.core.env.now();
  return rollover(f.days, f.locks, t) === 'ask' && x.st().ui.dayKept !== istDate(t);
}
/** Not `orders[newOrder()]`: the object would be read before newOrder() runs (stale state). */
function ensureOrder(x: Ctx, nav: { newOrder(): string }): Order | null { const id = nav.newOrder(); return x.st().folded.orders[id] ?? null; }

function navActions(x: Ctx) {
  const { core, log, st, ui, current, currentDay } = x;
  const self = {
    /** + New order. W-07/W-14: an empty current draft is reused, so taps never burn tokens or strand drafts. */
    newOrder(): string {
      if (askDay(x)) { ui({ sheet: { kind: 'newDay' }, pendingItem: '' }); return ''; }
      const cur = current();
      if (cur && empty(cur) && cur.dayId === currentDay()) {
        core.set((s) => ({ ui: { ...s.ui, orderId: cur.id, counterTab: 'new', pages: { ...s.ui.pages, [cur.id]: 'menu' } } }));
        return cur.id;
      }
      const dayId = currentDay();
      const range = CONFIG.tokens.ranges[st().prefs.rangeIndex] ?? CONFIG.tokens.ranges[0];
      const token = nextToken(liveOrders(st().folded), dayId, range);
      const orderId = core.env.makeId();
      const p = st().prefs;
      log.dispatch('order.create', { orderId, dayId, token, servedBy: p.servingName, device: deviceLabel(p.servingName, p.deviceId) });
      core.set((s) => ({ ui: { ...s.ui, orderId, counterTab: 'new', pages: { ...s.ui.pages, [orderId]: 'menu' } } }));
      return orderId;
    },
    selectOrder(orderId: string) { ui({ orderId }); },
    setPage(page: Page) {
      const o = current() ?? ensureOrder(x, self);
      if (!o) return;
      core.set((s) => ({ ui: { ...s.ui, pages: { ...s.ui.pages, [o.id]: page } } }));
    },
  };
  return self;
}
type Nav = ReturnType<typeof navActions>;

function dayActions(x: Ctx) {
  const { core, log, st, ui, current, startDay } = x;
  const self = {
    /** W-22: what the next new order does about the day ('ask' = the Counter asks; P2 shows the question). */
    dayCheck() { const f = st().folded; return rollover(f.days, f.locks, core.env.now()); },
    /** W-22 answer "Start today": a new day, tokens from #001. */
    startToday(): string {
      const d = startDay();
      const cur = current();
      // An empty draft left on yesterday's day is discarded, so the next tap starts today's #001 (no stranded drafts).
      if (cur && empty(cur) && cur.dayId !== d) { log.dispatch('order.delete', { orderId: cur.id }); ui({ orderId: null }); }
      return d;
    },
    /** W-22 answer: "Start today" (tokens from #001) or "Keep yesterday's day" (not asked again today). Then carries on
     * with what was tapped: the menu item, or a new order. */
    answerDay(start: boolean): string {
      if (start) self.startToday(); else ui({ dayKept: istDate(core.env.now()) });
      const item = st().ui.pendingItem;
      ui({ sheet: null, pendingItem: '' });
      return item;
    },
  };
  return self;
}

function validateQty(line: Line, qty: number, left: number, isEditable: boolean, toast: (s: string) => void): number | null {
  const q = Math.max(0, Math.min(CONFIG.limits.qtyMax, Math.trunc(qty)));
  if (q === line.qty) return null;
  if (!isEditable && q < line.qty) { toast('Already being made; change it from the kitchen'); return null; }
  if (q > line.qty && left < q - line.qty) {
    toast(left <= 0 ? `${line.name} is sold out` : `Only ${String(left)} more ${line.name} left`);
    return null;
  }
  return q;
}

function lineActions(x: Ctx, nav: Nav) {
  const { core, log, st, toast, current, available, editable } = x;
  const self = {
    /** Tap a menu card: +1 (F-06). */
    addItem(itemId: string) {
      const it = st().folded.items[itemId];
      if (it) self.addItemCustom(itemId, it.name, it.price);
    },
    addItemCustom(itemId: string, customName: string, customPrice: Paise) {
      if (x.locked()) return;
      const it = st().folded.items[itemId];
      if (!it || it.removed || it.supply) return;
      if (it.soldOut || available(itemId) < 1) { toast(`${it.name} is sold out`); return; }
      const o = current() ?? ensureOrder(x, nav);
      if (!o) { if (st().ui.sheet?.kind === 'newDay') x.ui({ pendingItem: itemId }); return; }
      const draft = [...o.lines].reverse().find((l) => l.itemId === itemId && l.name === customName && l.status === 'draft');
      if (draft) { self.setQty(draft.lineId, draft.qty + 1); return; }
      if (o.lines.length >= CONFIG.limits.linesMax) { toast('This order is full; start another one'); return; }
      log.dispatch('line.add', { orderId: o.id, lineId: core.env.makeId(), itemId, name: customName, price: customPrice, category: it.category, stationId: it.stationId, qty: 1 });
    },
    /** Menu −: take one off the newest line of this item that is not being made yet. */
    removeItem(itemId: string) {
      if (x.locked()) return;
      const o = current();
      const line = o && [...o.lines].reverse().find((l) => l.itemId === itemId && editable(l));
      if (!line) { if (o?.lines.some((l) => l.itemId === itemId)) toast('Already being made; change it from the kitchen'); return; }
      self.setQty(line.lineId, line.qty - 1);
    },
    setQty(lineId: string, qty: number) {
      if (x.locked()) return;
      const o = current();
      const line = o?.lines.find((l) => l.lineId === lineId);
      if (!o || !line) return;
      const q = validateQty(line, qty, available(line.itemId), editable(line), toast);
      if (q !== null) log.dispatch('line.qty', { orderId: o.id, lineId, qty: q });
    },
  };
  return self;
}

/** W-16: never more than the bill; a free order (100 %) needs a note saying why. */
function discountProblem(o: Order, d: Discount | null, value: number): string {
  if (!d) return '';
  const sub = subtotal(o);
  const off = d.kind === 'pct' ? Math.round((sub * value) / 100) : value;
  if (off > sub) return 'Discount is more than the bill';
  return off > 0 && off >= sub && !d.note.trim() ? 'Add a note to make this order free' : '';
}

function billActions(x: Ctx) {
  const { log, toast, current } = x;
  const self = {
    setLineNote(lineId: string, note: string) {
      if (x.locked()) return;
      const o = current();
      if (!o?.lines.some((l) => l.lineId === lineId)) return;
      log.dispatch('line.note', { orderId: o.id, lineId, note: note.trim().slice(0, CONFIG.limits.noteMaxChars) });
    },
    setOrderNote(note: string) {
      if (x.locked()) return;
      const o = current();
      if (o) log.dispatch('order.note', { orderId: o.id, note: note.trim().slice(0, CONFIG.limits.noteMaxChars) });
    },
    setDiscount(d: Discount | null) {
      if (x.locked()) return;
      const o = current();
      if (!o) return;
      const value = d ? Math.max(0, Math.trunc(d.kind === 'pct' ? Math.min(d.value, 100) : d.value)) : 0;
      const problem = discountProblem(o, d, value);
      if (problem) { toast(problem); return; }
      log.dispatch('order.discount', { orderId: o.id, kind: d?.kind ?? 'amount', value, allowedBy: d?.allowedBy ?? '', note: d?.note ?? '' });
    },
    /** Q-ROUND-1 A: set at billing, both ways, against the current total. */
    setRoundOff(amount: number) {
      if (x.locked()) return;
      const o = current();
      if (!o) return;
      const forTotal = preRound(o);
      const a = Math.trunc(amount);
      if (forTotal + a < 0) { toast('Round-off cannot take the total below ₹0'); return; }
      log.dispatch('order.roundoff', { orderId: o.id, amount: a, forTotal });
    },
  };
  return self;
}

/** pay2: Undo toast for + Tip / − Waive (the draft is on the payment screen, which reads ui.payUndo). */
function adjustActions({ core, st, ui }: Ctx) {
  return {
    /** pay2: "+ Tip ₹10 · Undo" / "Waived ₹20 · Undo"; `prev` = the amounts before the change. */
    adjustToast(text: string, prev: { tip: Paise; waived: Paise }) {
      const orderId = st().ui.orderId; if (!orderId) return;
      core.set((s) => ({ ui: { ...s.ui, toast: { text, id: (s.ui.toast?.id ?? 0) + 1, ms: CONFIG.payment.adjustUndoMs, action: { label: 'Undo', run: 'undoPay', orderId, tip: prev.tip, waived: prev.waived } } } }));
    },
    undoAdjust(orderId: string, tip: Paise, waived: Paise) { ui({ payUndo: { seq: (st().ui.payUndo?.seq ?? 0) + 1, orderId, tip, waived } }); },
    setPayDraft(orderId: string, draft: PayDraft) {
      const cur = st().ui.payDrafts ?? {};
      ui({ payDrafts: { ...cur, [orderId]: draft } });
    },
  };
}

function flowActions(x: Ctx) {
  const { core, log, st, toast, ui, current, editable } = x;
  const self = {
    /** F-12 To kitchen: sends the unpaid order. A second tap does nothing. */
    sendToKitchen(): boolean {
      if (x.locked()) return false;
      const o = current();
      if (!o?.lines.some((l) => l.status === 'draft' && l.qty > 0)) return false;
      log.dispatch('order.send', { orderId: o.id });
      return true;
    },
    deleteOrder(): boolean {
      if (x.locked()) return false;
      const o = current();
      if (!o) return false;
      const net = held(o);
      if (net > 0) { toast('Refund the payment before deleting'); return false; }
      if (o.lines.some((l) => !editable(l))) { toast('The kitchen has started this order'); return false; }
      log.dispatch('order.delete', { orderId: o.id });
      const next = liveOrders(st().folded).filter((x) => x.id !== o.id).pop();
      ui({ orderId: next?.id ?? null });
      return true;
    },
    /** F-14 Confirm payment. Refused when nothing is due (double taps) or the parts do not add up. */
    pay(p: Omit<PaymentBody, 'paymentId' | 'orderId'>): string | null {
      if (x.locked()) return 'Another phone has this order';
      const o = current();
      if (!o) return 'No order';
      const bill = due(o);
      const tip = Math.max(0, Math.trunc(p.tip));
      const check = checkPayment(p.cash, p.upi, bill + tip, tip, p.waived);
      if (!check.ok) return check.reason;
      if (Math.abs(check.gap - p.waived) > 0) return 'Waived amount does not match';
      if (o.lines.every((l) => l.qty === 0)) return 'No items';
      log.dispatch('payment.add', { ...p, tip, paymentId: core.env.makeId(), orderId: o.id });
      return null;
    },
  };
  return self;
}

/** Q-CANCEL-1 A: cancel an order at any status, with an optional reason. Paid money is recorded as refund due. */
function cancelActions(x: Ctx) {
  const { core, log, st, toast, ui, current } = x;
  return {
    /** F-18 Refund what is owed after an edit. */
    refund(source: PaySource): boolean {
      const o = current();
      if (!o) return false;
      const owed = -due(o);
      if (owed <= 0) return false;
      log.dispatch('refund.add', { refundId: core.env.makeId(), orderId: o.id, amount: owed, source });
      return true;
    },
    cancelOrder(orderId: string, reason: string): boolean {
      const o = st().folded.orders[orderId];
      if (!o || o.deleted || o.cancel) return false;
      log.dispatch('order.cancel', { orderId, reason: reason.slice(0, CONFIG.limits.noteMaxChars) });
      const due = st().folded.orders[orderId]?.cancel?.refundDue ?? 0;
      toast(due > 0 ? 'Order cancelled · refund due' : 'Order cancelled');
      if (st().ui.orderId === orderId) ui({ orderId: liveOrders(st().folded).filter((y) => isOpen(y)).pop()?.id ?? null });
      return true;
    },
  };
}

export function counterActions(core: Core, log: Log) {
  const x = makeCtx(core, log);
  const nav = navActions(x);
  return { ...nav, ...dayActions(x), ...lineActions(x, nav), ...billActions(x), ...flowActions(x), ...adjustActions(x), ...cancelActions(x), totalOf: (o: Order) => total(o), available: x.available, toast: x.toast };
}
export type CounterActions = ReturnType<typeof counterActions>;
