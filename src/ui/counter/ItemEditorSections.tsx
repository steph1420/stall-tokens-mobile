// Helper sections for editing Units, Discounts, Variants and Add-ons in ItemSheet.
import { parseRupees } from '../../contract';
import k from '../kit/kit.module.css';
import ic from './ItemCustom.module.css';

export interface DraftOption {
  readonly id: string;
  readonly name: string;
  readonly price: string;
}

const COMMON_UNITS = ['Plate', 'Pcs', 'Cup', 'Glass', 'Kg', 'Portion', 'Box'];
const COMMON_DISCOUNTS = [0, 5, 10, 15, 20];

function SecondaryUnitFields({
  secondaryUnit,
  unitMultiplier,
  onSecondaryUnit,
  onMultiplier,
}: {
  secondaryUnit: string;
  unitMultiplier: string;
  onSecondaryUnit: (u: string) => void;
  onMultiplier: (m: string) => void;
}) {
  return (
    <div className={k.row}>
      <div className={[k.field, k.grow].join(' ')}>
        <label className={k.fieldLab} htmlFor="isecunit">Secondary unit (optional)</label>
        <input id="isecunit" className={k.input} placeholder="e.g. Half" value={secondaryUnit} onChange={(e) => { onSecondaryUnit(e.target.value); }} />
      </div>
      <div className={k.field} style={{ width: '6.5rem' }}>
        <label className={k.fieldLab} htmlFor="imult">Multiplier</label>
        <input id="imult" className={k.input} inputMode="decimal" placeholder="0.5" value={unitMultiplier} onChange={(e) => { onMultiplier(e.target.value); }} />
      </div>
    </div>
  );
}

export function ItemUnitsSection({
  unit,
  secondaryUnit,
  unitMultiplier,
  onUnit,
  onSecondaryUnit,
  onMultiplier,
}: {
  unit: string;
  secondaryUnit: string;
  unitMultiplier: string;
  onUnit: (u: string) => void;
  onSecondaryUnit: (u: string) => void;
  onMultiplier: (m: string) => void;
}) {
  return (
    <div className={ic.section}>
      <div className={ic.secTitle}>Unit of measurement</div>
      <div className={ic.pillRow}>
        {COMMON_UNITS.map((u) => (
          <button
            key={u}
            type="button"
            className={unit === u ? ic.unitPillOn : ic.unitPill}
            onClick={() => { onUnit(unit === u ? '' : u); }}
          >
            {u}
          </button>
        ))}
      </div>
      <div className={k.field}>
        <label className={k.fieldLab} htmlFor="iunit">Custom primary unit</label>
        <input id="iunit" className={k.input} placeholder="e.g. Bowl, Roll, Set" value={unit} onChange={(e) => { onUnit(e.target.value); }} />
      </div>
      <SecondaryUnitFields secondaryUnit={secondaryUnit} unitMultiplier={unitMultiplier} onSecondaryUnit={onSecondaryUnit} onMultiplier={onMultiplier} />
    </div>
  );
}

export function ItemDiscountSection({
  discountPct,
  onDiscount,
}: {
  discountPct: string;
  onDiscount: (d: string) => void;
}) {
  const cur = Number(discountPct) || 0;
  return (
    <div className={ic.section}>
      <div className={ic.secTitle}>Item discount (%)</div>
      <div className={ic.pillRow}>
        {COMMON_DISCOUNTS.map((pct) => (
          <button
            key={pct}
            type="button"
            className={cur === pct ? ic.unitPillOn : ic.unitPill}
            onClick={() => { onDiscount(pct > 0 ? String(pct) : ''); }}
          >
            {pct === 0 ? 'No discount' : `${String(pct)}% off`}
          </button>
        ))}
      </div>
      <div className={k.field}>
        <label className={k.fieldLab} htmlFor="idisc">Custom % off</label>
        <input id="idisc" className={k.input} inputMode="numeric" placeholder="0 to 100" value={discountPct} onChange={(e) => { onDiscount(e.target.value); }} />
      </div>
    </div>
  );
}

export function ItemVariantsSection({
  variants,
  onChange,
}: {
  variants: readonly DraftOption[];
  onChange: (v: readonly DraftOption[]) => void;
}) {
  const add = () => {
    onChange([...variants, { id: String(Date.now()), name: '', price: '' }]);
  };
  const update = (idx: number, patch: Partial<DraftOption>) => {
    onChange(variants.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };
  const remove = (idx: number) => {
    onChange(variants.filter((_, i) => i !== idx));
  };

  return (
    <div className={ic.section}>
      <div className={ic.secTitle}>Variants (Sizes / Portions)</div>
      {variants.map((v, i) => (
        <div key={v.id} className={ic.customRow}>
          <input className={ic.customInput} placeholder="Variant name (e.g. Half)" value={v.name} onChange={(e) => { update(i, { name: e.target.value }); }} />
          <input className={ic.customPrice} inputMode="decimal" placeholder="Price (₹)" value={v.price} onChange={(e) => { update(i, { price: e.target.value }); }} />
          <button type="button" className={ic.customDel} onClick={() => { remove(i); }} aria-label="Remove variant">×</button>
        </div>
      ))}
      <button type="button" className={ic.addBtn} onClick={add}>+ Add variant</button>
    </div>
  );
}

export function ItemAddonsSection({
  addons,
  onChange,
}: {
  addons: readonly DraftOption[];
  onChange: (a: readonly DraftOption[]) => void;
}) {
  const add = () => {
    onChange([...addons, { id: String(Date.now()), name: '', price: '' }]);
  };
  const update = (idx: number, patch: Partial<DraftOption>) => {
    onChange(addons.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };
  const remove = (idx: number) => {
    onChange(addons.filter((_, i) => i !== idx));
  };

  return (
    <div className={ic.section}>
      <div className={ic.secTitle}>Add-ons (Extras / Toppings)</div>
      {addons.map((a, i) => (
        <div key={a.id} className={ic.customRow}>
          <input className={ic.customInput} placeholder="Add-on name (e.g. Extra Cheese)" value={a.name} onChange={(e) => { update(i, { name: e.target.value }); }} />
          <input className={ic.customPrice} inputMode="decimal" placeholder="+ Price (₹)" value={a.price} onChange={(e) => { update(i, { price: e.target.value }); }} />
          <button type="button" className={ic.customDel} onClick={() => { remove(i); }} aria-label="Remove addon">×</button>
        </div>
      ))}
      <button type="button" className={ic.addBtn} onClick={add}>+ Add addon</button>
    </div>
  );
}

export function validateDraftOptions(options: readonly DraftOption[]): string | null {
  for (const opt of options) {
    if (opt.name.trim() && parseRupees(opt.price) === null) {
      return `Check price for "${opt.name}"`;
    }
  }
  return null;
}
