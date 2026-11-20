# Architectural Specification: Mobile Menu Screen (POS)
**Stall App Mobile — High-Throughput Fair Stall Counter Architecture**  
**Author:** Menu Screen Architect  
**Target Viewports:** Mobile Portrait (360×780, 390×844, 412×915), Mobile Landscape (667×375, 844×390), & Tablet Split-Pane (640px+ Left Pane)  
**Standard Compliance:** Apple Human Interface Guidelines (HIG), Industrial POS Usability Standards, WCAG AAA  
**Location:** `src/ui/counter/menu/` (`MenuScreen.tsx`, `Menu.module.css`), `src/ui/counter/CounterShell.tsx`, `src/ui/counter/Counter.module.css`

---

## 1. Executive Summary & Ergonomic Context

### 1.1 The Operational Environment: Front of the Fair Stall Counter
The Counter Menu Screen in a high-velocity festival/fair food stall operates under extreme front-line conditions that demand instantaneous tactile clarity:
1. **Single-Handed Thumb Operation**: The cashier frequently operates the mobile terminal with one hand (thumb-driven navigation) while the other hand handles physical cash, bags, paper token slips, or customer communication.
2. **High Transaction Cadence**: Average ordering window is 10–20 seconds per customer. Any latency, sluggish animation, modal obstruction, or missed tap cascades into long queue times.
3. **Severe Ambient Glare**: Direct sunlight or flickering stall string lights require high-contrast visual signifiers, prominent numeric badges, and bold typography.
4. **Physical Spatial Constraints**: Standard smartphones (360px–412px viewport width) provide limited screen real estate. Controls must strictly prioritize the natural "thumb zone" (bottom 40% of the screen) while keeping navigation tools easily reachable without visual clutter.

---

## 2. Mobile UX Principles: Streaming / Media Mental Models Applied to POS

Modern consumer media applications (Spotify, YouTube, Netflix) have spent years perfecting mobile navigation for high-density catalog browsing and media playback. Stall App Mobile translates these battle-tested interaction paradigms directly into POS workflows:

```
┌────────────────────────────────────────────────────────┐
│                   COUNTER HEADER                       │
│  [New Orders (Menu | Billing | Payment)]  [Drafts 2]  │
├────────────────────────────────────────────────────────┤
│  NETFLIX HORIZONTAL CATEGORY RIBBON                    │
│  ( [All]  [Tacos]  [Burritos]  [Drinks] ... [⋯ Tools] ) │
├────────────────────────────────────────────────────────┤
│  2-COLUMN TACTILE TOUCH GRID                           │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │▌ Masala Dosa     [ 2 ]│  │▌ Paneer Roll          │  │
│  │  ₹80.00    3 left     │  │  ₹120.00   No count   │  │
│  │             [ - 2 + ] │  │                       │  │
│  └───────────────────────┘  └───────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │▌ Mango Lassi          │  │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │  │
│  │  ₹60.00    Sold out   │  │        [ + ]          │  │
│  │  (Dimmed 42% opacity) │  │       ADD ITEM        │  │
│  └───────────────────────┘  │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │  │
├────────────────────────────────────────────────────────┤
│  SPOTIFY / YOUTUBE FLOATING ISLAND CART DOCK           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ₹240.00 · 3 items                   [Billing >] │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 2.1 The Spotify Mini-Player / YouTube Floating Player Paradigm
In consumer media apps, when media is active, a persistent compact player floats in the lower thumb zone. Tapping it seamlessly expands into the full playback interface without losing context.

#### The POS Architectural Translation:
- **The Floating Island Cart Dock (`.bar`)**:
  - Floats persistently in the bottom thumb zone above `env(safe-area-inset-bottom)`.
  - Displays instant live order telemetry: Formatted subtotal (`.total`) in tabular display numerals + item count (`.count`).
  - Single-tap advancement CTA (`.next`): "Billing >" with 48px+ touch target.
  - Dynamic state transition:
    - When `count === 0`: CTA is gracefully disabled (`opacity: 0.45; box-shadow: none; pointer-events: none`).
    - When `count > 0`: CTA ignites with vibrant gradient fill (`var(--dl-stall-cta)`), luminous glow (`var(--dl-stall-cta-shadow)`), and tactile active scaling (`scale(0.97)`).
  - Anti-Occlusion Scroll Padding: The grid container enforces `padding-bottom: 4.5rem` ensuring the bottom row of menu cards is never hidden behind the floating dock.

### 2.2 The Netflix / Spotify Horizontal Ribbon Paradigm
Horizontal category ribbons enable instant thumb-swiping across large catalogs without forcing hierarchical sub-page navigation.

#### The POS Architectural Translation:
- **Horizontal Category Ribbon (`.ribbonRow`, `.ribbon`)**:
  - Pinned directly under the Counter shell header.
  - Native momentum friction: `-webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;`.
  - Zero scrollbar clutter: `scrollbar-width: none; ::-webkit-scrollbar: none`.
  - Active pill selection (`.pillOn`): Distinct cyan aura (`box-shadow: 0 0 0.5rem color-mix(in srgb, var(--dl-color-accent) 30%, transparent)`), high-contrast display text, and tactile active press (`scale(0.96)`).
  - Edge Masking: Soft gradient fade on right/left edges indicates scrollability.

### 2.3 The Tactile 2-Column Touch Grid
- **Geometry**: Responsive 2-column layout (`grid-template-columns: 1fr 1fr; gap: 0.5rem;`).
- **Touch Target Sizing**: Minimum card height `5.75rem` (92px), far exceeding the 44px HIG minimum.
- **Whole-Card Tap-to-Add**: The entire surface is a hit target (`.hit`) enabling blind, effortless tapping during customer conversation.
- **Micro-Feedback**: Instant visual contraction (`scale(0.96)`) on pointer down, backed by a 14ms tactile buzz (`buzz(haptics, 'tap')`).
- **Selected State Elevation (`.isIn`)**: Card background dynamically mixes with the station swatch accent (`var(--item-accent)` at 13% mix) and illuminates a perimeter accent ring.
- **Quantity Badge Pill (`.badgePill`)**: Elevated cyan badge in top-right corner displaying current item count in tabular bold numerals.

### 2.4 Press-and-Hold (600ms) Stock Quick Sheet
- **Operational Need**: Cashiers must instantly adjust inventory counts or mark items sold out without abandoning the current draft order or navigating into Settings.
- **Interaction Engine**: Powered by `usePress(onTap, onHold, HOLD.durationMs)`:
  - 600ms hold threshold (`HOLD.durationMs: 600ms`).
  - Gesture discrimination: Pointer travel > 10px (`CONFIG.gesture.moveCancelPx: 10`) immediately cancels the hold timer, delegating cleanly to native vertical scrolling.
  - Tactile confirmation: Double buzz (`buzz(haptics, 'hold')`).
  - Opens `StockSheet` (`openSheet({ kind: 'stock', itemId })`) allowing inline count adjustments, "Mark sold out" / "Back on sale" toggles, and direct item editing.

### 2.5 Inline Card Stepper (- / qty / +)
- **Anchoring**: Anchored to the bottom right of the card (`.qty`) once `qty > 0`.
- **Event Isolation**: `e.stopPropagation()` on both `+` and `−` buttons prevents unintended whole-card tap-to-add re-triggering.
- **Zero-Dropoff Transition**: Decrementing from 1 to 0 cleanly unmounts the stepper, removes the `.isIn` highlight, and updates the Cart Dock instantly.
- **Stock Depletion Protection**: If inventory reaches 0, the `+` button rejects increments and surfaces a calm toast notification (`${it.name} is sold out`).

### 2.6 Line Note Pencil Button
- **Access**: Appears in top-right of card when `qty > 0`.
- **Feedback**: Highlights in accent color (`.pencilHas`) if a note exists; displays note preview snippet (`.snippet`) in italicized text in the card body.
- **Tap**: Opens `NoteSheet` for custom prep instructions ("Extra spicy", "No onion", "Jain prep").

### 2.7 Search & Sort Collapsible Tool Strip
- **Non-Intrusive Trigger**: Quiet toggle button (`.toolBtn`, `Icon name="more"`) appears only when the catalog has more than 8 items (`CONFIG.menu.searchFrom = 8`).
- **STRICT Keyboard Rule (Zero Auto-Focus)**: `autoFocus={false}` is strictly mandated. Expanding the tool strip must NEVER trigger the mobile virtual keyboard automatically. The keyboard must only appear when the cashier explicitly taps into the search input.
- **iOS Safari Safeguard**: `font-size: 1rem` (16px) is enforced on inputs to prevent iOS Safari from automatically zooming into the page.
- **Sort Options**: "Menu order" (custom index), "A to Z" (alphabetical), and "Most sold today" (live aggregate from today's orders).

---

## 3. Inter-Screen Contract Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STORE & DATA LAYER (Folded)                    │
│  - folded.items (catalog items)                                       │
│  - folded.orders[orderId] (active order lines & draft state)          │
│  - counter.available(itemId) (live stock calculation)                 │
│  - prefs.haptics (tactile vibration level)                            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     COUNTER SHELL (Header)      │   │          MENU SCREEN            │
│  - Synchronizes Top Tabs        │   │  - 2-Col Grid & Category Ribbon │
│  - CurrentLine ("3 items")      │◄──┤  - Cart Dock (Total + Subtotal) │
│  - Drafts Pill Badge            │   │  - Stock Hold & Inline Stepper  │
└─────────────────────────────────┘   └─────────────────┬───────────────┘
                                                        │
                                                        │ (onBilling)
                                                        ▼
                                      ┌─────────────────────────────────┐
                                      │         BILLING SCREEN          │
                                      │  - Full Order Line Table        │
                                      │  - Rate, Amount, Discounts      │
                                      │  - Send to Kitchen / Pay Flow   │
                                      └─────────────────────────────────┘
```

### 3.1 What Menu Screen Requires (Inbound Contract)
| State / Method | Source | Purpose |
|---|---|---|
| `folded.items` | `useApp((st) => st.folded.items)` | Filtered for `!i.removed && !i.supply` to build the active menu grid. |
| `folded.orders[orderId]?.lines` | `useApp((st) => st.folded.orders[st.ui.orderId])` | Active line items to derive item quantities, draft notes, and totals. |
| `counter.available(itemId)` | `useApp((st) => st.counter.available)` | Real-time stock calculation accounting for all draft lines on all terminals. |
| `prefs.haptics` | `useApp((st) => st.prefs.haptics)` | Active vibration profile ('off' \| 'light' \| 'normal' \| 'strong'). |
| `openSheet` | `useApp((st) => st.openSheet)` | Dispatcher for Stock quick sheet, Line Note sheet, and Add Item sheet. |
| `counter.addItem(itemId)` | `src/store/counter.ts` | Dispatches `line.add` or increments existing draft line quantity. |
| `counter.removeItem(itemId)` | `src/store/counter.ts` | Decrements latest editable draft line quantity. |

### 3.2 What Menu Screen Provides to Billing (Outbound Contract)
- **Persisted Order Lines**: Dispatches valid `Line` records into the active order:
  ```typescript
  interface Line {
    lineId: string;
    itemId: string;
    name: string;
    price: Paise; // integers, 100 paise = ₹1
    category: string;
    stationId: string;
    qty: number;
    committed: number;
    status: 'draft' | 'waiting' | 'preparing' | 'ready' | 'handed';
    note: string;
  }
  ```
- **Seamless Page Handoff**: Calling `c.setPage('billing')` updates `ui.pages[orderId] = 'billing'`, allowing BillingScreen to render the lines without data loss or re-fetching.

### 3.3 What Menu Screen Provides to Counter Shell
- **Real-Time Cart Aggregation**:
  - Total item count: `count = order.lines.reduce((n, l) => n + l.qty, 0)`
  - Order subtotal: `subtotal = bill.subtotal(order)`
- **Header Synchronization**: The CounterShell header immediately reflects order progression: `Token #001 · new order · 3 items`.

---

## 4. Component Architecture & Implementation Details

### 4.1 Card Stepper Component (`CardStepper`)
```tsx
function CardStepper({ name, qty, onInc, onDec }: {
  name: string;
  qty: number;
  onInc: () => void;
  onDec: () => void;
}) {
  if (qty <= 0) return null;
  return (
    <div className={s.qty} role="group" aria-label={`Quantity stepper for ${name}`}>
      <button
        type="button"
        className={s.qb}
        aria-label={`One less ${name}`}
        onClick={(e) => { e.stopPropagation(); onDec(); }}
      >
        −
      </button>
      <span className={s.qn} aria-live="polite">{qty}</span>
      <button
        type="button"
        className={s.qb}
        aria-label={`One more ${name}`}
        onClick={(e) => { e.stopPropagation(); onInc(); }}
      >
        +
      </button>
    </div>
  );
}
```

### 4.2 Menu Card Component (`Card`)
```tsx
function Card({ it }: { it: Item }) {
  const c = useApp((st) => st.counter);
  const haptics = useApp((st) => st.prefs.haptics);
  const openSheet = useApp((st) => st.openSheet);
  const lines = useApp((st) => (st.ui.orderId ? st.folded.orders[st.ui.orderId]?.lines : undefined)) ?? [];
  const mine = lines.filter((l) => l.itemId === it.id);
  const qty = mine.reduce((n, l) => n + l.qty, 0);
  const note = [...mine].reverse().find((l) => l.status === 'draft' && l.note)?.note ?? mine.find((l) => l.note)?.note ?? '';
  const left = useApp((st) => (it.count === null ? Number.POSITIVE_INFINITY : st.counter.available(it.id)));
  const badge = stockLabel(it, left);

  const press = usePress(
    () => { buzz(haptics, 'tap'); c.addItem(it.id); },
    () => { buzz(haptics, 'hold'); openSheet({ kind: 'stock', itemId: it.id }); }
  );

  const noteLine = [...mine].reverse().find((l) => l.status === 'draft') ?? mine[mine.length - 1];
  const cls = [s.card, qty > 0 ? s.isIn : '', badge?.tone === 'out' ? s.isOut : ''].join(' ');

  return (
    <article className={cls} style={{ '--item-accent': `var(--dl-stall-swatch-${String(it.swatch)})` } as React.CSSProperties}>
      <div role="button" tabIndex={0} className={s.hit} aria-label={`${it.name}, add one${badge ? `, ${badge.text}` : ''}`} {...press} />
      <span className={s.accent} />
      <div className={s.cardTop}>
        <div className={s.name}>{it.name}</div>
        {qty > 0 ? <span className={s.badgePill} aria-label={`${String(qty)} added`}>{qty}</span> : null}
      </div>
      <div className={s.cardMid}>
        <Money p={it.price} className={s.price} />
        {badge && qty === 0 ? <div className={badge.tone === 'low' ? s.stockLow : badge.tone === 'out' ? s.stockOut : s.stock}>{badge.text}</div> : null}
        {note ? <div className={s.snippet}>{note}</div> : null}
      </div>
      {qty > 0 && noteLine ? (
        <button
          type="button"
          className={note ? s.pencilHas : s.pencil}
          aria-label={note ? `Edit note: ${note}` : 'Add note'}
          onClick={(e) => { e.stopPropagation(); openSheet({ kind: 'lineNote', lineId: noteLine.lineId }); }}
        >
          <Icon name="pencil" />
        </button>
      ) : null}
      <CardStepper name={it.name} qty={qty} onInc={() => { c.addItem(it.id); }} onDec={() => { c.removeItem(it.id); }} />
    </article>
  );
}
```

### 4.3 Category Ribbon Component (`CategoryRibbon`)
```tsx
function CategoryRibbon({ categories, cat, onSelect, showTool, onToggleTool }: {
  categories: readonly string[];
  cat: string;
  onSelect: (c: string) => void;
  showTool: boolean;
  onToggleTool: () => void;
}) {
  return (
    <div className={s.ribbonRow}>
      {categories.length > 0 ? (
        <div className={s.ribbon} role="tablist" aria-label="Categories">
          <button
            type="button"
            role="tab"
            aria-selected={cat === 'all'}
            className={cat === 'all' ? s.pillOn : s.pill}
            onClick={() => { onSelect('all'); }}
          >
            All
          </button>
          {categories.map((cName) => (
            <button
              type="button"
              key={cName}
              role="tab"
              aria-selected={cat === cName}
              className={cat === cName ? s.pillOn : s.pill}
              onClick={() => { onSelect(cName); }}
            >
              {cName}
            </button>
          ))}
        </div>
      ) : null}
      {showTool ? (
        <button
          type="button"
          className={s.toolBtn}
          aria-label="Toggle search and sort"
          onClick={onToggleTool}
        >
          <Icon name="more" />
        </button>
      ) : null}
    </div>
  );
}
```

### 4.4 Floating Island Cart Dock Component (`CartDock`)
```tsx
function CartDock({ subtotal, count, onBilling }: {
  subtotal: number;
  count: number;
  onBilling: () => void;
}) {
  return (
    <footer className={s.bar} aria-label="Cart summary">
      <div className={s.meta}>
        <Money p={subtotal} className={s.total} />
        <span className={s.count}>{`· ${String(count)} ${count === 1 ? 'item' : 'items'}`}</span>
      </div>
      <button
        type="button"
        className={s.next}
        onClick={onBilling}
        disabled={count === 0}
        aria-label={`Proceed to Billing with ${String(count)} items, total ${formatInr(subtotal)}`}
      >
        Billing <Icon name="next" className={s.nextIcon} />
      </button>
    </footer>
  );
}
```

---

## 5. CSS Modules & Token Architecture (`Menu.module.css`)

Pure CSS Modules with 100% Driftline tokens (`--dl-*`). Strict enforcement:
- **ZERO Tailwind CSS**
- **ZERO raw `px` units** (all dimensions in `rem`)
- **ZERO `rgba()` / `rgb()` / `hsl()`** (all color blending via `color-mix(in srgb, ...)` or semantic tokens)
- **Container queries (`@container counter`)** for responsive layout adaptations

```css
/* Container query root: Counter shell defines `container: counter / inline-size;` */

/* 2-Column Tactile Touch Grid */
.grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0.5rem 0.75rem 4.5rem; /* 4.5rem ensures full clearance above floating dock */
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(6rem, auto);
  gap: 0.5rem;
  align-content: start;
}

/* Responsive Container Adaptations */
@container counter (max-width: 20rem) {
  .grid { grid-template-columns: 1fr; } /* Compact single-column on narrow devices / large text */
}
@container counter (min-width: 40rem) {
  .grid { grid-template-columns: repeat(3, 1fr); } /* 3 columns on wide tablets / left pane */
}

/* Category Ribbon */
.ribbonRow {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem 0.125rem;
  background: var(--dl-stall-chrome);
}
.ribbon {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0.125rem 0;
  scrollbar-width: none;
}
.ribbon::-webkit-scrollbar { display: none; }

.pill {
  min-height: 2rem;
  padding: 0 0.75rem;
  border-radius: var(--dl-radius-pill);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  color: var(--dl-color-text-muted);
  background: var(--dl-color-track);
  border: var(--dl-stall-hair) solid transparent;
  user-select: none;
  touch-action: manipulation;
  transition: transform var(--dl-dur-quick) ease, background var(--dl-dur-quick) ease;
}
.pill:active { transform: scale(0.96); }
.pillOn {
  composes: pill;
  color: var(--dl-color-text-display);
  background: color-mix(in srgb, var(--dl-color-accent) 20%, var(--dl-color-surface-solid));
  border-color: color-mix(in srgb, var(--dl-color-accent) 50%, transparent);
  font-weight: 600;
  box-shadow: 0 0 0.5rem color-mix(in srgb, var(--dl-color-accent) 30%, transparent);
}

/* Menu Item Card */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.625rem 0.625rem 0.5rem 0.875rem;
  border-radius: var(--dl-radius-md);
  background: var(--dl-color-surface);
  backdrop-filter: blur(var(--dl-blur-card)) saturate(160%);
  box-shadow: inset 0 0 0 var(--dl-stall-hair) var(--dl-color-hairline), var(--dl-stall-card-edge), var(--dl-stall-card-lift);
  overflow: hidden;
  isolation: isolate;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  min-height: 5.75rem;
  transition: transform var(--dl-press-dur) var(--dl-ease-settle), box-shadow var(--dl-press-dur) ease;
}
.card:active { transform: scale(var(--dl-press-scale)); }
.card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--dl-color-sheen);
  pointer-events: none;
  z-index: 1;
}

.hit {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  cursor: pointer;
  touch-action: manipulation;
}

.isIn {
  background: color-mix(in srgb, var(--item-accent) var(--dl-stall-card-in-mix), var(--dl-color-surface));
  box-shadow: inset 0 0 0 var(--dl-stall-hair) color-mix(in srgb, var(--item-accent) 26%, var(--dl-color-hairline)),
              var(--dl-stall-card-edge),
              0 0 1.125rem color-mix(in srgb, var(--item-accent) 16%, transparent);
}

.isOut {
  box-shadow: inset 0 0 0 var(--dl-stall-hair) var(--dl-color-hairline);
}
.isOut > .cardTop,
.isOut > .cardMid,
.isOut > .accent {
  opacity: 0.42;
}

.accent {
  position: absolute;
  left: 0;
  top: 0.5rem;
  bottom: 0.5rem;
  width: var(--dl-stall-accent-bar);
  border-radius: var(--dl-radius-pill);
  background: var(--item-accent);
  box-shadow: 0 0 0.5rem color-mix(in srgb, var(--item-accent) 50%, transparent);
  z-index: 2;
}

.badgePill {
  flex: none;
  min-width: 1.375rem;
  height: 1.375rem;
  padding: 0 0.3125rem;
  border-radius: var(--dl-radius-pill);
  background: var(--dl-color-accent);
  color: var(--dl-stall-on-cta);
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0.375rem color-mix(in srgb, var(--dl-color-accent) 60%, transparent);
}

/* Stepper */
.qty {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  background: color-mix(in srgb, var(--dl-color-surface-solid) 92%, transparent);
  border: var(--dl-stall-hair) solid var(--dl-color-hairline);
  border-radius: var(--dl-radius-pill);
  padding: 0.0625rem;
}
.qb {
  width: 1.875rem;
  height: 1.875rem;
  display: grid;
  place-items: center;
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1;
  color: var(--dl-color-text-muted);
  user-select: none;
  touch-action: manipulation;
}
.qb:active { color: var(--dl-color-accent); }
.qn {
  min-width: 1.125rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--dl-color-text);
  line-height: 1.15;
}

/* Floating Island Cart Dock */
.bar {
  flex: none;
  position: relative;
  z-index: var(--dl-z-dock);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  background: var(--dl-color-surface-chrome);
  backdrop-filter: blur(var(--dl-blur-chrome)) saturate(160%);
  box-shadow: inset 0 var(--dl-stall-hair) 0 var(--dl-color-hairline), var(--dl-stall-card-lift);
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.total {
  font-weight: var(--dl-stall-num-weight);
  font-size: 1.5rem;
  line-height: 1.75rem;
  letter-spacing: -0.03em;
  color: var(--dl-color-text-display);
  font-variant-numeric: tabular-nums;
  text-shadow: var(--dl-stall-glow);
}
.count {
  font-size: 0.8125rem;
  color: var(--dl-color-text-muted);
  white-space: nowrap;
}
.next {
  flex: none;
  min-height: 3rem;
  padding: 0 1.25rem;
  border-radius: var(--dl-radius-pill);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--dl-stall-on-cta);
  background: var(--dl-stall-cta);
  box-shadow: var(--dl-stall-cta-shadow);
  touch-action: manipulation;
  transition: transform var(--dl-press-dur) ease, opacity var(--dl-dur-quick) ease;
}
.next:active:not(:disabled) { transform: scale(var(--dl-press-scale)); }
.next:disabled { opacity: 0.45; box-shadow: none; pointer-events: none; }
```

---

## 6. Edge Cases, Guards & Error Recovery

1. **Sold Out Inventory Lockout**:
   - Condition: `it.soldOut || (it.count !== null && available(it.id) < 1)`.
   - Behavior: Whole-card tap-to-add is refused. Displays toast: `"${it.name} is sold out"`. Visual card drops to 42% opacity (`.isOut`).
2. **Order Full Limit Guard**:
   - Condition: `order.lines.length >= CONFIG.limits.linesMax` (80 lines).
   - Behavior: Rejects new lines; displays toast: `"This order is full; start another one"`.
3. **Item Quantity Ceiling**:
   - Condition: `qty >= CONFIG.limits.qtyMax` (99 per line).
   - Behavior: Stepper `+` rejects increment beyond 99.
4. **Draft Stock Depletion Guard**:
   - Condition: Incrementing `qty` when `available(it.id) < delta`.
   - Behavior: Refuses increment, triggers toast: `"Only X more ${line.name} left"`.
5. **Multi-Counter Concurrency Lock (s127 Take Over)**:
   - Condition: Another mobile terminal holds the active order lease (`holding(...).kind === 'busy'`).
   - Behavior: Counter Shell wraps the body in `.locked` (`opacity: 0.55; filter: saturate(0.6); pointer-events: none; inert`), preventing ghost touches. Any attempted tap triggers: `"Another phone has this order · tap Take over to change it"`.
6. **Date Rollover / Stale Day Trap (W-22)**:
   - Condition: App opens past midnight IST while yesterday's day is open.
   - Behavior: First tap opens `newDay` prompt sheet (`"Start today"` or `"Keep yesterday's day"`), cleanly staging the tapped item as `pendingItem` to fulfill immediately once answered.

---

## 7. Responsive Architecture & Container Queries

The Menu Screen is architected to render flawlessly across three distinct viewport tiers using container queries:

| Container Width | Breakpoint Query | Layout Structure | Ergonomic Optimization |
|---|---|---|---|
| **Compact Mobile** | `@container counter (max-width: 20rem)` (< 320px) | Single Column (1-col) | Prevents horizontal squishing on small phones or 200% system font zoom. |
| **Standard Mobile** | `20rem` to `40rem` (320px – 640px) | Two Columns (2-col) | Primary mobile design target (360×780 to 412×915). Perfect thumb reach. |
| **Tablet Split-Pane** | `@container counter (min-width: 40rem)` (≥ 640px) | Three Columns (3-col) | Menu occupies Left Pane of CounterShell (`Panes`). Billing/Payment occupies Right Pane. |

---

## 8. Verification & Test Plan

1. **Unit & Store Test Verification**:
   - `src/store/counter.test.ts`: Verify `addItem`, `removeItem`, `setQty`, `available`, `locked`, and `linesMax` guards.
   - `src/store/rules/catalog.test.ts`: Verify sorting algorithms (`menu`, `az`, `sold`).
2. **Component & Interaction Tests**:
   - Single-tap whole-card add increments line qty.
   - 600ms hold opens `StockSheet` with item preloaded.
   - Stepper `+` and `−` mutate line quantities with `stopPropagation`.
   - Category pill selection filters grid instantaneously.
   - Cart Dock updates subtotal and total items reactively.
3. **Static Analysis & CI Gates**:
   - `npm run lint`: Zero ESLint warnings (`max-warnings=0`, `max-lines-per-function: 40`, `max-depth: 3`).
   - `npm run lint:css`: Zero Stylelint violations (no `px`, no `rgba`, zero Tailwind, only `--dl-*` tokens).
   - `npm run contrast`: 100% WCAG AAA pass across `stall-night` and `stall-day`.
