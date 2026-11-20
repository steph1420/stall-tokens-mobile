// F-41 ESC/POS bytes for the token slip (Steve 16 Nov 19:31 IST): 58 mm thermal printers, 32 columns of font A.
// Plain ASCII only (most cheap printers have no ₹ glyph, so amounts print as "Rs 120").
export interface SlipText {
  readonly stall: string;
  readonly token: string;
  readonly meta: string;
  readonly lines: readonly (readonly [string, string])[];
  readonly total: string;
  readonly paid: string;
  readonly unpaid?: boolean | undefined;
  readonly due?: string | undefined;
  readonly welcomeNote?: string | undefined;
  readonly eventName?: string | undefined;
  readonly slogan?: string | undefined;
  readonly contact?: string | undefined;
  readonly address?: string | undefined;
  readonly thankYou?: string | undefined;
}

const COLS = 32;
const ESC = 0x1b; const GS = 0x1d;
const ascii = (s: string): string => s.replace(/₹\s?/g, 'Rs ').replace(/[×]/g, 'x').replace(/[·•]/g, '-').replace(/[–—]/g, '-').replace(/[^\x20-\x7e]/g, '?');
const pair = (l: string, r: string): string => { const right = ascii(r); const left = ascii(l).slice(0, Math.max(1, COLS - right.length - 1)); return left + ' '.repeat(Math.max(1, COLS - left.length - right.length)) + right; };

/** Builds the printer bytes: init, centred stall + big token, items, total, paid line, feed and cut. */
export function escposSlip(t: SlipText): Uint8Array {
  const out: number[] = [];
  const cmd = (...b: number[]) => { out.push(...b); };
  const text = (s: string) => { for (const ch of ascii(s)) out.push(ch.charCodeAt(0)); out.push(0x0a); };
  cmd(ESC, 0x40); cmd(ESC, 0x61, 1);
  if (t.welcomeNote) text(t.welcomeNote);
  cmd(ESC, 0x45, 1); text(t.stall); cmd(ESC, 0x45, 0);
  if (t.eventName) text(t.eventName);
  if (t.slogan) text(t.slogan);
  if (t.address) text(t.address);
  if (t.contact) text(`Contact: ${t.contact}`);
  text('TOKEN');
  cmd(GS, 0x21, 0x33); text(t.token); cmd(GS, 0x21, 0x00);
  if (t.unpaid) {
    cmd(ESC, 0x45, 1); text('='.repeat(COLS));
    cmd(GS, 0x21, 0x11); text('*** UNPAID ***'); cmd(GS, 0x21, 0x00);
    text(t.due ? `Please pay ${t.due} at counter` : 'Please pay at counter');
    text('='.repeat(COLS)); cmd(ESC, 0x45, 0);
  }
  text(t.meta);
  cmd(ESC, 0x61, 0); text('-'.repeat(COLS));
  for (const [l, r] of t.lines) text(pair(l, r));
  text('-'.repeat(COLS));
  cmd(ESC, 0x45, 1); text(pair('Total', t.total)); cmd(ESC, 0x45, 0);
  cmd(ESC, 0x61, 1); text(t.paid);
  if (t.thankYou) text(t.thankYou);
  text(t.unpaid ? 'Please pay at the counter' : 'Show this at pickup');
  cmd(ESC, 0x64, 4); cmd(GS, 0x56, 0x42, 0x00);
  return Uint8Array.from(out);
}
