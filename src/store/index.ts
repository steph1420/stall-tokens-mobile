// store/: the single owner of app state (06 rule 2; ARCHITECTURE §3). Built on Zustand.
// Screens read and write only through here. Only the store calls the data layer (ARCHITECTURE §2, §4).
import { createContext, createElement, useContext, type ReactNode } from 'react';
import { createStore as createZustand, useStore, type StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createBrowserDataSource, createSyncEngine, type DataSource, type DevicePrefs } from '../data';
import { catalogActions } from './catalog';
import { closeActions } from './close';
import { conflictActions } from './conflicts';
import { createLog, initialCore, type Core, type CoreState } from './core';
import { counterActions, deviceLabel } from './counter';
import { refundActions } from './refund';
import { focusOf, handlingActions, watchHandling } from './handling';
import { backStep } from './nav';
import { devKey, phoneLabel } from './rules/handling';
import { completed } from './rules/status';
import { kitchenActions } from './kitchen';
import { openActions } from './open';
import { moneyActions } from './money';
import { settleActions } from './settle';
import { stockActions } from './stock';
export { kindKey, type NewKinds } from './stock';
import { backupActions, type BackupActions } from './backup';
export { backupActions, type BackupActions } from './backup';
import { liveOrders as live } from './fold/fold';
import { pauseMoves } from './rules/kitchen';
import type { Screen, Sheet, StallScreen } from './ui';

export type { CounterTab, Screen, Sheet, StallScreen, StationPlace, ToastAction } from './ui';
export type { EntryDraft } from './money';
export * as money from './rules/money';
export * as settle from './rules/settle';
export * as stock from './rules/stock';
export * as amounts from './rules/amounts';
export * as history from './rules/history';
export * as closing from './rules/close';
export { extraOn, type Extra } from './close';
export type { Split } from './rules/settle';
export * as kitchen from './rules/kitchen';
export type { Folded } from './fold/state';
export type { DevicePrefs, SnapshotSummary, StorageEstimate } from '../data';
export { isSheetUrl, joinUrl, readJoin, type JoinLink, bluetoothPrint, canBluetoothPrint, selectPrinter, getSavedPrinterName, disconnectPrinter, testPrinter, dropReceipt, getReceipt, putReceipt, receiptIds } from '../data';
export { escposSlip, type SlipText } from './rules/escpos';
export type { OrderStatus, Page } from './rules/status';
export * as bill from './rules/bill';
export * as cats from './rules/catalog';
export * as day from './rules/day';
export { planRefund, type RefundAsk, type RefundRequest, type RefundResult } from './refund';
export * as pay from './rules/pay';
export * as calc from './rules/calc';
export { orderStatus, isOpen, completed, writtenOff, unpaid, unpaidOrders, allHanded, draftOrders } from './rules/status';
export { devKey, holding, phoneLabel, type Holding } from './rules/handling';
export { focusOf } from './handling';
export { formatToken } from './rules/tokens';
export { ago, istClock, istDay } from './rules/time';
export { formatQrAmount, readUpiLink, upiLink, upiQrFacts } from './rules/upi';
export { liveOrders } from './fold/fold';

export interface AppState extends CoreState {
  readonly counter: ReturnType<typeof counterActions>;
  readonly catalog: ReturnType<typeof catalogActions>;
  readonly conflicts: ReturnType<typeof conflictActions>;
  readonly kitchen: ReturnType<typeof kitchenActions>;
  readonly open: ReturnType<typeof openActions>;
  readonly refund: ReturnType<typeof refundActions>;
  readonly handling: ReturnType<typeof handlingActions>;
  /** W-13: one Back press; false when nothing is left to close (launch). */
  readonly back: () => boolean;
  readonly money: ReturnType<typeof moneyActions>;
  readonly settle: ReturnType<typeof settleActions>;
  readonly stock: ReturnType<typeof stockActions>;
  /** F-66 / F-67 Close the day, day notes, the Extras switches. */
  readonly close: ReturnType<typeof closeActions>;
  /** F-70 Data backup, snapshots, and database reset. */
  readonly backup: BackupActions;
  /** D-NAV: open a Stall screen; Back returns to the launch screen or the Counter. */
  readonly openStall: (screen: StallScreen) => void;
  readonly closeStall: () => void;
  readonly unlock: () => void;
  readonly go: (screen: Screen) => void;
  readonly openSheet: (sheet: Sheet | null) => void;
  readonly setPrefs: (patch: Partial<DevicePrefs>) => void;
  readonly retrySave: () => void;
  readonly start: () => Promise<void>;
  readonly syncNow: () => Promise<void>;
}
export type AppStore = StoreApi<AppState>;

export interface StoreOptions { makeId?: () => string; now?: () => number; loadId?: string }

const NOT_STALL: readonly Screen[] = ['launch', 'counter', 'kitchen', 'station'];
const isStallScreen = (x: Screen): x is StallScreen => !NOT_STALL.includes(x);

function navActions(core: Core) {
  const up = (f: (u: CoreState['ui']) => Partial<CoreState['ui']>) => { core.set((s) => ({ ui: { ...s.ui, ...f(s.ui) } })); };
  return {
    go(screen: Screen) { up(() => ({ screen, sheet: null })); },
    // P4: a Stall screen opened from another (Close the day › Settle up) keeps where Back finally returns to.
    openStall(screen: StallScreen) { up((u) => ({ screen, sheet: null, stallFrom: u.screen === 'counter' ? 'counter' : u.screen === 'launch' ? 'launch' : isStallScreen(u.screen) ? u.stallFrom : 'launch' })); },
    closeStall() { up((u) => ({ screen: u.stallFrom, sheet: null, unlocked: false })); },
    unlock() { up(() => ({ unlocked: true })); },
    openSheet(sheet: Sheet | null) { up(() => ({ sheet })); },
  };
}

export function createAppStore(ds: DataSource, opts: StoreOptions = {}): AppStore {
  const makeId = opts.makeId ?? (() => crypto.randomUUID());
  const now = opts.now ?? (() => Date.now());
  const prefs = ds.device.read();
  const writer = `${prefs.deviceId.slice(0, 8)}.${opts.loadId ?? makeId().slice(0, 4)}`;
  let log: ReturnType<typeof createLog> | null = null;
  const engine = createSyncEngine(
    ds.transports,
    (id) => store.getState().folded.applied.has(id),
    now,
    (w, from) => (log?.all() ?? []).filter((o) => o.writer === w && o.seq >= from),
    ds.syncState
  );
  const store = createZustand<AppState>()((set, get) => {
    const core: Core = { get, set: (p) => { set(p as Partial<AppState>); }, env: { ds, engine, makeId, now } };
    // Q-PAUSE-1 A: Priority pauses / resumes other orders' lines through real ops (rules/kitchen.ts pauseMoves).
    log = createLog(core, writer, (f) => pauseMoves(live(f)));
    const l = log;
    return {
      ...initialCore(prefs),
      ...actionsOf(core, l, get),
      setPrefs(patch) { const next = { ...get().prefs, ...patch }; ds.device.write(next); set({ prefs: next }); },
      retrySave() { l.retrySave(); },
      start: () => startApp(core, l, get),
      syncNow: () => syncRound(core, l),
    };
  });
  persistPlace(store);
  watchHandling({ getState: () => store.getState(), subscribe: (f) => store.subscribe(f), setUi: (patch) => { store.setState((s) => ({ ui: { ...s.ui, ...patch } })); } });
  return store;
}

type L = ReturnType<typeof createLog>;
function actionsOf(core: Core, l: L, get: () => AppState) {
  return {
    counter: counterActions(core, l),
    catalog: catalogActions(core, l),
    conflicts: conflictActions(l),
    kitchen: kitchenActions(core, l),
    open: openActions(core, l),
    refund: refundActions(core, l),
    handling: handlingActions(core, l, () => get().syncNow()),
    back: () => backOnce(core),
    money: moneyActions(core, l),
    settle: settleActions(core, l),
    stock: stockActions(core, l, (amount, label, note, parts) => get().money.addEntry({ dir: 'spent', amount, label, kind: 'normal', parts, note, personId: null })),
    close: closeActions(core, l, () => get().settle.lockDay()),
    backup: backupActions(core, l),
    ...navActions(core),
  };
}

async function startApp(core: Core, l: L, get: () => AppState) {
  const { ds, engine, now } = core.env;
  const loaded = await ds.ops.load();
  l.load(loaded); resume21(core); migrate21(core, l); // W-12 resume, Q-SYNC-ALL first start
  engine.rehydrate(loaded, core.get().prefs.deviceId.slice(0, 8));
  ds.channel.subscribe((ops) => {
    l.intake(ops, false);
    const mine = ops.filter((o) => o.writer.startsWith(core.get().prefs.deviceId.slice(0, 8)));
    if (mine.length) engine.enqueue(mine);
  });
  if (ds.transports.length === 0) return;
  core.set({ syncSince: now() });
  const tick = () => { void get().syncNow().finally(() => { setTimeout(tick, engine.nextDelayMs()); }); };
  tick();
}

/** W-13: one Back press (store/nav.ts backStep); false when nothing is left to close. */
function backOnce(core: Core): boolean {
  const step = backStep(core.get());
  if (!step) return false;
  core.set((s) => ({ ui: { ...s.ui, ...step } }));
  return true;
}

/** One sync round with this phone's presence beat (s127); other phones heard from are noted on this phone's clock. */
async function syncRound(core: Core, l: ReturnType<typeof createLog>) {
  const s0 = core.get();
  const mine = devKey(s0.prefs.deviceId);
  const beat = { deviceId: s0.prefs.deviceId, label: phoneLabel(s0.prefs.rangeIndex, s0.prefs.servingName), orderId: focusOf(s0) ?? '' };
  l.intake(await core.env.engine.round(beat), true);
  const heard = { ...core.get().heard };
  for (const p of core.env.engine.presence()) if (devKey(p.deviceId) !== mine) heard[devKey(p.deviceId)] = Math.max(heard[devKey(p.deviceId)] ?? 0, p.heardAt);
  core.set({ sync: core.env.engine.status(), heard });
}

/** PK-5: the screen this device is used as ('' for Launch / Counter / Stall pages). */
function roleOf(u: CoreState['ui']): string | null {
  if (u.screen === 'kitchen') return 'kitchen';
  if (u.screen === 'station' && u.station) return `station:${u.station.id}`;
  return u.screen === 'launch' || u.screen === 'counter' ? '' : null; // Stall pages keep the last place
}

/** W-12: keep "which order is on screen" (and its page) in this device's prefs, so a reload reopens it.
 * PK-5: also the Kitchen / Station place, so a kitchen device reopens where it was. */
function persistPlace(store: AppStore) {
  store.subscribe((s, prev) => {
    if (!s.ready) return;
    const role = roleOf(s.ui);
    if (role !== null && role !== s.prefs.lastRole) s.setPrefs({ lastRole: role });
    const id = s.ui.orderId ?? '';
    const page = (id && s.ui.pages[id]) || 'menu';
    if (id !== (prev.ui.orderId ?? '') || page !== ((id && prev.ui.pages[id]) || 'menu')) {
      if (id !== s.prefs.orderId || page !== s.prefs.page) s.setPrefs({ orderId: id, page });
    }
  });
}

/** W-12: reopen the Counter's order in progress after a reload or an Android kill (prefs.orderId / page). */
function resume21(core: Core) {
  const { prefs, folded } = core.get();
  const o = prefs.orderId ? folded.orders[prefs.orderId] : undefined;
  if (!o || o.deleted || o.cancel || completed(o)) return;
  core.set((s) => ({ ui: { ...s.ui, orderId: o.id, pages: { ...s.ui.pages, [o.id]: prefs.page } } }));
}

/** Q-SYNC-ALL first 2.1.0 start: register this device once, and share its old local Kitchen / Open Orders looks only
 * when no shared value exists yet (the first device's choice wins; later devices adopt it). Local copies stay until the
 * screens read the shared values (P2 / P5). */
const SHARED_FROM_PREFS = ['autoPrep', 'stationLook', 'openLook'] as const;
function migrate21(core: Core, l: ReturnType<typeof createLog>) {
  const { prefs, folded } = core.get();
  if (folded.devices[prefs.deviceId]) return;
  l.dispatch('device.set', { deviceId: prefs.deviceId, label: deviceLabel(prefs.servingName, prefs.deviceId), rangeIndex: prefs.rangeIndex, role: prefs.role });
  for (const k of SHARED_FROM_PREFS) if (core.get().folded.settings[k] === undefined) l.dispatch('setting.set', { key: k, value: String(prefs[k]) });
}

export const createDefaultStore = (): AppStore => createAppStore(createBrowserDataSource(() => crypto.randomUUID()));

const StoreContext = createContext<AppStore | null>(null);
export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  return createElement(StoreContext.Provider, { value: store }, children);
}
export function useApp<T>(select: (s: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useApp needs <StoreProvider>');
  // Shallow-compared so selectors may return fresh arrays/objects of stable parts without re-render loops.
  return useStore(store, useShallow(select));
}
