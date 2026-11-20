// F-19 Kitchen (21-polish2/kitchen.html, 04-kitchen/kitchen-v7): station pills with to-make counts in one
// scrolling row (Q-PILLS-1 A); "Open <station>" only when a pill is picked (Q-OPEN-1 A). Interaction owner (§5).
import { kitchen, liveOrders, useApp } from '../../store';
import { useFreshIds, useReorderGuard } from '../kit/alerts';
import { Icon } from '../kit/Icon';
import { useBigText, useWide } from '../kit/useWide';
import { useWakeLock } from '../kit/wakeLock';
import { KitchenCard } from './KitchenCard';
import { LeavingCard, useLeaving, withGone, type Why } from './Leaving';
import { STATIONS, stationIcon, stationVar } from './stations';
import s from './Kitchen.module.css';

function Pill({ name, count, on, onPick }: { name: string | null; count: number; on: boolean; onPick: () => void }) {
  const cls = [s.pill, on ? s.pillOn : '', count === 0 ? s.pillZero : '', name === null ? s.pillAll : ''].join(' ');
  return (
    <button type="button" className={cls} style={name ? stationVar(name) : undefined} aria-pressed={on} onClick={onPick}>
      <Icon name={name ? stationIcon(name) : 'all'} className={s.pillIcon} />
      <span className={s.pillTx}><span>{name ?? 'All'}</span><b>{count}</b></span>
    </button>
  );
}

export function KitchenScreen() {
  const folded = useApp((st) => st.folded);
  const filter = useApp((st) => st.ui.kitchenFilter);
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const k = useApp((st) => st.kitchen);
  const go = useApp((st) => st.go);
  const all = liveOrders(folded);
  // W-36: one rule for the station filter (stationOrders), so a station's finished orders drop off its filter.
  const list = filter === null ? kitchen.kitchenOrders(all) : kitchen.stationOrders(all, filter);
  const shown = withGone<{ o: (typeof list)[number]; gone?: Why }>(list, useLeaving(list, folded.orders, filter));
  // Q-KITCHEN-ALERT as built: silent highlight only (D-P3-ALERT); "new" is judged on every kitchen order, so switching
  // the filter never makes old tickets glow.
  const fresh = useFreshIds(kitchen.kitchenOrders(all).map((o) => o.id));
  const guard = useReorderGuard(list.map((o) => o.id), filter ?? ''); // W-41: taps rest a moment after a Priority order jumps in
  useWakeLock(true);
  const wide = useWide(); // P3b: tickets in a grid on a tablet (D-P3B-3)
  const big = useBigText(); // 200 % text on a tablet: the pills wrap like on a phone
  return (
    <div className={wide ? s.wide : s.phone}>
      <div className={s.kscroll}>
        <header className={s.chrome}>
          <div className={s.hdr}>
            <div className={s.kicker}>{stallName}</div>
            <button type="button" className={s.homeBtn} aria-label="Home screen" title="Home screen" onClick={() => { go('launch'); }}><Icon name="home" /></button>
            <h1 className={s.title}>{`Kitchen · ${String(list.length)}`}</h1>
            {filter ? <button type="button" className={s.open} onClick={() => { k.openStation(filter, 'kitchen'); }}>Open {filter}<Icon name="open" className={s.openIc} /></button> : null}
          </div>
          <div className={big ? s.pillsWrap : s.pills} role="group" aria-label="Station filter">
            <Pill name={null} count={kitchen.toMake(all, null)} on={filter === null} onPick={() => { k.filterKitchen(null); }} />
            {STATIONS.map((n) => <Pill key={n} name={n} count={kitchen.toMake(all, n)} on={filter === n} onPick={() => { k.filterKitchen(n); }} />)}
          </div>
        </header>
        <main className={[s.klist, wide ? s.kgrid : '', guard ? s.guard : ''].filter(Boolean).join(' ')} aria-busy={guard || undefined}>
          {shown.length === 0 ? <p className={s.empty}>Nothing to make right now</p> : null}
          {shown.map(({ o, gone }, i) => <LeavingCard key={o.id} why={gone} o={o} station={filter}><KitchenCard o={o} station={filter} only={filter !== null} fresh={fresh.has(o.id)} hint={i === 0 && !gone && !list.some((x) => x.priority)} /></LeavingCard>)}
        </main>
      </div>
    </div>
  );
}
