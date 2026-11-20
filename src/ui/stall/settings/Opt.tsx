// Shared Group and Opt components for Settings (Q-HARM-5, LFPS S1).
import type { ReactNode } from 'react';
import s from '../Stall.module.css';

export function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={s.sec}>
      <div className={s.secH}><span>{label}</span></div>
      <div className={s.card}>{children}</div>
    </section>
  );
}

interface OptProps {
  t: string;
  sub?: string | undefined;
  value?: string | undefined;
  onClick?: (() => void) | undefined;
  sw?: boolean | undefined;
  badge?: ReactNode | undefined;
}

function OptBody({ t, sub, value, onClick, sw, badge }: OptProps) {
  return (
    <>
      <span className={s.setMain}>
        <span className={s.setT}>{t}</span>
        {sub ? <span className={s.setS}>{sub}</span> : null}
      </span>
      <span className={s.setEnd}>
        {badge ? <span>{badge}</span> : null}
        {sw === undefined ? (
          <>
            <span className={onClick ? s.setV : s.setRo}>{value}</span>
            {onClick ? <span aria-hidden="true" className={s.setRo}> ›</span> : null}
          </>
        ) : (
          <span className={sw ? s.swOn : s.sw} aria-hidden="true"><span /></span>
        )}
      </span>
    </>
  );
}

export function Opt(props: OptProps) {
  const { onClick, sw } = props;
  if (!onClick) return <div className={s.setRow}><OptBody {...props} /></div>;
  return (
    <button
      type="button"
      className={s.setRow}
      role={sw === undefined ? undefined : 'switch'}
      aria-checked={sw}
      onClick={onClick}
    >
      <OptBody {...props} />
    </button>
  );
}

export const nextOpt = <T extends string>(xs: readonly T[], v: T): T =>
  xs[(xs.indexOf(v) + 1) % xs.length] ?? v;
