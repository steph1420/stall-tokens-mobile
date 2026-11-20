// Bottom sheet: one owner for every sheet's open/close (ARCHITECTURE §5).
// Standing rule: draggable handle, closes on tap outside, closes with a downward flick.
// Accessibility: focus trapped inside modal dialog (WCAG 2.1.2 / 2.4.3, FIND-UI-04).
import { useEffect, useRef, type ReactNode } from 'react';
import s from './kit.module.css';
import { useSheetDrag } from './sheetDrag';

const FOCUSABLE_SEL = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(e: KeyboardEvent, el: HTMLElement) {
  if (e.key !== 'Tab') return;
  const nodes = el.querySelectorAll<HTMLElement>(FOCUSABLE_SEL);
  if (nodes.length === 0) { e.preventDefault(); return; }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
}

export function Sheet({ title, onClose, children, label }: { title?: string; label?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (el) {
      // Only set initial focus on mount if nothing inside is already focused.
      // Crucial: never steal focus while the user is actively typing in an input/textarea!
      if (!el.contains(document.activeElement)) {
        const nonInput = el.querySelector<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
        if (nonInput) {
          nonInput.focus();
        } else {
          el.focus();
        }
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      else if (el) trapFocus(e, el);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []); // Run on mount only
  const { y, handle } = useSheetDrag(onClose);
  return (
    <div className={s.sheetWrap}>
      <button type="button" className={s.scrim} aria-label="Close" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={s.sheet} role="dialog" aria-modal="true" aria-label={label ?? title} style={{ transform: `translateY(${String(y)}px)` }}>
        <div className={s.grab} aria-hidden="true" {...handle} />
        {title ? <div className={s.sheetTitle}>{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
