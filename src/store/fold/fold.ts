// F-02 The fold: state = fold(sorted op log). Pure and idempotent. Rules that must hold for any log
// (including ops from other devices) live here; rules about what a tap may do live in store actions.
import { CONFIG } from '../../config';
import { compareOps, RECORD_TABLES, type InfoRecord, type Item, type ItemFields, type Op, type Order, type RecordValue } from '../../contract';
import { emptyFolded, type Folded } from './state';
import { applyOrderOp, isOrderOp } from './orders';
import { lww } from './lww';
import { applyMoneyOp, MONEY_KINDS, type MoneyKind } from './money';

const ITEM_DEFAULTS: ItemFields = {
  name: '', price: 0, swatch: 0, category: '', stationId: '', count: null, unit: '', lowAt: 0, soldOut: false, order: 0, removed: false, supply: false, categoryId: '',
  secondaryUnit: '', unitMultiplier: 1, discountPct: 0, variants: '', addons: '',
};

function fieldOk(key: keyof ItemFields, value: unknown): boolean {
  if (key === 'count') return value === null || (typeof value === 'number' && Number.isFinite(value));
  return value !== undefined && typeof value === typeof ITEM_DEFAULTS[key] && (typeof value !== 'number' || Number.isFinite(value));
}

function applyItem(s: Folded, op: Op<'item.set'>): Folded {
  const { itemId, fields } = op.body;
  const prev: Item = s.items[itemId] ?? { ...ITEM_DEFAULTS, id: itemId, sold: 0, oversold: false };
  let next: Item = prev;
  let st = s;
  for (const key of Object.keys(fields) as (keyof ItemFields)[]) {
    const value = fields[key];
    if (!fieldOk(key, value)) continue;
    const r = lww(st, `item:${itemId}`, key, op);
    st = r.state;
    if (r.apply) next = { ...next, [key]: value };
  }
  if (next.count !== null && next.count >= 0) next = { ...next, oversold: false };
  return { ...st, items: { ...st.items, [itemId]: next } };
}

const isRecordValue = (v: unknown): v is RecordValue => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));

/** F-48 info record patch: each field is its own last-writer-wins target (Sheet edits win on true clashes). */
function applyRecord(s: Folded, op: Op<'record.set'>): Folded {
  const { table, id, fields, removed } = op.body;
  if (!(RECORD_TABLES as readonly string[]).includes(table) || !id) return s;
  const rows = s.records[table] ?? {};
  let rec: InfoRecord = rows[id] ?? { id, fields: {}, removed: false };
  let st = s;
  for (const [k, v] of Object.entries(fields)) {
    if (!isRecordValue(v) || !/^[a-z][a-z0-9_]{0,39}$/.test(k)) continue;
    const r = lww(st, `rec:${table}:${id}`, k, op);
    st = r.state;
    if (r.apply) rec = { ...rec, fields: { ...rec.fields, [k]: typeof v === 'string' ? v.slice(0, CONFIG.limits.recordTextMax) : v } };
  }
  const rm = lww(st, `rec:${table}:${id}`, 'removed', op);
  st = rm.state;
  if (rm.apply) rec = { ...rec, removed };
  return { ...st, records: { ...st.records, [table]: { ...rows, [id]: rec } } };
}

function applyStock(s: Folded, op: Op<'stock.adjust'>): Folded {
  const item = s.items[op.body.itemId];
  if (!item || item.count === null) return s;
  // Manual edits never take stock below 0 (plan §7.2).
  const count = Math.max(0, item.count + Math.trunc(op.body.delta));
  return { ...s, items: { ...s.items, [item.id]: { ...item, count, oversold: false } } };
}

/** Q-SYNC-ALL device registry. Each device's row is last-writer-wins. Two different devices on the same token range is
 * a clash: a Conflict row (rule `range-clash`), never silent, so the Counter can warn "Range 1–500 is also used by …". */
function applyDevice(s: Folded, op: Op<'device.set'>): Folded {
  const { deviceId, label, role } = op.body;
  const rangeIndex = Math.trunc(op.body.rangeIndex);
  if (!deviceId || rangeIndex < 0 || rangeIndex >= CONFIG.tokens.ranges.length) return s;
  const w = lww(s, `device:${deviceId}`, 'all', op);
  if (!w.apply) return w.state;
  let st = w.state;
  const prev = st.devices[deviceId];
  const other = Object.values(st.devices).find((d) => d.id !== deviceId && d.rangeIndex === rangeIndex && d.role !== 'kitchen' && !d.role.startsWith('station:'));
  const counterLike = role !== 'kitchen' && !role.startsWith('station:');
  if (other && counterLike && prev?.rangeIndex !== rangeIndex) {
    const loser = st.lastWrite[`device:${other.id}|all`]?.opId ?? other.id;
    st = { ...st, conflicts: [...st.conflicts, { target: `range:${String(rangeIndex)}`, field: 'rangeIndex', winner: op.opId, loser, at: op.wallAt, rule: 'range-clash' }] };
  }
  return { ...st, devices: { ...st.devices, [deviceId]: { id: deviceId, label: label.trim().slice(0, CONFIG.limits.nameMaxChars), rangeIndex, role, at: op.wallAt } } };
}

function applySnapshot(s: Folded, op: Op<'snapshot.note'>): Folded {
  const b = op.body;
  if (!b.snapshotId || s.snapshots.some((x) => x.id === b.snapshotId)) return s;
  return { ...s, snapshots: [...s.snapshots, { id: b.snapshotId, at: b.at, reason: b.reason, opCount: Math.trunc(b.opCount), hash: b.hash, by: op.writer }] };
}

function applyOne(s: Folded, op: Op): Folded {
  switch (op.kind) {
    case 'item.set': return applyItem(s, op);
    case 'stock.adjust': return applyStock(s, op);
    case 'day.start':
      if (s.days.some((d) => d.id === op.body.dayId)) return s;
      return { ...s, days: [...s.days, { id: op.body.dayId, label: op.body.label, startedAt: op.wallAt }] };
    case 'payee.set': {
      const w = lww(s, `payee:${op.body.payeeId}`, 'all', op);
      if (!w.apply) return w.state;
      const st = w.state;
      const id = op.body.payeeId;
      const payees = op.body.removed
        ? Object.fromEntries(Object.entries(st.payees).filter(([k]) => k !== id))
        : { ...st.payees, [id]: { id, name: op.body.name, upiId: op.body.upiId } };
      return { ...st, payees };
    }
    case 'setting.set': {
      const w = lww(s, 'settings', op.body.key, op);
      return w.apply ? { ...w.state, settings: { ...w.state.settings, [op.body.key]: op.body.value } } : w.state;
    }
    case 'record.set': return applyRecord(s, op);
    case 'device.set': return applyDevice(s, op);
    case 'snapshot.note': return applySnapshot(s, op);
    default:
      if (MONEY_KINDS.has(op.kind)) return applyMoneyOp(s, op as Op<MoneyKind>);
      return isOrderOp(op) ? applyOrderOp(s, op) : s;
  }
}

function track(s: Folded, op: Op): Folded {
  const applied = new Set(s.applied).add(op.opId);
  const had = s.seen[op.writer] ?? 0;
  const seen = { ...s.seen, [op.writer]: Math.max(had, op.seq) };
  return { ...s, applied, seen, lamport: Math.max(s.lamport, op.lamport) };
}

/** Apply one op on top of a state. Duplicates (same opId) change nothing. */
export function applyOp(s: Folded, op: Op): Folded {
  if (s.applied.has(op.opId)) return s;
  return track(applyOne(s, op), op);
}

/** Fold a whole log. Sorts by (lamport, writer, seq) so every device gets the same answer. */
export function fold(log: readonly Op[]): Folded {
  const sorted = [...log].sort(compareOps);
  let s = emptyFolded();
  for (const op of sorted) s = applyOp(s, op);
  return { ...s, gaps: findGaps(sorted) };
}

function findGaps(log: readonly Op[]): Record<string, number> {
  const seqs: Record<string, Set<number>> = {};
  for (const op of log) (seqs[op.writer] ??= new Set()).add(op.seq);
  const gaps: Record<string, number> = {};
  for (const [w, set] of Object.entries(seqs)) {
    const missing = Math.max(...set) - set.size;
    if (missing > 0) gaps[w] = missing;
  }
  return gaps;
}

export const liveOrders = (s: Folded): Order[] =>
  s.orderIds.map((id) => s.orders[id]).filter((o): o is Order => o !== undefined && !o.deleted);
