// F-41 ESC/POS slip bytes: init, big token, 32-column ASCII lines with "Rs", feed and cut.
import { describe, expect, it } from 'vitest';
import { escposSlip } from './escpos';

describe('ESC/POS token slip (F-41)', () => {
  it('builds printer bytes a 58 mm printer understands', () => {
    const b = escposSlip({ stall: 'Momo Corner', token: '046', meta: '19:41 · Priya', lines: [['Veg momos ×2', '₹120'], ['A very long item name that goes on', '₹60']], total: '₹180', paid: 'Paid · UPI' });
    expect([...b.slice(0, 2)]).toEqual([0x1b, 0x40]);
    expect([...b.slice(-4)]).toEqual([0x1d, 0x56, 0x42, 0x00]);
    const text = new TextDecoder('ascii').decode(b);
    expect(text).toContain(`Veg momos x2${' '.repeat(14)}Rs 120`);
    expect(text.split('\n').filter((l) => l.includes('Rs 60'))[0]).toHaveLength(32);
    expect([...b].every((x) => x < 0x80)).toBe(true);
  });

  it('prints prominent UNPAID badge and customer payment message when unpaid', () => {
    const b = escposSlip({
      stall: 'Momo Corner', token: '046', meta: '19:41 · Priya',
      lines: [['Veg momos ×2', '₹120']], total: '₹120', paid: 'UNPAID · Please pay Rs 120',
      unpaid: true, due: 'Rs 120',
    });
    const text = new TextDecoder('ascii').decode(b);
    expect(text).toContain('*** UNPAID ***');
    expect(text).toContain('Please pay Rs 120 at counter');
    expect(text).toContain('Please pay at the counter');
  });
});
