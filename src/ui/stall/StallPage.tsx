// D-NAV Stall screens (Money, Settle up, Stock, History, Settings, Open the stall) share one page shell: Back, title,
// optional right action, a scrolling body and an optional bottom bar. Interaction owner for Back on these screens (§5).
import type { ReactNode } from 'react';
import { useApp } from '../../store';
import { Icon } from '../kit/Icon';
import s from './Stall.module.css';

export function StallPage({ title, right, bar, children }: { title: string; right?: ReactNode; bar?: ReactNode; children: ReactNode }) {
  const close = useApp((st) => st.closeStall);
  const go = useApp((st) => st.go);
  return (
    <div className={s.page}>
      <header className={s.top}>
        <button type="button" className={s.back} aria-label="Back" onClick={close}><Icon name="chevLeft" /></button>
        <button type="button" className={s.homeBtn} aria-label="Home screen" title="Home screen" onClick={() => { go('launch'); }}><Icon name="home" /></button>
        <h1 className={s.title}>{title}</h1>
        {right}
      </header>
      <main className={s.body}>{children}</main>
      {bar ? <div className={s.bar}>{bar}</div> : null}
    </div>
  );
}

export function Section({ label, children, right }: { label: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className={s.sec}>
      <div className={s.secH}><span>{label}</span>{right}</div>
      <div className={s.card}>{children}</div>
    </section>
  );
}
