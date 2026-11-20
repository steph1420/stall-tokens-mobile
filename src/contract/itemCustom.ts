import type { Paise } from './money';
import type { ItemAddon, ItemVariant } from './op';
import type { Item } from './state';

function isCustomOption(v: unknown): v is { id?: string; name: string; price: number } {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === 'string' && typeof o.price === 'number';
}

export function parseVariants(item: Pick<Item, 'variants'>): ItemVariant[] {
  if (!item.variants) return [];
  try {
    const parsed: unknown = JSON.parse(item.variants);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomOption);
  } catch (err) {
    console.warn('Failed to parse item variants', err);
    return [];
  }
}

export function parseAddons(item: Pick<Item, 'addons'>): ItemAddon[] {
  if (!item.addons) return [];
  try {
    const parsed: unknown = JSON.parse(item.addons);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomOption);
  } catch (err) {
    console.warn('Failed to parse item addons', err);
    return [];
  }
}

export function calcItemPrice(
  basePrice: Paise,
  variant?: ItemVariant | null,
  addons?: readonly ItemAddon[],
  discountPct?: number
): Paise {
  const price = variant ? variant.price : basePrice;
  const addonsTotal = (addons ?? []).reduce((sum, a) => sum + a.price, 0);
  const sub = price + addonsTotal;
  const disc = discountPct && discountPct > 0 ? Math.round((sub * Math.min(100, discountPct)) / 100) : 0;
  return Math.max(0, sub - disc);
}

export function formatItemCustomName(
  baseName: string,
  variant?: ItemVariant | null,
  addons?: readonly ItemAddon[]
): string {
  const parts: string[] = [baseName];
  if (variant && variant.name.trim()) {
    parts.push(`(${variant.name.trim()})`);
  }
  if (addons && addons.length > 0) {
    const addonNames = addons.map((a) => a.name.trim()).filter(Boolean).join(', ');
    if (addonNames) {
      parts.push(`+ ${addonNames}`);
    }
  }
  return parts.join(' ');
}
