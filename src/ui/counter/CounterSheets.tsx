// Every Counter sheet, one owner (ARCHITECTURE §5). F-07 item, F-08 stock, F-09 notes, F-10/F-11 adjust, F-15 payees, F-18 refund, F-37 more.
import { useState } from 'react';
import { CONFIG } from '../../config';
import { formatInr, parseAddons, parseRupees, parseVariants, type Item, type Order, type Paise } from '../../contract';
import { amounts, bill, useApp } from '../../store';
import { AmountsEdit } from '../kit/AmountsEdit';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import k from '../kit/kit.module.css';
import { StallNav } from '../stall/StallNav';
import { CustomizeItemSheet } from './CustomizeItemSheet';
import {
  ItemAddonsSection,
  ItemDiscountSection,
  ItemUnitsSection,
  ItemVariantsSection,
  validateDraftOptions,
  type DraftOption,
} from './ItemEditorSections';
import { DraftsSheet, NewDaySheet, RefundLinesSheet, SlipSheet } from './P2Sheets';

const R = CONFIG.money.paisePerRupee;

function useClose() { const o = useApp((st) => st.openSheet); return () => { o(null); }; }

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className={k.field}><label className={k.fieldLab} htmlFor={id}>{label}</label>{children}</div>;
}

function Swatches({ value, onPick }: { value: number; onPick: (i: number) => void }) {
  return (
    <div className={k.field}><span className={k.fieldLab}>Colour</span>
      <div className={k.swatches} role="radiogroup" aria-label="Colour">
        {Array.from({ length: CONFIG.swatchCount }, (_, i) => (
          <button type="button" key={i} role="radio" aria-checked={value === i} aria-label={`Colour ${String(i + 1)}`} className={value === i ? k.swatchOn : k.swatch}
            style={{ '--item-accent': `var(--dl-stall-swatch-${String(i)})` } as React.CSSProperties} onClick={() => { onPick(i); }} />
        ))}
      </div>
    </div>
  );
}

/** W-03: a new item takes the station most items of its category use (not always the first station). */
function useStationFor() {
  const items = useApp((st) => st.folded.items);
  return (category: string): string | undefined => {
    const n = new Map<string, number>();
    for (const i of Object.values(items)) if (!i.removed && i.category === category && i.stationId) n.set(i.stationId, (n.get(i.stationId) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
}

/** W-03: Category is a list (no typo splits); "+ Add category…" at the end opens a box for a new one. */
function CategoryPick({ value, cats, onPick }: { value: string; cats: readonly string[]; onPick: (c: string) => void }) {
  const [adding, setAdding] = useState(cats.length === 0);
  if (adding) {
    return (
      <Field id="icat" label="New category"><input id="icat" className={k.input} value={value} maxLength={CONFIG.limits.nameMaxChars} autoComplete="off"
        onChange={(e) => { onPick(e.target.value); }} /></Field>
    );
  }
  return (
    <Field id="icat" label="Category"><select id="icat" className={k.input} value={value} onChange={(e) => { if (e.target.value === '+') { setAdding(true); onPick(''); } else onPick(e.target.value); }}>
      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="+">+ Add category…</option></select></Field>
  );
}

function ItemBasicFields({
  name, setName, price, setPrice, swatch, setSwatch, category, setCategory, cats, station, setStation, count, setCount, it, stationFor,
}: {
  name: string; setName: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  swatch: number; setSwatch: (v: number) => void;
  category: string; setCategory: (v: string) => void;
  cats: readonly string[];
  station: string; setStation: (v: string) => void;
  count: string; setCount: (v: string) => void;
  it: Item | undefined;
  stationFor: (c: string) => string | undefined;
}) {
  return (
    <>
      <Field id="iname" label="Name"><input id="iname" className={k.input} value={name} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { setName(e.target.value); }} autoComplete="off" /></Field>
      <Field id="iprice" label="Price (₹)"><input id="iprice" className={k.input} value={price} inputMode="decimal" onChange={(e) => { setPrice(e.target.value); }} /></Field>
      <Swatches value={swatch} onPick={setSwatch} />
      <CategoryPick value={category} cats={cats} onPick={(c) => { setCategory(c); if (!it) setStation(stationFor(c) ?? station); }} />
      <Field id="istation" label="Station"><select id="istation" className={k.input} value={station} onChange={(e) => { setStation(e.target.value); }}>
        {CONFIG.stations.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
      <Field id="icount" label="Stock (leave empty for no count)"><input id="icount" className={k.input} value={count} inputMode="numeric" onChange={(e) => { setCount(e.target.value.replace(/[^\d]/g, '')); }} /></Field>
    </>
  );
}

function useItemState(it: Item | undefined, cats: readonly string[]) {
  const [name, setName] = useState(it?.name ?? '');
  const [price, setPrice] = useState(it ? String(it.price / R) : '');
  const [swatch, setSwatch] = useState(it?.swatch ?? 0);
  const [category, setCategory] = useState(it?.category ?? cats[0] ?? '');
  const [station, setStation] = useState(it?.stationId ?? CONFIG.stations[0]);
  const [count, setCount] = useState(it?.count == null ? '' : String(it.count));
  const [unit, setUnit] = useState(it?.unit ?? '');
  const [secUnit, setSecUnit] = useState(it?.secondaryUnit ?? '');
  const [multiplier, setMultiplier] = useState(it?.unitMultiplier ? String(it.unitMultiplier) : '');
  const [discountPct, setDiscountPct] = useState(it?.discountPct ? String(it.discountPct) : '');
  const [variants, setVariants] = useState<readonly DraftOption[]>(() => (it ? parseVariants(it).map((v, i) => ({ id: v.id ?? String(i), name: v.name, price: String(v.price / R) })) : []));
  const [addons, setAddons] = useState<readonly DraftOption[]>(() => (it ? parseAddons(it).map((a, i) => ({ id: a.id ?? String(i), name: a.name, price: String(a.price / R) })) : []));
  const [err, setErr] = useState('');

  return {
    name, setName, price, setPrice, swatch, setSwatch, category, setCategory, station, setStation, count, setCount,
    unit, setUnit, secUnit, setSecUnit, multiplier, setMultiplier, discountPct, setDiscountPct, variants, setVariants, addons, setAddons, err, setErr,
  };
}

function serializeOptions(options: readonly DraftOption[]) {
  return JSON.stringify(options.map((o) => ({ id: o.id, name: o.name.trim(), price: parseRupees(o.price) ?? 0 })).filter((o) => o.name));
}

function ItemSheet({ itemId }: { itemId: string | null }) {
  const close = useClose();
  const it = useApp((st) => (itemId ? st.folded.items[itemId] : undefined));
  const cats = useApp((st) => [...new Set(Object.values(st.folded.items).filter((i) => !i.removed && !i.supply).map((i) => i.category).filter(Boolean))]);
  const cat = useApp((st) => st.catalog);
  const stationFor = useStationFor();
  const s = useItemState(it, cats);

  const save = () => {
    const p = parseRupees(s.price);
    if (p === null) { s.setErr('Check the price'); return; }
    const vErr = validateDraftOptions(s.variants); if (vErr) { s.setErr(vErr); return; }
    const aErr = validateDraftOptions(s.addons); if (aErr) { s.setErr(aErr); return; }
    const n = s.count.trim() === '' ? null : Number(s.count);
    if (n !== null && !Number.isSafeInteger(n)) { s.setErr('Stock must be a whole number'); return; }
    const e = cat.saveItem(itemId, {
      name: s.name, price: p, swatch: s.swatch, category: s.category, stationId: s.station, count: n,
      unit: s.unit.trim(), secondaryUnit: s.secUnit.trim(), unitMultiplier: Number(s.multiplier) || 1,
      discountPct: Math.max(0, Math.min(100, Number(s.discountPct) || 0)),
      variants: serializeOptions(s.variants), addons: serializeOptions(s.addons),
    });
    if (e) s.setErr(e); else close();
  };

  return (
    <Sheet title={it ? 'Edit item' : 'Add item'} onClose={close}>
      <ItemBasicFields {...s} it={it} cats={cats} stationFor={stationFor} />
      <ItemUnitsSection unit={s.unit} secondaryUnit={s.secUnit} unitMultiplier={s.multiplier} onUnit={s.setUnit} onSecondaryUnit={s.setSecUnit} onMultiplier={s.setMultiplier} />
      <ItemDiscountSection discountPct={s.discountPct} onDiscount={s.setDiscountPct} />
      <ItemVariantsSection variants={s.variants} onChange={s.setVariants} />
      <ItemAddonsSection addons={s.addons} onChange={s.setAddons} />
      {s.err ? <div className={k.err} role="alert">{s.err}</div> : null}
      <div className={k.row}>
        {it ? <button type="button" className={k.danger} onClick={() => { cat.removeItem(it.id); close(); }}>Remove</button> : null}
        <span className={k.grow} />
        <button type="button" className={k.quiet} onClick={close}>Cancel</button>
        <button type="button" className={k.cta} onClick={save}>Save</button>
      </div>
    </Sheet>
  );
}

function StockSheet({ itemId }: { itemId: string }) {
  const close = useClose();
  const it = useApp((st) => st.folded.items[itemId]);
  const left = useApp((st) => st.counter.available(itemId));
  const cat = useApp((st) => st.catalog);
  const openSheet = useApp((st) => st.openSheet);
  if (!it) return null;
  return (
    <Sheet label={`${it.name} stock`} onClose={close}>
      <div className={k.row}><div className={k.sheetTitle}>{it.name}</div><span className={k.grow} />
        <button type="button" className={k.quiet} onClick={() => { openSheet({ kind: 'item', itemId }); }}>Edit</button></div>
      <div className={k.stockRow}>
        <button type="button" className={k.stepBig} aria-label="One less" disabled={it.count === null || it.count <= 0} onClick={() => { cat.adjustStock(itemId, -1); }}>−</button>
        <div className={k.stockNum} aria-live="polite">{it.count === null ? 'No count' : `${String(Math.max(0, left))} left`}</div>
        <button type="button" className={k.stepBig} aria-label="One more" onClick={() => { cat.adjustStock(itemId, 1); }}>+</button>
      </div>
      {it.oversold ? <div className={k.err}>Sold more than counted. Check the stock.</div> : null}
      <div className={k.row}>
        <button type="button" className={it.soldOut ? k.quiet : k.danger} onClick={() => { cat.setSoldOut(itemId, !it.soldOut); }}>{it.soldOut ? 'Back on sale' : 'Mark sold out'}</button>
        <span className={k.grow} />
        <button type="button" className={k.cta} onClick={close}>Done</button>
      </div>
    </Sheet>
  );
}

function NoteSheet({ lineId }: { lineId: string | null }) {
  const close = useClose();
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const c = useApp((st) => st.counter);
  const line = lineId ? o?.lines.find((l) => l.lineId === lineId) : undefined;
  const [v, setV] = useState(lineId ? line?.note ?? '' : o?.note ?? '');
  if (!o || (lineId && !line)) return null;
  const save = () => { if (lineId) c.setLineNote(lineId, v); else c.setOrderNote(v); close(); };
  return (
    <Sheet title={line ? `Note for ${line.name}` : 'Order note'} onClose={close}>
      <textarea className={k.textarea} aria-label="Note" value={v} maxLength={CONFIG.limits.noteMaxChars} rows={3} onChange={(e) => { setV(e.target.value); }} placeholder={line ? 'Less sugar, no onion…' : 'For the whole order'} />
      <div className={k.hint}>{`${String(v.length)} / ${String(CONFIG.limits.noteMaxChars)}`}</div>
      <div className={k.row}>
        {v ? <button type="button" className={k.quiet} onClick={() => { setV(''); }}>Clear</button> : null}
        <span className={k.grow} />
        <button type="button" className={k.cta} onClick={save}>Done</button>
      </div>
    </Sheet>
  );
}

function RoundOff({ o }: { o: Order }) {
  const c = useApp((st) => st.counter);
  const ro = bill.roundOffAmount(o);
  const steps = useApp((st) => amounts.amounts(st.folded.settings, 'roundOffSteps'));
  const [edit, setEdit] = useState(false);
  const choices = bill.roundOffChoices(bill.preRound(o), steps);
  return (
    <>
      <div className={k.fieldLab}>Round-off on <Money p={bill.preRound(o)} /></div>
      <div className={k.choiceRow} role="radiogroup" aria-label="Round-off">
        <button type="button" role="radio" aria-checked={ro === 0} className={ro === 0 ? k.choiceOn : k.choice} onClick={() => { c.setRoundOff(0); }}>None</button>
        {choices.map((a) => (
          <button type="button" role="radio" aria-checked={ro === a} key={a} className={ro === a ? k.choiceOn : k.choice} onClick={() => { c.setRoundOff(a); }}>
            {`${a > 0 ? '+' : '−'}${formatInr(Math.abs(a))}`}
          </button>
        ))}
      </div>
      {choices.length === 0 ? null : <div className={k.hint}>Round-off is set on the current total. If the bill changes it no longer applies.</div>}
      {edit ? <AmountsEdit k="roundOffSteps" onDone={() => { setEdit(false); }} />
        : <button type="button" className={k.quiet} onClick={() => { setEdit(true); }}>{`Steps: ${steps.map((x) => formatInr(x)).join(' / ') || 'none'} · Edit`}</button>}
    </>
  );
}

function DiscountForm({ o, close }: { o: Order; close: () => void }) {
  const serving = useApp((st) => st.prefs.servingName);
  const c = useApp((st) => st.counter);
  const [kind, setKind] = useState<'amount' | 'pct'>(o.discount?.kind ?? 'amount');
  const [value, setValue] = useState(o.discount ? String(o.discount.kind === 'pct' ? o.discount.value : o.discount.value / R) : '');
  const [by, setBy] = useState(o.discount?.allowedBy ?? serving);
  const [note, setNote] = useState(o.discount?.note ?? '');
  const [err, setErr] = useState('');
  const sub = bill.subtotal(o);
  const parsed = kind === 'pct' ? Number(value || '0') : parseRupees(value || '0');
  const d = parsed !== null && Number.isFinite(parsed) && parsed > 0 ? { kind, value: parsed, allowedBy: by.trim(), note: note.trim() } : null;
  const off = bill.discountAmount(sub, d);
  const save = () => {
    if (parsed === null || !Number.isFinite(parsed) || parsed < 0 || (kind === 'pct' && parsed > 100)) { setErr(kind === 'pct' ? 'Use 0 to 100 %' : 'Check the amount'); return; }
    c.setDiscount(d);
    close();
  };
  return (
    <>
      <div className={k.choiceRow} role="radiogroup" aria-label="Discount type">
        <button type="button" role="radio" aria-checked={kind === 'amount'} className={kind === 'amount' ? k.choiceOn : k.choice} onClick={() => { setKind('amount'); }}>₹ off</button>
        <button type="button" role="radio" aria-checked={kind === 'pct'} className={kind === 'pct' ? k.choiceOn : k.choice} onClick={() => { setKind('pct'); }}>% off</button>
      </div>
      <Field id="dval" label={kind === 'pct' ? 'Percent' : 'Amount (₹)'}><input id="dval" className={k.input} inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setErr(''); }} /></Field>
      {d ? <div className={k.hint}>Takes off <Money p={off} />{bill.discountCapped(sub, d) ? ' (capped at the bill)' : ''}</div> : null}
      <Field id="dby" label="Allowed by"><input id="dby" className={k.input} value={by} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { setBy(e.target.value); }} /></Field>
      <Field id="dnote" label="Note"><input id="dnote" className={k.input} value={note} maxLength={CONFIG.limits.noteMaxChars} onChange={(e) => { setNote(e.target.value); }} /></Field>
      {err ? <div className={k.err} role="alert">{err}</div> : null}
      <div className={k.row}>
        {o.discount ? <button type="button" className={k.quiet} onClick={() => { c.setDiscount(null); close(); }}>No discount</button> : null}
        <span className={k.grow} />
        <button type="button" className={k.cta} onClick={save}>Save discount</button>
      </div>
    </>
  );
}

function AdjustSheet() {
  const close = useClose();
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  if (!o) return null;
  return (
    <Sheet title="Discount and round-off" onClose={close}>
      <DiscountForm o={o} close={close} />
      <RoundOff o={o} />
      <TipWaiveAdjust o={o} />
    </Sheet>
  );
}

function WaiveDetails({ by, note, onBy, onNote }: { by: string; note: string; onBy: (v: string) => void; onNote: (v: string) => void }) {
  return (
    <>
      <Field id="wby" label="Allowed by"><input id="wby" className={k.input} value={by} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { onBy(e.target.value); }} /></Field>
      <Field id="wnote" label="Note"><input id="wnote" className={k.input} value={note} maxLength={CONFIG.limits.noteMaxChars} onChange={(e) => { onNote(e.target.value); }} /></Field>
    </>
  );
}

function TipWaiveAdjust({ o }: { o: Order }) {
  const c = useApp((st) => st.counter);
  const draft = useApp((st) => st.ui.payDrafts?.[o.id]);
  const [tip, setTip] = useState(draft ? String(draft.tip / R) : (bill.tips(o) > 0 ? String(bill.tips(o) / R) : ''));
  const [waive, setWaive] = useState(draft ? String(draft.waived / R) : (bill.waived(o) > 0 ? String(bill.waived(o) / R) : ''));
  const [by, setBy] = useState(draft?.waivedBy ?? '');
  const [note, setNote] = useState(draft?.waivedNote ?? '');
  const tRupees = parseRupees(tip) ?? 0;
  const wRupees = parseRupees(waive) ?? 0;
  const apply = () => {
    c.setPayDraft(o.id, { tip: tRupees, waived: wRupees, waivedBy: by.trim(), waivedNote: note.trim() });
    c.toast(tRupees > 0 || wRupees > 0 ? 'Tip / waive updated' : 'Tip / waive cleared');
  };
  return (
    <>
      <div className={k.fieldLab}>Tip and waive</div>
      <div className={k.choiceRow} role="group" aria-label="Quick tip">
        {[0, 10, 20, 50].map((amt) => (
          <button type="button" key={amt} className={tRupees === amt * R ? k.choiceOn : k.choice} onClick={() => { setTip(amt > 0 ? String(amt) : ''); }}>{amt === 0 ? 'No tip' : `+₹${String(amt)}`}</button>
        ))}
      </div>
      <Field id="btip" label="Tip amount (₹)"><input id="btip" className={k.input} inputMode="numeric" placeholder="0" value={tip} onChange={(e) => { setTip(e.target.value); }} /></Field>
      <div className={k.choiceRow} role="group" aria-label="Quick waive">
        {[0, 10, 20, 50].map((amt) => (
          <button type="button" key={amt} className={wRupees === amt * R ? k.choiceOn : k.choice} onClick={() => { setWaive(amt > 0 ? String(amt) : ''); }}>{amt === 0 ? 'No waive' : `−₹${String(amt)}`}</button>
        ))}
      </div>
      <Field id="bwaive" label="Waive amount (₹)"><input id="bwaive" className={k.input} inputMode="numeric" placeholder="0" value={waive} onChange={(e) => { setWaive(e.target.value); }} /></Field>
      {wRupees > 0 ? <WaiveDetails by={by} note={note} onBy={setBy} onNote={setNote} /> : null}
      <div className={k.row}><span className={k.grow} /><button type="button" className={k.cta} onClick={apply}>Apply tip / waive</button></div>
    </>
  );
}

function PayeeSheet() {
  const close = useClose();
  const payees = useApp((st) => Object.values(st.folded.payees));
  const cat = useApp((st) => st.catalog);
  const [name, setName] = useState('');
  const [upi, setUpi] = useState('');
  const [err, setErr] = useState('');
  const add = () => { const e = cat.savePayee(null, name, upi); if (e) setErr(e); else { setName(''); setUpi(''); setErr(''); } };
  return (
    <Sheet title="UPI IDs" onClose={close}>
      {payees.length ? (
        <ul className={k.list}>{payees.map((p) => (
          <li key={p.id} className={k.listRow}><span className={k.grow}>{p.name}</span><span className={k.listVal}>{p.upiId}</span>
            <button type="button" className={k.quiet} aria-label={`Remove ${p.name}`} onClick={() => { cat.removePayee(p.id); }}>Remove</button></li>
        ))}</ul>
      ) : <div className={k.hint}>No UPI ID yet. Add one to show a QR.</div>}
      <Field id="pname" label="Name on the QR"><input id="pname" className={k.input} value={name} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { setName(e.target.value); }} /></Field>
      <Field id="pupi" label="UPI ID"><input id="pupi" className={k.input} value={upi} placeholder="name@bank" autoCapitalize="off" autoCorrect="off" maxLength={CONFIG.limits.upiIdMaxChars} onChange={(e) => { setUpi(e.target.value); }} /></Field>
      {err ? <div className={k.err} role="alert">{err}</div> : null}
      <div className={k.row}><span className={k.grow} /><button type="button" className={k.quiet} onClick={close}>Done</button><button type="button" className={k.cta} onClick={add}>Add</button></div>
    </Sheet>
  );
}

function RefundSheet() {
  const close = useClose();
  const o = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId] : undefined));
  const c = useApp((st) => st.counter);
  if (!o) return null;
  const owed: Paise = -bill.due(o);
  if (owed <= 0) return <Sheet title="Refund" onClose={close}><div className={k.hint}>Nothing to refund.</div><button type="button" className={k.cta} onClick={close}>Done</button></Sheet>;
  const go = (src: 'cash' | 'upi') => { if (c.refund(src)) { c.toast(`Refunded ${formatInr(owed)}`); } close(); };
  return (
    <Sheet title="Refund" onClose={close}>
      <div className={k.hint}>The bill went down. Give back <Money p={owed} />.</div>
      <div className={k.row}>
        <button type="button" className={k.cta} onClick={() => { go('cash'); }}>Cash back</button>
        <button type="button" className={k.cta} onClick={() => { go('upi'); }}>UPI back</button>
      </div>
    </Sheet>
  );
}

function ServingSheet() {
  const close = useClose();
  const name = useApp((st) => st.prefs.servingName);
  const setPrefs = useApp((st) => st.setPrefs);
  const [v, setV] = useState(name);
  return (
    <Sheet title="Who is serving" onClose={close}>
      <input className={k.input} aria-label="Name" value={v} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { setV(e.target.value); }} />
      <div className={k.hint}>Shown on new orders from this phone.</div>
      <div className={k.row}><span className={k.grow} /><button type="button" className={k.cta} onClick={() => { setPrefs({ servingName: v.trim().replace(/\s+/g, ' ') }); close(); }}>Done</button></div>
    </Sheet>
  );
}

function MoreSheet() {
  const close = useClose();
  const prefs = useApp((st) => st.prefs);
  const stall = useApp((st) => st.folded.settings.stallName ?? '');
  const a = useApp((st) => ({ go: st.go, setPrefs: st.setPrefs, openSheet: st.openSheet, cat: st.catalog }));
  const [name, setName] = useState(stall);
  return (
    <Sheet title="More" onClose={close}>
      <ul className={k.list}>
        <li><button type="button" className={k.listRow} onClick={() => { close(); a.go('launch'); }}>Back to start</button></li>
        <li className={k.listRow}><span className={k.grow}>Appearance</span>
          <div className={k.choiceRow} role="radiogroup" aria-label="Appearance">
            {(['night', 'day'] as const).map((t) => <button type="button" role="radio" aria-checked={prefs.theme === t} key={t} className={prefs.theme === t ? k.choiceOn : k.choice} onClick={() => { a.setPrefs({ theme: t }); }}>{t === 'night' ? 'Night' : 'Day'}</button>)}
          </div></li>
        <li><button type="button" className={k.listRow} onClick={() => { a.openSheet({ kind: 'serving' }); }}><span className={k.grow}>Serving name</span><span className={k.listVal}>{prefs.servingName || 'Add'}</span></button></li>
        <li className={k.listRow}><span className={k.grow}>Token range</span>
          <div className={k.choiceRow} role="radiogroup" aria-label="Token range">
            {CONFIG.tokens.ranges.map((r, i) => <button type="button" role="radio" aria-checked={prefs.rangeIndex === i} key={r.from} className={prefs.rangeIndex === i ? k.choiceOn : k.choice} onClick={() => { a.setPrefs({ rangeIndex: i }); }}>{`${String(r.from)}–${String(r.to)}`}</button>)}
          </div></li>
        <li><button type="button" className={k.listRow} onClick={() => { a.openSheet({ kind: 'payee' }); }}>UPI IDs</button></li>
      </ul>
      <div className={k.fieldLab}>Stall</div>
      <StallNav />
      <Field id="stallname" label="Stall name"><input id="stallname" className={k.input} value={name} maxLength={CONFIG.limits.nameMaxChars} onChange={(e) => { setName(e.target.value); }} onBlur={() => { if (name.trim() !== stall) a.cat.setSetting('stallName', name); }} /></Field>
    </Sheet>
  );
}

export function CounterSheets() {
  const sheet = useApp((st) => st.ui.sheet);
  const openSheet = useApp((st) => st.openSheet);
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'item': return <ItemSheet key={sheet.itemId ?? 'new'} itemId={sheet.itemId} />;
    case 'customizeItem': return <CustomizeItemSheet key={sheet.itemId} itemId={sheet.itemId} onClose={() => { openSheet(null); }} />;
    case 'stock': return <StockSheet itemId={sheet.itemId} />;
    case 'lineNote': return <NoteSheet key={sheet.lineId} lineId={sheet.lineId} />;
    case 'orderNote': return <NoteSheet lineId={null} />;
    case 'adjust': return <AdjustSheet />;
    case 'payee': return <PayeeSheet />;
    case 'refund': return <RefundSheet />;
    case 'serving': return <ServingSheet />;
    case 'more': return <MoreSheet />;
    case 'waived': return null; // owned by PaymentScreen (draft-local)
    case 'drafts': return <DraftsSheet />;
    case 'newDay': return <NewDaySheet />;
    case 'refundSheet': return <RefundLinesSheet key={sheet.orderId} orderId={sheet.orderId} />;
    case 'slip': return <SlipSheet orderId={sheet.orderId} tip={sheet.tip} waived={sheet.waived} />;
  }
}
