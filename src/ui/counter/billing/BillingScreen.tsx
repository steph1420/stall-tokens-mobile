// F-09..F-12 F-18 Billing (20-polish/billing.html p2). Buttons: Back, Delete (hold), To kitchen, Pay.
// Round-off lives here only (Q-ROUND-1 A). A paid order that now costs less shows Refund.
import { useState } from 'react';
import { CONFIG } from '../../../config';
import type { Line, Order } from '../../../contract';
import { bill, formatToken, useApp } from '../../../store';
import { HoldButton } from '../../kit/HoldButton';
import { Icon } from '../../kit/Icon';
import { Money } from '../../kit/Money';
import s from './Billing.module.css';

function QtyStrip({ line, onClose }: { line: Line; onClose: () => void }) {
  const c = useApp((st) => st.counter);
  const start = Math.max(1, line.qty - 2);
  const values = Array.from({ length: 5 }, (_, i) => start + i).filter((v) => v <= CONFIG.limits.qtyMax);
  return (
    <div className={s.strip} role="listbox" aria-label={`Quantity of ${line.name}`}>
      {values.map((v) => (
        <button type="button" role="option" aria-selected={v === line.qty} key={v} className={v === line.qty ? s.snOn : s.sn}
          onClick={() => { c.setQty(line.lineId, v); onClose(); }}>{v}</button>
      ))}
    </div>
  );
}

function Row({ line, n, sel, onSel }: { line: Line; n: number; sel: boolean; onSel: (open: boolean) => void }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <tr className={sel ? s.isSel : undefined}>
      <td className={[s.c, s.num].join(' ')}>{n}</td>
      <td className={s.item}>
        <button type="button" className={s.itemBtn} onClick={() => { openSheet({ kind: 'lineNote', lineId: line.lineId }); }} aria-label={`${line.name}, ${line.note ? 'edit' : 'add'} note`}>
          <b>{line.name} <Icon name="note" className={line.note ? s.niconHas : s.nicon} /></b>
          {line.category ? <span className={s.cat}>{line.category}</span> : null}
          {line.note ? <em className={s.itemNote}>{line.note}</em> : null}
        </button>
      </td>
      <td className={[s.c, s.qtyCell].join(' ')}>
        <div className={s.qty}>
          <button type="button" className={s.qb} aria-label={`One less ${line.name}`} onClick={() => { c.setQty(line.lineId, line.qty - 1); }}>−</button>
          <button type="button" className={s.qn} aria-label={`Quantity ${String(line.qty)}, change`} onClick={() => { onSel(!sel); }}>{line.qty}</button>
          <button type="button" className={s.qb} aria-label={`One more ${line.name}`} onClick={() => { c.setQty(line.lineId, line.qty + 1); }}>+</button>
          {sel ? <QtyStrip line={line} onClose={() => { onSel(false); }} /> : null}
        </div>
      </td>
      <td className={s.rate}>{formatRate(line.price)}</td>
      <td className={s.amt}><Money p={bill.lineAmount(line)} /></td>
    </tr>
  );
}
const formatRate = (p: number) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function TipWaiveRows({ tip, waived, onAdjust }: { tip: number; waived: number; onAdjust: () => void }) {
  return (
    <>
      {tip > 0 ? <tr className={s.disc} onClick={onAdjust}><td colSpan={3} className={s.lab}>Tip</td><td colSpan={2} className={s.amt}><Money p={tip} sign="+" /></td></tr> : null}
      {waived > 0 ? <tr className={s.disc} onClick={onAdjust}><td colSpan={3} className={s.lab}>Waived</td><td colSpan={2} className={s.discAmt}><Money p={-waived} /></td></tr> : null}
      <tr className={s.adjRow}>
        <td colSpan={5} className={s.adjCell}>
          <button type="button" className={s.tipWaiveBtn} onClick={onAdjust}>
            <Icon name="pencil" className={s.adjIcon} />
            {tip > 0 || waived > 0 ? 'Edit tip / waive' : 'Tip or waive'}
          </button>
        </td>
      </tr>
    </>
  );
}

function Totals() {
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const draft = useApp((st) => (st.ui.orderId ? st.ui.payDrafts?.[st.ui.orderId] : undefined));
  const openSheet = useApp((st) => st.openSheet);
  if (!o) return null;
  const sub = bill.subtotal(o);
  const disc = bill.discountAmount(sub, o.discount);
  const ro = bill.roundOffAmount(o);
  const owed = bill.due(o);
  const paid = bill.paid(o);
  const tip = draft ? draft.tip : bill.tips(o);
  const waived = draft ? draft.waived : bill.waived(o);
  const adjust = () => { openSheet({ kind: 'adjust' }); };
  const netTotal = Math.max(0, bill.total(o) + tip - waived);
  return (
    <tfoot>
      <tr className={s.sub}><td colSpan={3} className={s.lab}>Subtotal</td><td colSpan={2} className={s.amt}><Money p={sub} /></td></tr>
      {disc > 0 ? (
        <tr className={s.disc} onClick={adjust}><td colSpan={3} className={s.lab}>Discount{o.discount?.allowedBy ? <span className={s.who}>Allowed by {o.discount.allowedBy}</span> : null}</td>
          <td colSpan={2} className={s.discAmt}><Money p={-disc} /></td></tr>
      ) : null}
      {ro !== 0 ? (
        <tr className={s.disc} onClick={adjust}><td colSpan={3} className={s.lab}>Round-off</td><td colSpan={2} className={s.amt}><Money p={ro} sign={ro > 0 ? '+' : '−'} /></td></tr>
      ) : null}
      <tr className={s.tot}>
        <td colSpan={3} className={s.lab}>
          <button type="button" className={s.adjBtn} onClick={adjust} aria-label="Discount or round-off"><Icon name="pencil" className={s.adjIcon} /></button>Total
        </td>
        <td colSpan={2} className={s.totAmt}><Money p={netTotal} /></td>
      </tr>
      <TipWaiveRows tip={tip} waived={waived} onAdjust={adjust} />
      {paid !== 0 ? <tr className={s.paidRow}><td colSpan={3} className={s.lab}>{owed < 0 ? 'Refund' : owed > 0 ? 'Paid so far' : 'Paid'}</td><td colSpan={2} className={s.amt}><Money p={owed < 0 ? -owed : paid} /></td></tr> : null}
    </tfoot>
  );
}

function Actions({ o }: { o: Order }) {
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const lines = o.lines.filter((l) => l.qty > 0);
  const owed = bill.due(o);
  const hasDraft = lines.some((l) => l.status === 'draft');
  const settled = owed === 0 && bill.paid(o) + bill.waived(o) > 0;
  const pay = () => { if (owed < 0) openSheet({ kind: 'refund' }); else c.setPage('payment'); };
  const sendKitchen = () => {
    if (c.sendToKitchen()) {
      c.toast('Sent to the kitchen');
      openSheet({ kind: 'slip', orderId: o.id });
    }
  };
  return (
    <footer className={s.actions}>
      <div className={s.row}>
        <button type="button" className={s.back} onClick={() => { c.setPage('menu'); }}><Icon name="back" className={s.ic} />Back</button>
        <HoldButton className={s.del} label="Delete" onConfirm={() => { c.deleteOrder(); }} onHint={() => { c.toast('Hold to delete this order'); }}>
          <Icon name="trash" className={s.ic} />Delete
        </HoldButton>
        {hasDraft || !o.sent ? (
          <button type="button" className={s.kitchen} disabled={!hasDraft} onClick={sendKitchen}>
            To kitchen
          </button>
        ) : (
          <button type="button" className={s.kitchen} onClick={() => { openSheet({ kind: 'slip', orderId: o.id }); }} aria-label="Print token slip">
            <Icon name="printer" className={s.ic} />Print token
          </button>
        )}
        <button type="button" className={s.pay} disabled={lines.length === 0 || (settled && !hasDraft)} onClick={pay}>
          {owed < 0 ? <>Refund <Money p={-owed} /></> : settled ? 'Paid ✓' : 'Pay'}
        </button>
      </div>
      <p className={s.hint}>Pay sends it to the kitchen too</p>
    </footer>
  );
}

function MetaRow({ o }: { o: Order }) {
  const servingName = useApp((st) => st.prefs.servingName);
  const k = useApp((st) => st.kitchen);
  const openSheet = useApp((st) => st.openSheet);
  return (
    <div className={s.meta}>
      <span className={s.metaToken}>
        Token <b>{formatToken(o.token, CONFIG.tokens.pad)}</b>
        {o.sent ? (
          <button type="button" className={s.printMetaBtn} onClick={() => { openSheet({ kind: 'slip', orderId: o.id }); }} aria-label="Print token slip" title="Print token">
            <Icon name="printer" className={s.printMetaIc} />Print
          </button>
        ) : null}
      </span>
      {/* F-19 Q-PRIORITY-1 C: the Counter can mark Priority too (the kitchen holds the order number). */}
      <button type="button" role="switch" aria-checked={o.priority} className={o.priority ? s.prioOn : s.prio} onClick={() => { k.togglePriority(o.id); }}>
        <Icon name="stPriority" className={s.prioIc} />Priority
      </button>
      <button type="button" className={s.serving} onClick={() => { openSheet({ kind: 'serving' }); }}>Serving <b>{o.servedBy || servingName || 'Add name'}</b></button>
    </div>
  );
}

export function BillingScreen() {
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const c = useApp((st) => st.counter);
  const openSheet = useApp((st) => st.openSheet);
  const [sel, setSel] = useState<string | null>(null);
  if (!o) return null;
  const lines = o.lines.filter((l) => l.qty > 0);
  return (
    <>
      <main className={s.stage}>
        <MetaRow o={o} />
        {lines.length === 0 ? (
          <div className={s.empty}>No items yet. <button type="button" className={s.link} onClick={() => { c.setPage('menu'); }}>Add from the menu</button></div>
        ) : (
          <div className={s.sheetCard}>
            <table className={s.sheet}>
              <thead><tr><th className={s.thN}>#</th><th>Item</th><th className={s.thQty}>Qty</th><th className={s.thRate}>Rate</th><th className={s.thAmt}>Amount</th></tr></thead>
              <tbody>
                {lines.map((l, i) => <Row key={l.lineId} line={l} n={i + 1} sel={sel === l.lineId} onSel={(open) => { setSel(open ? l.lineId : null); }} />)}
                <tr className={s.noteRow}><td colSpan={5}>
                  <button type="button" className={s.orderNote} onClick={() => { openSheet({ kind: 'orderNote' }); }}>
                    <Icon name="note" className={s.niconHas} />{o.note ? o.note : <span className={s.addNote}>Order note</span>}
                  </button>
                </td></tr>
              </tbody>
              <Totals />
            </table>
          </div>
        )}
      </main>
      <Actions o={o} />
    </>
  );
}
