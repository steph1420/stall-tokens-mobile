// Customize item sheet: select variant and optional add-ons before adding to cart.
import { useState } from 'react';
import { calcItemPrice, formatInr, formatItemCustomName, parseAddons, parseVariants, type ItemAddon, type ItemVariant } from '../../contract';
import { useApp } from '../../store';
import { Money } from '../kit/Money';
import { Sheet } from '../kit/Sheet';
import k from '../kit/kit.module.css';
import ic from './ItemCustom.module.css';

function VariantPicker({
  variants,
  selected,
  onSelect,
}: {
  variants: readonly ItemVariant[];
  selected: ItemVariant | null;
  onSelect: (v: ItemVariant) => void;
}) {
  if (variants.length === 0) return null;
  return (
    <div className={ic.section}>
      <div className={ic.secTitle}>Choose variant</div>
      {variants.map((v) => {
        const vKey = v.id ?? v.name;
        const isSel = (selected?.id ?? selected?.name) === vKey;
        return (
          <button
            key={vKey}
            type="button"
            className={isSel ? ic.variantCardOn : ic.variantCard}
            onClick={() => { onSelect(v); }}
          >
            <span className={ic.variantName}>{v.name}</span>
            <span className={ic.variantPrice}>{formatInr(v.price)}</span>
          </button>
        );
      })}
    </div>
  );
}

function AddonPicker({
  addons,
  selected,
  onToggle,
}: {
  addons: readonly ItemAddon[];
  selected: readonly string[];
  onToggle: (key: string) => void;
}) {
  if (addons.length === 0) return null;
  return (
    <div className={ic.section}>
      <div className={ic.secTitle}>Add-ons</div>
      {addons.map((a) => {
        const aKey = a.id ?? a.name;
        const on = selected.includes(aKey);
        return (
          <button
            key={aKey}
            type="button"
            className={on ? ic.addonCardOn : ic.addonCard}
            onClick={() => { onToggle(aKey); }}
          >
            <div className={ic.addonCheck}>
              <span>{on ? '☑' : '☐'}</span>
              <span>{a.name}</span>
            </div>
            <span className={ic.addonPrice}>{`+${formatInr(a.price)}`}</span>
          </button>
        );
      })}
    </div>
  );
}

function QtyStepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className={ic.qtyRow}>
      <span className={ic.qtyLabel}>Quantity</span>
      <div className={ic.qtyStepper}>
        <button
          type="button"
          className={ic.qtyBtn}
          disabled={qty <= 1}
          onClick={() => { onChange(Math.max(1, qty - 1)); }}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className={ic.qtyVal}>{qty}</span>
        <button
          type="button"
          className={ic.qtyBtn}
          onClick={() => { onChange(qty + 1); }}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
}

function CustHeader({ it }: { it: { name: string; price: number; unit?: string; discountPct?: number } }) {
  return (
    <div className={ic.custHeader}>
      <div className={ic.custTitleRow}>
        <span className={ic.custName}>{it.name}</span>
        <Money p={it.price} className={ic.custBasePrice} />
      </div>
      <div className={ic.custSub}>
        {it.unit ? <span>Unit: {it.unit}</span> : null}
        {it.discountPct && it.discountPct > 0 ? <span>{it.discountPct}% off</span> : null}
      </div>
    </div>
  );
}

function CustFooter({ total, onClose, onAdd }: { total: number; onClose: () => void; onAdd: () => void }) {
  return (
    <div className={ic.totalRow}>
      <div className={ic.totalMeta}>
        <span className={ic.totalLab}>Total</span>
        <Money p={total} className={ic.totalAmt} />
      </div>
      <div className={k.row}>
        <button type="button" className={k.quiet} onClick={onClose}>Cancel</button>
        <button type="button" className={k.cta} onClick={onAdd}>Add to order</button>
      </div>
    </div>
  );
}

export function CustomizeItemSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const it = useApp((st) => st.folded.items[itemId]);
  const c = useApp((st) => st.counter);
  const variants = it ? parseVariants(it) : [];
  const addons = it ? parseAddons(it) : [];
  const [selVar, setSelVar] = useState<ItemVariant | null>(variants[0] ?? null);
  const [selAddons, setSelAddons] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  if (!it) return null;

  const chosenAddons = addons.filter((a) => selAddons.includes(a.id ?? a.name));
  const unitPrice = calcItemPrice(it.price, selVar, chosenAddons, it.discountPct);
  const customName = formatItemCustomName(it.name, selVar, chosenAddons);
  const toggleAddon = (id: string) => {
    setSelAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const handleAdd = () => {
    for (let i = 0; i < qty; i++) c.addItemCustom(it.id, customName, unitPrice);
    c.toast(`Added ${String(qty)}x ${customName}`);
    onClose();
  };

  return (
    <Sheet title="Customize item" onClose={onClose}>
      <CustHeader it={it} />
      <VariantPicker variants={variants} selected={selVar} onSelect={setSelVar} />
      <AddonPicker addons={addons} selected={selAddons} onToggle={toggleAddon} />
      <QtyStepper qty={qty} onChange={setQty} />
      <CustFooter total={unitPrice * qty} onClose={onClose} onAdd={handleAdd} />
    </Sheet>
  );
}
