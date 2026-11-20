// Icons from the locked mockups (20-polish, 21-polish2). Stroke icons use currentColor.
import type { ReactElement } from 'react';

const P = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONS = {
  check: <svg viewBox="0 0 24 24" {...P} strokeWidth="2.6"><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>,
  cross: <svg viewBox="0 0 24 24" {...P} strokeWidth="2.6"><path d="M7 7l10 10M17 7 7 17" /></svg>,
  plus: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.5"><path d="M8 3v10M3 8h10" /></svg>,
  plusBig: <svg viewBox="0 0 22 22" {...P} strokeWidth="1.4"><path d="M11 4.5v13M4.5 11h13" /></svg>,
  more: <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>,
  pencil: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.4"><path d="M11.2 2.6 13.4 4.8 6 12.2H3.8v-2.2L11.2 2.6Z" /><path d="M9.8 4 12 6.2" /></svg>,
  note: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.4"><path d="M3.5 2.5h6.2L12.5 5.3V13.5H3.5V2.5Z" /><path d="M9.5 2.5V5.3h2.8" /><path d="M5.5 8.2h5M5.5 10.8h3.5" /></svg>,
  next: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.8"><path d="M4 8h8M8.5 4.5 12 8l-3.5 3.5" /></svg>,
  back: <svg viewBox="0 0 18 18" {...P} strokeWidth="1.8"><path d="M13 9H5M8.5 5.5 5 9l3.5 3.5" /></svg>,
  backSmall: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.8"><path d="M11 8H5M8 4.5 4.5 8 8 11.5" /></svg>,
  trash: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.6"><path d="M3 4h10M6 4V3h4v1M5 4l.6 9h4.8L11 4" /></svg>,
  chevron: <svg viewBox="0 0 10 6" {...P} strokeWidth="1.4"><path d="M1.5 1.2 5 4.8 8.5 1.2" /></svg>,
  lock: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.9"><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></svg>,
  unlock: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.9"><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2" /></svg>,
  calc: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><rect x="5" y="3" width="14" height="18" rx="2.4" /><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01M8.5 18.5h.01M12 18.5h.01M15.5 18.5h.01" strokeWidth="2.4" /></svg>,
  backspace: <svg viewBox="0 0 26 20" {...P} strokeWidth="1.8"><path d="M9.2 1.6h14.3A1.9 1.9 0 0 1 25.4 3.5v13a1.9 1.9 0 0 1-1.9 1.9H9.2L1.7 10 9.2 1.6z" /><path d="M13.4 6.6 19 13.4M19 6.6l-5.6 6.8" /></svg>,
  tortillas: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M3 16a9 9 0 0 1 18 0z" /><path d="M8 12.5l1.5 1M12 10v1.5M16 12.5l-1.5 1" /></svg>,
  momos: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M4 17c0-4 3.5-8 8-8s8 4 8 8z" /><path d="M12 9c0-2 1-3 2-4M9 12c1 1 1 3 1 5M15 12c-1 1-1 3-1 5" /></svg>,
  desserts: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M7 11l5 10 5-10z" /><path d="M6.5 11a5.5 5.5 0 0 1 11 0z" /></svg>,
  sandwiches: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M3 15L12 5l9 10z" /><path d="M4 18h16" /></svg>,
  cutlets: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><ellipse cx="12" cy="12" rx="8.5" ry="6" /><path d="M8 11h1M12 9.5h1M15 12h1M10 14h1" /></svg>,
  all: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>,
  home: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z" /><path d="M9 21.5V12h6v9.5" /></svg>,
  open: <svg viewBox="0 0 16 16" {...P} strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" /></svg>,
  chevLeft: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><path d="M15 5 8 12l7 7" /></svg>,
  stWaiting: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.35" /><circle cx="12" cy="12" r="2.35" /><circle cx="19" cy="12" r="2.35" /></svg>,
  stPreparing: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><path d="M8.5 7c0-1.4.7-2.4.7-3.6M12 6.6c0-1.6.8-2.4.8-4M15.5 7c0-1.4.7-2.2.7-3.4" /><path d="M5 11h14" /><path d="M6.2 11v7.2A2.3 2.3 0 0 0 8.5 20.5h7a2.3 2.3 0 0 0 2.3-2.3V11" /><path d="M8 11V9.2h8V11" /><path d="M5 13.2H3.6c-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6H5" /><path d="M19 13.2h1.4c.9 0 1.6.7 1.6 1.6s-.7 1.6-1.6 1.6H19" /></svg>,
  stReady: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><path d="M8.2 11.2V20H5.4c-.8 0-1.4-.6-1.4-1.4v-6c0-.8.6-1.4 1.4-1.4h2.8z" /><path d="M8.2 11.2l2.6-6.2c.4-1 1.3-1.3 2-.8.7.5.8 1.3.5 2.1L12.2 11H18c1.2 0 2.1 1.1 1.9 2.3l-1.1 5.2A2 2 0 0 1 16.9 20H8.2" /></svg>,
  stHeld: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><path d="M8.2 11.2V6.4a1.5 1.5 0 0 1 3 0v4.8" /><path d="M11.2 10.6V5.2a1.5 1.5 0 0 1 3 0v6.2" /><path d="M14.2 11V6.6a1.5 1.5 0 0 1 3 0V13c0 3.6-2 6.6-5.2 6.6S6.8 16.6 6.8 13v-1.8" /><path d="M6.8 12.2 4.6 10a1.45 1.45 0 0 0-2.1 2l3.2 4" /></svg>,
  stDone: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.9"><circle cx="12" cy="12" r="8.5" /><path d="M9.4 9.3c.3-1.6 1.5-2.5 2.7-2.5 1.5 0 2.6 1 2.6 2.4 0 1.3-1 1.9-2 2.5-.6.3-.9.8-.9 1.5" /><circle cx="12" cy="16.7" r="1.05" fill="currentColor" stroke="none" /></svg>,
  stHanded: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.9"><path d="M5.2 9.2h13.6L17.6 20.5H6.4L5.2 9.2z" /><path d="M9.2 9.2V7.2a2.8 2.8 0 0 1 5.6 0v2" /></svg>,
  stPaused: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="5.5" width="13" height="13" rx="2.2" /></svg>,
  stPriority: <svg viewBox="0 0 24 24" {...P} strokeWidth="2.1"><path d="M6 13.2 12 6.6l6 6.6" /><path d="M6 19.2 12 12.6l6 6.6" /></svg>,
  beverages: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.6"><path d="M6 7h12l-1.5 13h-9z" /><path d="M13 7l2-4h3" /></svg>,
  printer: <svg viewBox="0 0 24 24" {...P} strokeWidth="1.8"><path d="M6 9V4h12v5M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></svg>,
} satisfies Record<string, ReactElement>;

export type IconName = keyof typeof ICONS;
export function Icon({ name, className }: { name: IconName; className?: string | undefined }) {
  return <span className={className} aria-hidden="true" data-icon={name}>{ICONS[name]}</span>;
}
