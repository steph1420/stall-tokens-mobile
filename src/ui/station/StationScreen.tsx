// F-21 Station page (21-polish2/station.html, 07-station/station-v1). One whole order per screen; swipe left/right or
// tap a tab to change order; Overview = item totals + status split + look (Q-STN-LOOK D, default Full card D-STATION).
// Other stations' lines are muted with their status. Back returns to the opener (Q-BACK-1 A). Interaction owner (§5).
import { useEffect, useRef } from 'react';
import { CONFIG } from '../../config';
import type { Order } from '../../contract';
import { formatToken, kitchen, liveOrders, useApp, type Folded, type StationPlace } from '../../store';
import { Icon } from '../kit/Icon';
import { useWakeLock } from '../kit/wakeLock';
import { KitchenCard } from '../kitchen/KitchenCard';
import { StatusMark, type Mark } from '../kitchen/StatusMark';
import { stationIcon, stationVar } from '../kitchen/stations';
import k from '../kitchen/Kitchen.module.css';
import { ItemCards, Ticket } from './Looks';
import { LeavingCard, useLeaving, type Why } from '../kitchen/Leaving';
import { Overview } from './Overview';
import s from './Station.module.css';

/** The one mark a tab shows: Priority, then Done?, then Paused, then the station's main status. */
function tabMark(o: Order, station: string): Mark {
  if (o.priority) return 'priority';
  const ls = kitchen.linesAt(o, station);
  if (ls.some((l) => l.status === 'done?')) return 'done?';
  if (kitchen.isPaused(o, station)) return 'paused';
  const order: readonly Mark[] = ['preparing', 'held', 'waiting', 'ready', 'handed'];
  return order.find((m) => ls.some((l) => l.status === m)) ?? 'waiting';
}

function useSwipe(onStep: (dir: 1 | -1) => void) {
  const x0 = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown(e: React.PointerEvent) { x0.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp(e: React.PointerEvent) {
      const p = x0.current; x0.current = null;
      if (!p) return;
      const dx = e.clientX - p.x;
      if (Math.abs(dx) >= CONFIG.gesture.swipePx && Math.abs(dx) > Math.abs(e.clientY - p.y)) onStep(dx < 0 ? 1 : -1);
    },
    onPointerCancel() { x0.current = null; },
  };
}

function OrderTabBtn({ x, station, on, onClick }: { x: Order; station: string; on: boolean; onClick: () => void }) {
  const m = tabMark(x, station);
  return (
    <button type="button" role="tab" aria-selected={on} className={[s.otab, on ? s.otabOn : '', m === 'paused' ? s.otabPaused : ''].join(' ')}
      data-mark={m} onClick={onClick}>
      <span className={s.tok}><span className={k.hash}>#</span>{formatToken(x.token, CONFIG.tokens.pad).slice(1)}</span>
      <StatusMark mark={m} label={false} small />
    </button>
  );
}

function OrderTabs({ list, station, current }: { list: readonly Order[]; station: string; current: string | undefined }) {
  const a = useApp((st) => st.kitchen);
  const curIdx = list.findIndex((x) => x.id === current);
  return (
    <div className={s.tabWrap}>
      {list.length > 1 ? (
        <button type="button" className={s.cycleBtn} aria-label="Previous order" disabled={curIdx <= 0} onClick={() => { a.stepStationOrder(-1); }}>
          <Icon name="chevLeft" />
        </button>
      ) : null}
      <div className={s.otabs} role="tablist" aria-label="Orders">
        {list.map((x) => (
          <OrderTabBtn key={x.id} x={x} station={station} on={x.id === current} onClick={() => { a.showStationOrder(x.id); }} />
        ))}
      </div>
      {list.length > 1 ? (
        <button type="button" className={s.cycleBtnR} aria-label="Next order" disabled={curIdx >= list.length - 1} onClick={() => { a.stepStationOrder(1); }}>
          <Icon name="chevLeft" />
        </button>
      ) : null}
    </div>
  );
}

/** The order the station shows now; when it leaves, Q-OVERLAY keeps it a moment. */
function useShown(place: StationPlace | null, folded: Folded): Order[] {
  if (!place) return [];
  const list = kitchen.stationOrders(liveOrders(folded), place.id);
  // W-28: the shown order is pinned; no silent fall-back to the first order (that swapped it under the finger).
  const o = place.orderId ? list.find((x) => x.id === place.orderId) : undefined;
  return o ? [o] : [];
}

/** W-28: pin the first order when nothing is pinned; after a pinned order has left (its veil is over), move on with a toast. */
function usePin(place: StationPlace | null, list: readonly Order[], leaving: boolean) {
  const a = useApp((st) => st.kitchen);
  const pinned = place?.orderId ?? null;
  const here = !!pinned && list.some((x) => x.id === pinned);
  const next = list[0];
  useEffect(() => {
    if (!place || here || leaving) return;
    a.moveOn(next?.id ?? null, pinned && next ? formatToken(next.token, CONFIG.tokens.pad) : null);
  }, [a, place, here, leaving, next, pinned]);
}

/** W-28 / W-41: a Priority order that is not on screen gets a banner to open it, instead of a swap. */
function PriorityBanner({ list, current }: { list: readonly Order[]; current: string | undefined }) {
  const a = useApp((st) => st.kitchen);
  const p = list.find((x) => x.priority && x.id !== current);
  if (!p) return null;
  return (
    <button type="button" className={s.priBanner} aria-label={`Priority ${formatToken(p.token, CONFIG.tokens.pad)} · Open`} onClick={() => { a.showStationOrder(p.id); }}>
      <StatusMark mark="priority" label={false} small /><span>{`Priority ${formatToken(p.token, CONFIG.tokens.pad)}`}</span><b>Open</b>
    </button>
  );
}

function StationHeader({ station, count }: { station: string; count: number }) {
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const a = useApp((st) => st.kitchen);
  const go = useApp((st) => st.go);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <div className={k.hdr}>
      <div className={k.kicker}>{stallName}</div>
      <button type="button" className={k.back} aria-label="Back" onClick={() => { a.closeStation(); }}><Icon name="chevLeft" /></button>
      <button type="button" className={k.homeBtn} aria-label="Home screen" title="Home screen" onClick={() => { go('launch'); }}><Icon name="home" /></button>
      <h1 className={s.title}><Icon name={stationIcon(station)} className={s.titleIc} /><span>{`${station} · ${String(count)}`}</span></h1>
      <button type="button" className={k.open} onClick={() => { openSheet({ kind: 'overview' }); }}>Overview</button>
    </div>
  );
}

function Shown({ o, why, station }: { o: Order | undefined; why: Why | undefined; station: string }) {
  const look = useApp((st) => st.prefs.stationLook);
  if (!o) return <p className={k.empty}>Nothing to make at {station}</p>;
  return (
    <LeavingCard key={o.id} why={why} o={o} station={station}>
      {look === 'items' ? <ItemCards o={o} station={station} /> : look === 'ticket' ? <Ticket o={o} station={station} /> : <KitchenCard o={o} station={station} only={false} />}
    </LeavingCard>
  );
}

export function StationScreen() {
  const place = useApp((st) => st.ui.station);
  const folded = useApp((st) => st.folded);
  const sheet = useApp((st) => st.ui.sheet?.kind);
  const a = useApp((st) => st.kitchen);
  const swipe = useSwipe((d) => { a.stepStationOrder(d); });
  const gone = useLeaving(useShown(place, folded), folded.orders, place?.id ?? null);
  const list = place ? kitchen.stationOrders(liveOrders(folded), place.id) : [];
  usePin(place, list, gone.length > 0);
  useWakeLock(true);
  if (!place) return null;
  const station = place.id;
  const live = place.orderId ? list.find((x) => x.id === place.orderId) : undefined;
  const left = gone.find((g) => !live || g.o.id !== live.id);
  const o = left?.o ?? live;
  return (
    <div className={k.phone} style={stationVar(station)}>
      <div className={k.kscroll}>
        <header className={k.chrome}>
          <StationHeader station={station} count={list.length} />
          <OrderTabs list={list} station={station} current={o?.id} />
          <PriorityBanner list={list} current={o?.id} />
        </header>
        <main className={s.body} {...swipe}><Shown o={o} why={left?.why} station={station} /></main>
      </div>
      {sheet === 'overview' ? <Overview station={station} /> : null}
    </div>
  );
}
