// F-05 / F-43 Counter shell: top tabs New Orders | Open Orders (Q-ORDERS-1), then for New Orders the page tabs
// (Menu / Billing / Payment) and a single current-order line (Q-ORDERS-2 A: no chips row). Interaction owner for the header (§5).
import { CONFIG } from '../../config';
import type { Order } from '../../contract';
import { bill, draftOrders, formatToken, isOpen, kitchen, liveOrders, orderStatus, unpaidOrders, useApp, type Page } from '../../store';
import { Icon } from '../kit/Icon';
import { useWide } from '../kit/useWide';
import { BillingScreen } from './billing/BillingScreen';
import { CounterSheets } from './CounterSheets';
import { CancelSheet } from './CancelSheet';
import { MenuScreen } from './menu/MenuScreen';
import { OpenOrdersScreen } from './open/OpenOrdersScreen';
import { PaymentScreen } from './payment/PaymentScreen';
import { TakeOverCard, TakenBanner, useTakeOver } from './TakeOver';
import { OrderView } from './unpaid/OrderView';
import { UnpaidScreen } from './unpaid/UnpaidScreen';
import s from './Counter.module.css';

const PAGES: readonly { id: Page; label: string }[] = [{ id: 'menu', label: 'Menu' }, { id: 'billing', label: 'Billing' }, { id: 'payment', label: 'Payment' }];

function TopTabs() {
  const tab = useApp((st) => st.ui.counterTab);
  const n = useApp((st) => kitchen.openOrders(liveOrders(st.folded)).length);
  const u = useApp((st) => unpaidOrders(liveOrders(st.folded)).length);
  const o = useApp((st) => st.open);
  const T = (id: 'new' | 'open' | 'unpaid', full: string, short: string, badge: React.ReactNode) => (
    <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? s.segOn : s.segBtn} onClick={() => { o.showTab(id); }}>
      <span className={s.tabFull}>{full}</span>
      <span className={s.tabShort}>{short}</span>
      {badge}
    </button>
  );
  return (
    <div className={s.seg} role="tablist" aria-label="Counter" style={{ '--n': 3 } as React.CSSProperties}>
      {T('new', 'New Orders', 'New', null)}
      {T('open', 'Open Orders', 'Open', n > 0 ? <i className={s.badge}>{n}</i> : null)}
      {T('unpaid', 'Unpaid', 'Unpaid', u > 0 ? <i className={s.badgeRed}>{u}</i> : null)}
    </div>
  );
}

function OrderRibbon({ orders, curId, onSelect }: { orders: readonly Order[]; curId: string; onSelect: (id: string) => void }) {
  return (
    <div className={s.orderRibbon} role="tablist" aria-label="Quick order switcher">
      {orders.map((order) => (
        <button type="button" key={order.id} role="tab" aria-selected={order.id === curId} className={order.id === curId ? s.ribbonOn : s.ribbonBtn} onClick={() => { onSelect(order.id); }}>
          {formatToken(order.token, CONFIG.tokens.pad)}
        </button>
      ))}
    </div>
  );
}

/** Q-ORDERS-2 A: one quiet line for the order being built, with fast cycling and multi-order ribbon. */
function CurrentLine() {
  const c = useApp((st) => st.counter);
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined));
  const allOpen = useApp((st) => liveOrders(st.folded).filter(isOpen).sort((a, b) => a.token - b.token));
  if (!o || o.deleted || o.cancel) return <div className={s.cur}>Tap an item to start an order</div>;
  const n = o.lines.filter((l) => l.qty > 0).reduce((t, l) => t + l.qty, 0);
  const status = orderStatus(o, page);
  const idx = allOpen.findIndex((x) => x.id === o.id);
  const hasMultiple = allOpen.length > 1 && idx !== -1;
  const prev = hasMultiple ? allOpen[(idx - 1 + allOpen.length) % allOpen.length] : null;
  const next = hasMultiple ? allOpen[(idx + 1) % allOpen.length] : null;
  return (
    <div className={s.cur}>
      <div className={s.curLeft}>
        {hasMultiple && prev && next ? (
          <span className={s.orderCycle} role="group" aria-label="Order cycling">
            <button type="button" className={s.cycleBtn} aria-label={`Previous order ${formatToken(prev.token, CONFIG.tokens.pad)}`} onClick={() => { c.selectOrder(prev.id); }}>‹</button>
            <b className={s.curToken}>{formatToken(o.token, CONFIG.tokens.pad)}</b>
            <span className={s.cycleDot}>·</span>
            <button type="button" className={s.cycleTokenBtn} aria-label={`Switch to order ${formatToken(next.token, CONFIG.tokens.pad)}`} onClick={() => { c.selectOrder(next.id); }}>{formatToken(next.token, CONFIG.tokens.pad)}</button>
            <button type="button" className={s.cycleBtn} aria-label={`Next order ${formatToken(next.token, CONFIG.tokens.pad)}`} onClick={() => { c.selectOrder(next.id); }}>›</button>
          </span>
        ) : <b className={s.curToken}>{formatToken(o.token, CONFIG.tokens.pad)}</b>}
        <span className={s.curMeta}>{` · ${status === 'New' || status === 'Editing' ? 'new order' : status.toLowerCase()} · ${String(n)} ${n === 1 ? 'item' : 'items'}`}</span>
      </div>
      {hasMultiple ? <OrderRibbon orders={allOpen} curId={o.id} onSelect={(id) => { c.selectOrder(id); }} /> : null}
    </div>
  );
}

/** The + and the Drafts pill. The paid screen has its own New order, so + hides there (one New order on screen). */
function HeaderEnd({ settled }: { settled: boolean }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const drafts = useApp((st) => draftOrders(liveOrders(st.folded)).filter((o) => o.id !== st.ui.orderId).length);
  return (
    <div className={s.hdrEnd}>
      {drafts > 0 ? <button type="button" className={s.drafts} onClick={() => { openSheet({ kind: 'drafts' }); }}>Drafts <b>{drafts}</b></button> : null}
      {settled ? null : <button type="button" className={s.btnAdd} aria-label="New order" onClick={() => { c.newOrder(); }}><Icon name="plus" /></button>}
    </div>
  );
}

function PageTabs({ page }: { page: Page }) {
  const c = useApp((st) => st.counter);
  const wide = useWide(); // P3b: the menu is always beside the bill, so only Billing / Payment are tabs
  const tabs = wide ? PAGES.filter((p) => p.id !== 'menu') : PAGES;
  const on = wide && page === 'menu' ? 'billing' : page;
  const settled = useApp((st) => { const o = st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined; return !!o && page === 'payment' && bill.due(o) <= 0 && bill.paid(o) + bill.waived(o) > 0; });
  return (
    <>
      <div className={s.hdr}>
        <nav className={s.pages} aria-label="Pages">
          {tabs.map((p) => (
            <button type="button" key={p.id} className={p.id === on ? s.ptabOn : s.ptab} aria-current={p.id === on ? 'page' : undefined}
              onClick={() => { c.setPage(p.id); }}>{p.label}</button>
          ))}
        </nav>
        <HeaderEnd settled={settled} />
      </div>
      <CurrentLine />
    </>
  );
}

/** P3b: two panes side by side (tablet). Each pane is its own `counter` container, so the phone rules apply inside it. */
function Panes({ left, right, label }: { left: React.ReactNode; right: React.ReactNode; label: string }) {
  return (
    <div className={s.panes} aria-label={label}>
      <section className={s.pane}>{left}</section>
      <section className={s.paneR}>{right}</section>
    </div>
  );
}

function WideBody() {
  const orderId = useApp((st) => st.ui.orderId);
  const orderView = useApp((st) => st.ui.orderView);
  const tab = useApp((st) => st.ui.counterTab);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  if (orderView) return tab === 'unpaid' ? <Panes label="Unpaid" left={<UnpaidScreen />} right={<OrderView orderId={orderView} />} /> : <OrderView orderId={orderView} />;
  if (tab === 'open') return <OpenOrdersScreen wide />;
  if (tab === 'unpaid') return <Panes label="Unpaid" left={<UnpaidScreen />} right={<p className={s.paneHint}>Tap an order to see it here</p>} />;
  const right = !orderId ? <p className={s.paneHint}>The bill shows here. Tap an item on the left to start.</p> : page === 'payment' ? <PaymentScreen key={orderId} /> : <BillingScreen />;
  return <Panes label="Order" left={<MenuScreen />} right={right} />;
}

function Body() {
  const orderId = useApp((st) => st.ui.orderId);
  const orderView = useApp((st) => st.ui.orderView);
  const tab = useApp((st) => st.ui.counterTab);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  const wide = useWide();
  if (wide) return <WideBody />;
  if (orderView) return <OrderView orderId={orderView} />;
  if (tab === 'open') return <OpenOrdersScreen />;
  if (tab === 'unpaid') return <UnpaidScreen />;
  return page === 'menu' || !orderId ? <MenuScreen /> : page === 'billing' ? <BillingScreen /> : <PaymentScreen key={orderId} />;
}

export function CounterShell() {
  const tab = useApp((st) => st.ui.counterTab);
  const orderView = useApp((st) => st.ui.orderView);
  const page = useApp((st) => (st.ui.orderId ? st.ui.pages[st.ui.orderId] : undefined) ?? 'menu');
  const stallName = useApp((st) => st.folded.settings.stallName ?? 'Fair stall');
  const openSheet = useApp((st) => st.openSheet);
  const go = useApp((st) => st.go);
  const take = useTakeOver();
  const wide = useWide();
  return (
    <div className={wide ? s.wide : s.phone}>
      <header className={s.chrome}>
        <div className={s.hdrTop}>
          <button type="button" className={s.btnHome} aria-label="Home screen" title="Home screen" onClick={() => { go('launch'); }}><Icon name="home" /></button>
          <div className={s.kicker}>{stallName}</div>
          <button type="button" className={s.btnMore} aria-label="More" onClick={() => { openSheet({ kind: 'more' }); }}><Icon name="more" /></button>
        </div>
        <TopTabs />
        {tab === 'new' && !orderView ? <PageTabs page={page} /> : null}
      </header>
      {take.kind === 'taken' ? <TakenBanner orderId={take.orderId} label={take.label} /> : null}
      <div className={s.body}>
        {/* s127: while another phone has the order, what is under the card cannot be tapped (the store refuses too). */}
        <div className={take.kind === 'none' ? s.body : s.locked} inert={take.kind !== 'none'}><Body /></div>
        {take.kind === 'wait' ? <TakeOverCard orderId={take.orderId} label={take.label} /> : null}
      </div>
      <CancelSheet />
      <CounterSheets />
    </div>
  );
}
