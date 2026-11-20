// The contract (06 rules 1, 6): op shapes every layer agrees on. Versioned; imports nothing from the app.
// F-02 op log (Q-HARM-10). Bodies are plain data; the fold gives them meaning.
import type { Paise } from './money';

export const CONTRACT_VERSION = 2;

export type LineStatus = 'draft' | 'waiting' | 'preparing' | 'done?' | 'ready' | 'held' | 'handed' | 'paused';
export type PaySource = 'cash' | 'upi';
/** F-24 Paid by / Received in (Q-PAIDBY, Q-MIXED-1): one source per part; Mixed = several parts. */
export type MoneySource = 'register' | 'upi' | 'person';
export interface MoneyPart { source: MoneySource; personId: string | null; amount: Paise }
export interface EntryBody {
  entryId: string; dayId: string; dir: 'spent' | 'received'; amount: Paise; label: string;
  kind: 'normal' | 'donation'; parts: MoneyPart[]; note: string;
  /** For (Spent) / From (Received) when it is a person in the book, e.g. a partner paying in; else null. */
  personId: string | null;
}

export interface ItemVariant {
  id?: string;
  name: string;
  price: Paise;
}

export interface ItemAddon {
  id?: string;
  name: string;
  price: Paise;
}

export interface ItemFields {
  name: string; price: Paise; swatch: number; category: string; stationId: string;
  count: number | null; unit: string; lowAt: number; soldOut: boolean; order: number; removed: boolean;
  /** D-STOCK-SUPPLY: stock-only things (straws, cups) from Paste stock; never on the Menu. Additive, default false. */
  supply: boolean;
  /** P-3 A (2.1.0): category record id (`name:<text>` for a virtual one). '' = use the legacy `category` text. Additive. */
  categoryId: string;
  /** Primary & Secondary units (e.g. Plate / Kg) */
  secondaryUnit: string;
  unitMultiplier: number;
  /** Item-level discount percentage (0 to 100) */
  discountPct: number;
  /** JSON-stringified ItemVariant[] */
  variants: string;
  /** JSON-stringified ItemAddon[] */
  addons: string;
}
/** Q-REFUND-1 A: one refunded line (qty of that line). */
export interface RefundLine { lineId: string; qty: number }
export interface DiscountBody { orderId: string; kind: 'amount' | 'pct'; value: number; allowedBy: string; note: string }
export interface PaymentBody {
  paymentId: string; orderId: string; cash: Paise; upi: Paise; upiPayeeId: string | null;
  tip: Paise; waived: Paise; waivedBy: string; waivedNote: string; cashGiven: Paise; notes: Record<string, number>;
}

export interface Bodies {
  'item.set': { itemId: string; fields: Partial<ItemFields> };
  'stock.adjust': { itemId: string; delta: number; reason: string };
  'day.start': { dayId: string; label: string };
  /** `device` (2.1.0, optional, Q-DRAFT-SYNC): the device label, so every Counter sees whose draft it is. */
  'order.create': { orderId: string; dayId: string; token: number; servedBy: string; device?: string };
  'line.add': { orderId: string; lineId: string; itemId: string; name: string; price: Paise; category: string; stationId: string; qty: number };
  'line.qty': { orderId: string; lineId: string; qty: number };
  'line.note': { orderId: string; lineId: string; note: string };
  'line.status': { orderId: string; lineId: string; status: LineStatus };
  /** F-20 Q-COUNTER-FINISH: the Counter marks a sent line finished at any time; it goes straight to Ready. Additive. */
  'line.finish': { orderId: string; lineId: string };
  'order.note': { orderId: string; note: string };
  'order.discount': DiscountBody;
  'order.roundoff': { orderId: string; amount: Paise; forTotal: Paise };
  'order.send': { orderId: string };
  'order.delete': { orderId: string };
  /** F-19 Priority flag (Q-ICON). Additive kind (contract stays v2: older ops never carry it). */
  'order.priority': { orderId: string; on: boolean };
  'order.cancel': { orderId: string; reason: string };
  /** F-43 Q-ORDERS-1: client name shown on the Open Orders header (row kept even when empty). Additive. */
  'order.client': { orderId: string; name: string };
  'payment.add': PaymentBody;
  /** Q-REFUND-1 A (2.1.0 optional fields): reason chip, refunded lines, and whether those lines go back to stock.
   * Old refunds have none: reason '', no lines, no restock. A refund never cancels the order. */
  'refund.add': { refundId: string; orderId: string; amount: Paise; source: PaySource; reason?: string; lines?: RefundLine[]; restock?: boolean };
  /** Q-REFUND-INSTANT: Undo of an instant refund, as a compensating op (never a delete). Reverses its restock. */
  'refund.void': { refundId: string; orderId: string; reason: string };
  /** Q-HANDOVER-PAY revised / Q-COMPLETE-2 A: Complete. `unpaid` = completed without payment (written off while due > 0). */
  'order.complete': { orderId: string; unpaid: boolean; dueAt: Paise; reason: string };
  /** Q-SYNC-ALL device registry: label (serving name + short id), token range and role of one device. */
  'device.set': { deviceId: string; label: string; rangeIndex: number; role: string };
  /** Q-SYNC-ALL backup metadata: every device and the Sheet see when snapshots were made. */
  'snapshot.note': { snapshotId: string; at: number; reason: string; opCount: number; hash: string };
  /** Q-TAKE-1a / Q-TAKE-2a (s127): this device has the order open (claim) or takes it over from another device. The
   * lease lives while the holder is heard from (presence beats, outside the log); see store/rules/handling.ts. */
  'order.handle': { orderId: string; deviceId: string; label: string; takeover: boolean };
  /** s127: the holder lets go (Back, another order, Cancel, Complete, app hidden). Only the holder's own release clears it. */
  'order.release': { orderId: string; deviceId: string; reason: string };
  'payee.set': { payeeId: string; name: string; upiId: string; removed: boolean };
  'setting.set': { key: string; value: string };
  /** F-23..F-29 Money and settlement (additive kinds; contract stays v2). */
  'person.set': { personId: string; name: string; isPartner: boolean; sharePct: number; removed: boolean };
  'entry.add': EntryBody;
  'entry.void': { entryId: string; reason: string };
  /** F-26..F-29 Settlement (Q-NEXT-2 A, Q-SETTLE-GAPS). Amounts are signed: + = the stall pays the person. */
  'settle.pay': { payId: string; dayId: string; personId: string; amount: Paise; via: MoneySource; byPersonId: string | null };
  'settle.clear': { clearId: string; dayId: string; personId: string; amount: Paise; reason: ClearReason; note: string };
  'settle.undo': { targetId: string; reason: string };
  'day.lock': { dayId: string; locked: boolean; split: Record<string, number> };
  /** F-48 Info records (Steve 16 Nov 20:10 IST): business, events, event days, sources, source items, stations and the
   * extra details of people and items. `fields` are the Sheet's snake_case column names; a patch (absent = unchanged).
   * Additive kind; also what a hand edit on a Sheet info tab becomes (writer `sheet`, Q-HARM-10). */
  'record.set': { table: RecordTable; id: string; fields: Record<string, RecordValue>; removed: boolean };
}
export const RECORD_TABLES = ['business', 'event', 'event_day', 'source', 'source_item', 'station', 'person_info', 'item_info', 'category', 'day_note'] as const;
export type RecordTable = (typeof RECORD_TABLES)[number];
export type RecordValue = string | number | boolean;
export type ClearReason = 'gifted' | 'paid-directly' | 'written-off' | 'shared-cost';
export type OpKind = keyof Bodies;
export const OP_KINDS = [
  'item.set', 'stock.adjust', 'day.start', 'order.create', 'line.add', 'line.qty', 'line.note', 'line.status', 'line.finish',
  'order.note', 'order.discount', 'order.roundoff', 'order.send', 'order.delete', 'order.priority', 'order.cancel', 'order.client', 'payment.add', 'refund.add',
  'payee.set', 'setting.set', 'person.set', 'entry.add', 'entry.void', 'settle.pay', 'settle.clear', 'settle.undo', 'day.lock',
  'record.set', 'refund.void', 'order.complete', 'device.set', 'snapshot.note', 'order.handle', 'order.release',
] as const satisfies readonly OpKind[];
/** True for a kind this app version knows how to fold. */
export const isKnownKind = (kind: string): kind is OpKind => (OP_KINDS as readonly string[]).includes(kind);
/** Forward compatibility (2.1.0): a well-formed op of a kind from a newer app is kept in the log and folds as a no-op. */
const KIND_SHAPE = /^[a-z][a-z_]{0,30}\.[a-z][a-z_]{0,30}$/;

/** Version vector: highest seq seen per writer. */
export type VV = Readonly<Record<string, number>>;

export interface OpHead {
  readonly v: typeof CONTRACT_VERSION;
  readonly opId: string; // `${writer}:${seq}`
  readonly writer: string;
  readonly seq: number;
  readonly lamport: number;
  readonly vv: VV;
  readonly wallAt: number; // display only; never used for ordering
  /** Q-HARM-10: when the Sheet bridge stored the op (server clock, ms). Set on ops pulled back; display and tiebreak only. */
  readonly recvAt?: number;
}
export type Op<K extends OpKind = OpKind> = K extends OpKind ? OpHead & { readonly kind: K; readonly body: Bodies[K] } : never;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x);

/** Shape check for ops arriving from storage or another device. A bad op is refused, never half-applied. */
export function isOp(value: unknown): value is Op {
  if (!isRecord(value)) return false;
  const { v, opId, writer, seq, lamport, vv, kind, body, wallAt } = value;
  if (v !== CONTRACT_VERSION || typeof writer !== 'string' || !writer || !isInt(seq) || seq < 1) return false;
  if (opId !== `${writer}:${String(seq)}` || !isInt(lamport) || lamport < 1 || typeof wallAt !== 'number') return false;
  if (!isRecord(vv) || !Object.values(vv).every(isInt)) return false;
  return typeof kind === 'string' && KIND_SHAPE.test(kind) && isRecord(body);
}

/** Total order for the fold: lamport, then writer, then seq. Same log, same order, on every device. */
export function compareOps(a: OpHead, b: OpHead): number {
  if (a.lamport !== b.lamport) return a.lamport - b.lamport;
  if (a.writer !== b.writer) return a.writer < b.writer ? -1 : 1;
  return a.seq - b.seq;
}

type FieldType = 's' | 'n' | 'b' | 'o' | 'n?' | 'a';
const S: Record<OpKind, Record<string, FieldType>> = {
  'item.set': { itemId: 's', fields: 'o' },
  'stock.adjust': { itemId: 's', delta: 'n', reason: 's' },
  'day.start': { dayId: 's', label: 's' },
  'order.create': { orderId: 's', dayId: 's', token: 'n', servedBy: 's' },
  'line.add': { orderId: 's', lineId: 's', itemId: 's', name: 's', price: 'n', category: 's', stationId: 's', qty: 'n' },
  'line.qty': { orderId: 's', lineId: 's', qty: 'n' },
  'line.note': { orderId: 's', lineId: 's', note: 's' },
  'line.status': { orderId: 's', lineId: 's', status: 's' },
  'line.finish': { orderId: 's', lineId: 's' },
  'order.note': { orderId: 's', note: 's' },
  'order.discount': { orderId: 's', kind: 's', value: 'n', allowedBy: 's', note: 's' },
  'order.roundoff': { orderId: 's', amount: 'n', forTotal: 'n' },
  'order.send': { orderId: 's' },
  'order.delete': { orderId: 's' },
  'order.priority': { orderId: 's', on: 'b' },
  'order.cancel': { orderId: 's', reason: 's' },
  'order.client': { orderId: 's', name: 's' },
  'payment.add': { paymentId: 's', orderId: 's', cash: 'n', upi: 'n', upiPayeeId: 'n?', tip: 'n', waived: 'n', waivedBy: 's', waivedNote: 's', cashGiven: 'n', notes: 'o' },
  'refund.add': { refundId: 's', orderId: 's', amount: 'n', source: 's' },
  'payee.set': { payeeId: 's', name: 's', upiId: 's', removed: 'b' },
  'setting.set': { key: 's', value: 's' },
  'person.set': { personId: 's', name: 's', isPartner: 'b', sharePct: 'n', removed: 'b' },
  'entry.add': { entryId: 's', dayId: 's', dir: 's', amount: 'n', label: 's', kind: 's', parts: 'a', note: 's', personId: 'n?' },
  'entry.void': { entryId: 's', reason: 's' },
  'settle.pay': { payId: 's', dayId: 's', personId: 's', amount: 'n', via: 's', byPersonId: 'n?' },
  'settle.clear': { clearId: 's', dayId: 's', personId: 's', amount: 'n', reason: 's', note: 's' },
  'settle.undo': { targetId: 's', reason: 's' },
  'day.lock': { dayId: 's', locked: 'b', split: 'o' },
  'record.set': { table: 's', id: 's', fields: 'o', removed: 'b' },
  'refund.void': { refundId: 's', orderId: 's', reason: 's' },
  'order.complete': { orderId: 's', unpaid: 'b', dueAt: 'n', reason: 's' },
  'device.set': { deviceId: 's', label: 's', rangeIndex: 'n', role: 's' },
  'snapshot.note': { snapshotId: 's', at: 'n', reason: 's', opCount: 'n', hash: 's' },
  'order.handle': { orderId: 's', deviceId: 's', label: 's', takeover: 'b' },
  'order.release': { orderId: 's', deviceId: 's', reason: 's' },
};
/** Optional fields (additive, 2.1.0): absent is fine; present must have the right type. */
const OPTIONAL: Partial<Record<OpKind, Record<string, FieldType>>> = {
  'order.create': { device: 's' },
  'refund.add': { reason: 's', lines: 'a', restock: 'b' },
};
const isRefundLines = (x: unknown): boolean =>
  Array.isArray(x) && x.every((l) => isRecord(l) && typeof l.lineId === 'string' && isInt(l.qty) && l.qty > 0);
const okField = (t: FieldType, x: unknown): boolean =>
  t === 's' ? typeof x === 'string'
    : t === 'n' ? typeof x === 'number' && Number.isFinite(x)
      : t === 'b' ? typeof x === 'boolean'
        : t === 'o' ? isRecord(x)
          : t === 'a' ? Array.isArray(x)
            : x === null || typeof x === 'string';

/** Body check per kind (F-02). Money and counts must be finite numbers; strings must be strings. */
export function isValidOp(value: unknown): value is Op {
  if (!isOp(value)) return false;
  if (!isKnownKind(value.kind)) return true; // unknown kind from a newer app: kept, folds as a no-op
  const body = value.body as unknown as Record<string, unknown>;
  if (!Object.entries(S[value.kind]).every(([k, t]) => okField(t, body[k]))) return false;
  const opt = OPTIONAL[value.kind] ?? {};
  if (!Object.entries(opt).every(([k, t]) => body[k] === undefined || okField(t, body[k]))) return false;
  return value.kind !== 'refund.add' || body.lines === undefined || isRefundLines(body.lines);
}
