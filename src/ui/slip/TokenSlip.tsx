// F-42 Token slip (D-SLIP): about 58 mm wide, printable from the browser (Print token on the paid screen). Stall name,
// big token number, IST time, items × qty, total, how it was paid, "Show this at pickup". Black on white for paper.
// F-41 (Steve 16 Nov 19:31 IST): where Web Bluetooth exists the same text goes to a thermal printer as ESC/POS;
// otherwise, or if the printer fails, window.print at 58 mm.
import { useEffect, useState } from 'react';
import { CONFIG } from '../../config';
import { formatInr, type Order, type Paise } from '../../contract';
import { bill, bluetoothPrint, canBluetoothPrint, escposSlip, formatToken, istClock, useApp, type SlipText } from '../../store';
import s from './TokenSlip.module.css';

function useSlipText(o: Order, draftTip?: Paise, draftWaived?: Paise): SlipText {
  const set = useApp((x) => x.folded.settings);
  const stall = set.stallName ?? 'Fair stall';
  const cash = o.payments.reduce((t, p) => t + p.cash, 0); const upi = o.payments.reduce((t, p) => t + p.upi, 0);
  const effTip = draftTip !== undefined ? draftTip : bill.tips(o);
  const effWaived = draftWaived !== undefined ? draftWaived : bill.waived(o);
  const owed = bill.due(o);
  const isUnpaid = owed > 0;
  return {
    stall, token: formatToken(o.token, CONFIG.tokens.pad),
    meta: `${istClock(o.payments[0]?.at ?? o.createdAt)}${o.client ? ` · ${o.client}` : ''}`,
    welcomeNote: set.printerWelcome || undefined,
    eventName: set.eventName || undefined,
    slogan: set.printerSlogan || undefined,
    contact: set.printerContact || undefined,
    address: set.printerAddress || undefined,
    thankYou: set.printerThankYou || undefined,
    // pay2: tip and waive are on the slip, and the total is what was asked for.
    lines: [...o.lines.filter((l) => l.qty > 0).map((l) => [`${l.name}${l.qty > 1 ? ` ×${String(l.qty)}` : ''}`, formatInr(l.price * l.qty)] as const),
      ...(effTip > 0 ? [['Tip', `+${formatInr(effTip)}`] as const] : []), ...(effWaived > 0 ? [['Waived', `−${formatInr(effWaived)}`] as const] : [])],
    total: formatInr(bill.total(o) + effTip - effWaived),
    paid: cash && upi ? 'Paid · cash + UPI' : upi ? 'Paid · UPI' : cash ? 'Paid · cash' : isUnpaid ? `UNPAID · Please pay ${formatInr(owed)}` : 'Paid',
    unpaid: isUnpaid,
    due: isUnpaid ? formatInr(owed) : undefined,
  };
}

export function SlipBody({ o, tip, waived }: { o: Order; tip?: Paise | undefined; waived?: Paise | undefined }) {
  const t = useSlipText(o, tip, waived);
  return (
    <div className={s.slip} aria-label="Token slip">
      {t.welcomeNote ? <div className={s.welcome}>{t.welcomeNote}</div> : null}
      <div className={s.stall}>{t.stall}</div>
      {t.eventName ? <div className={s.event}>{t.eventName}</div> : null}
      {t.slogan ? <div className={s.slogan}>{t.slogan}</div> : null}
      {t.address ? <div className={s.contact}>{t.address}</div> : null}
      {t.contact ? <div className={s.contact}>{`Ph: ${t.contact}`}</div> : null}
      <div className={s.tokLab}>Token</div>
      <div className={s.tok}>{t.token}</div>
      {t.unpaid ? (
        <div className={s.unpaidBadge} role="status" aria-label="Unpaid order">
          <div className={s.unpaidTitle}>*** UNPAID ***</div>
          <div className={s.unpaidSub}>{t.due ? `Please pay ${t.due} at the counter` : 'Please pay at the counter'}</div>
        </div>
      ) : null}
      <div className={s.meta}>{t.meta}</div>
      <ul className={s.lines}>{t.lines.map(([l, r], i) => <li key={`${String(i)}${l}`}><span>{l}</span><span>{r}</span></li>)}</ul>
      <div className={s.total}><span>Total</span><span>{t.total}</span></div>
      <div className={t.unpaid ? s.paidWarn : s.meta}>{t.paid}</div>
      {t.thankYou ? <div className={s.foot}>{t.thankYou}</div> : null}
      <div className={t.unpaid ? s.footWarn : s.foot}>{t.unpaid ? 'Please pay at the counter' : 'Show this at pickup'}</div>
    </div>
  );
}

/** Browser print at 58 mm: prints itself once shown; closes after the print dialog. */
function useAutoPrint(on: boolean, onDone: () => void) {
  useEffect(() => {
    if (!on) return undefined;
    const after = () => { onDone(); };
    window.addEventListener('afterprint', after);
    const t = setTimeout(() => { window.print(); }, CONFIG.timings.printDelayMs);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
  }, [on, onDone]);
}

/** Full-screen preview. With Web Bluetooth: Bluetooth printer or Print (58 mm); without: browser print straight away. */
export function TokenSlipPrint({ o, tip, waived, onDone }: { o: Order; tip?: Paise | undefined; waived?: Paise | undefined; onDone: () => void }) {
  const bt = canBluetoothPrint();
  const [paper] = useState(!bt);
  const [msg, setMsg] = useState('');
  const t = useSlipText(o, tip, waived);
  useAutoPrint(paper, onDone);
  const viaBt = () => {
    setMsg('Sending to the printer…');
    bluetoothPrint(escposSlip(t)).then(() => { onDone(); }, (e: unknown) => { console.warn('bluetooth print failed', e); setMsg('The printer did not answer. Check it is on and near, or use Print (58 mm).'); });
  };
  return (
    <div className={s.preview} role="dialog" aria-label="Print token">
      <SlipBody o={o} tip={tip} waived={waived} />
      {msg ? <p className={s.msg} role="status">{msg}</p> : null}
      <div className={s.btns}>
        {bt ? <button type="button" className={s.close} onClick={viaBt}>Bluetooth printer</button> : null}
        {bt ? <button type="button" className={s.close} onClick={() => { window.print(); }}>Print (58 mm)</button> : null}
        <button type="button" className={s.close} onClick={onDone}>Close</button>
      </div>
    </div>
  );
}
