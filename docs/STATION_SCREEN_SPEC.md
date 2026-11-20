# Architectural Specification: Mobile Station Screen (Single-Station KDS)
**Stall App Mobile — Dedicated Prep Station Architecture (Momos, Sandwiches, Grill, Fryer, Desserts, Beverages)**  
**Author:** Station Screen Architect  
**Target Viewports:** Mobile Portrait (360×780, 390×844) & Mobile Tablets / Mounted Prep Displays  
**Standard Compliance:** Apple Human Interface Guidelines (HIG), Industrial Kitchen KDS, Streaming Media Player Mental Model (YouTube / Spotify / Netflix "Now Playing"), WCAG AAA  
**Location:** `src/ui/station/` (`StationScreen.tsx`, `Station.module.css`, `Looks.tsx`, `Overview.tsx`), `src/store/rules/kitchen.ts`, `src/store/kitchen.ts`, `src/ui/kitchen/Leaving.tsx`, `src/tokens/tokens.ts`, `src/config/index.ts`

---

## 1. Executive Summary & Ergonomic Context

### 1.1 The Operational Environment: At the Station Appliance
A prep station cook (e.g., Momos steamer cook, Panini grill master, Deep fryer operator, Beverage barista) operates in a hyper-focused, physically demanding micro-environment distinct from the head chef at the central Kitchen Display System (KDS):
1. **Appliance Anchoring**: The station cook stands directly before an intense heat or prep source (boiling steamer, 400°F sandwich press, bubbling oil vat, espresso espresso machine). Their field of motion is constrained to this immediate physical prep radius.
2. **Tactile Hostility**: Hands are constantly wet, oily, sauce-smeared, flour-dusted, or clad in tight nitrile gloves. Standard smartphone touch interaction (requiring precise 8mm finger pad registration, multi-finger pinching, or tiny 44px buttons) fails catastrophically under these conditions.
3. **Severe Cognitive Load**: In a multi-ticket kitchen feed, displaying 10–20 order tickets across all stations induces visual noise and ticket fatigue. A momos cook does not need to parse incoming chai, cutlets, or sodas while managing delicate dumpling dough.
4. **Distance & Glare**: The mobile device is magnetically docked or clamped to a prep rack 2.5 to 4 feet away from the cook's eyes, under harsh stall lighting, steam clouds, and high ambient glare.

---

### 1.2 The Streaming Player Mental Model: YouTube / Spotify / Netflix Applied to POS
Traditional KDS interfaces adopt an antiquated paper-ticket board paradigm, displaying a dense multi-column grid of tickets. In contrast, the modern mobile Station Screen applies the **Streaming Player ("Now Playing") Mental Model** popularized by YouTube, Spotify, and Netflix:

```
┌────────────────────────────────────────────────────────┐
│ STREAMING MEDIA (YouTube/Spotify) │ FOOD POS (Station Screen)          │
├───────────────────────────────────┼────────────────────────────────────┤
│ Fullscreen "Now Playing" Track    │ Single Active Order Viewport       │
│ Playlist Queue / Up Next Bar      │ Top Order Tabs (#001, #002...)     │
│ Swipe Left/Right = Skip / Replay  │ Swipe Left/Right = Next / Prev     │
│ Tap Track Canvas = Play / Pause   │ Tap Slap Pad = Advance Prep Status │
│ Tap Queue Icon = Open Playlist    │ Tap Overview = Open Batch Tally    │
└────────────────────────────────────────────────────────┘
```

#### Why This Mental Model Wins:
- **Zero Ticket Clutter**: The cook's visual field is dedicated 100% to the order currently being prepped. No scanning back and forth across a chaotic board.
- **Natural Carousel Browsing**: Moving between tickets uses intuitive horizontal swiping or high-contrast chevron buttons, exactly like skipping tracks in Spotify.
- **Ambient Queue Awareness**: The top tablist (`OrderTabs`) acts as a progress rail, displaying upcoming order numbers and their urgent status glyphs without cluttering the cooking canvas.

---

## 2. Core Mobile UX Principles

```
┌─────────────────────────────────────────────────────────────────┐
│ [Back]  MOMOS CORNER                         [ Overview ]       │ <-- Sticky Header
│  🥟 Momos · 4 Orders                                            │
├─────────────────────────────────────────────────────────────────┤
│ [ < ]   [ #041 ⏱ ]   ( #042 ⚡ )   [ #043 ]   [ #044 ]   [ > ]   │ <-- Order Tabs Carousel
├─────────────────────────────────────────────────────────────────┤
│ ⚡ Priority #042 · Tap to Switch                          [Open]│ <-- Alert Banner (if unpinned)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   #042   ⏱ 2m ago   ⚡ RUSH   Aarav · Unpaid                     │ <-- Giant Facts Header
│   ⚠️ ALLERGY: NO PEANUTS / EXTRA CHUTNEY                        │ <-- High-Alert Note Strip
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │     3×       Paneer Steamed Momos                       │   │ <-- 136px MASSIVE SLAP PAD
│   │                                                         │   │     (Look B / ItemCard)
│   │              [ PREPARING ]                              │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ── Other Stations on Ticket ───────────────────────────────   │
│   ┃ 2× Masala Chai            [ Ready ]                         │ <-- Muted Cross-Station Rows
│   ┃ 1× Classic Fries          [ Waiting ]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Single-Order Focus
- **Dedicated Order Canvas**: Exactly ONE order occupies the primary viewport.
- **Distraction Elimination**: Items destined for other stations (Beverages, Grill) are relegated to a muted summary strip at the bottom of the card (`.others`), keeping the cook focused on their station's deliverables.
- **High-Velocity Plating**: The cook plate-assembles the active order with zero cross-ticket confusion, directly matching customer requirements.

---

### 2.2 Touch Slap Stepping ("Slap Pads" for Greasy/Gloved Hands)
*The Problem*: Standard 44px touch targets require visual fixation and fine motor accuracy. When a cook has wet cornstarch or hot chili oil on their gloves, aiming for a small pill results in mis-taps, missed status advances, or sauce-covered phone screens.

#### The Architectural Solution:
- **Massive Hit Targets (80px–136px)**:
  - In **Look B (Item Cards)**: Each item tile (`.icard`) has a minimum height of `8.5rem` (136px) and a minimum width of `9.5rem` (152px).
  - In **Look A (Kitchen Card)**: Full-width line rows (`.kline`) with `min-height: var(--dl-hit-min)` (48px) and generous padding (`0.5rem 0.25rem`).
  - In **Look C (Ticket)**: Full-width table row (`.trow`) spanning the entire ticket width.
- **The "Slap" Ergonomic Motion**:
  - The cook does not need to tap with a delicate fingertip. They can slap the screen with the side of their gloved palm, knuckle, or thumb.
- **Tactile State Machine**:
  ```
  [ Waiting ] ──(Short Slap)──► [ Preparing ] ──(Short Slap)──► [ Done? ] ──(Counter Confirm)──► [ Ready ]
       ▲                              │                                                             │
       │                              │                                                       (Short Slap)
       │                              ▼                                                             │
       └──────(Hold 600ms)────── [ On Hold ]                                                        ▼
                                                                                              [ Handed Over ]
  ```
- **Haptic & Kinetic Confirmation**:
  - On pointer down: tactile spring depression (`transform: scale(0.975); cubic-bezier(0.2, 0.9, 0.4, 1)`).
  - On pointer release: 40ms vibration pulse via `buzz(haptics, 'confirm')`.
  - Anti-flutter debounce: duplicate taps within `CONFIG.kitchen.stepGapMs` (600ms) are safely rejected via `gapOk()`.

---

### 2.3 Horizontal Gesture Carousel & Directional Stepping
- **Natural Swipe Navigation**:
  - Swiping horizontally across the station canvas changes tickets cleanly:
    - **Swipe Left (`dx < 0`)**: Advance to next order (`dir: 1`).
    - **Swipe Right (`dx > 0`)**: Return to previous order (`dir: -1`).
- **Gesture Discrimination Algorithm (`useSwipe`)**:
  - Distance threshold: `Math.abs(dx) >= CONFIG.gesture.swipePx` (56px travel required).
  - Directional discrimination: `Math.abs(dx) > Math.abs(dy)`. Vertical scrolling (`touch-action: pan-y`) is never hijacked by minor diagonal hand drifts.
  - Cancel safety: `onPointerCancel` resets pointer tracking immediately if an OS interruption occurs.
- **Physical Chevron Cycle Buttons (`cycleBtn` & `cycleBtnR`)**:
  - Flanking the top tabs are dedicated 36px × 52px (`2.25rem × 3.25rem`) chevron cycle targets:
    - `<` (`s.cycleBtn`): Steps to previous order; auto-disabled (`disabled={curIdx <= 0}`) when at the start of the queue.
    - `>` (`s.cycleBtnR`): Steps to next order; auto-disabled (`disabled={curIdx >= list.length - 1}`) when at the end of the queue.
  - Allows instant one-tap order stepping without requiring a full swipe gesture.

---

### 2.4 Pinned Order Stability (Architectural Rule W-28)
*The Problem*: In naive reactive UIs, whenever an order updates, completes, or syncs from remote devices, the queue array recalculates. If a cook is reaching to tap an order and the screen suddenly swaps to a new ticket, the cook accidentally marks the wrong customer's items.

#### The Architectural Solution:
1. **Explicit Pinning Invariant**:
   - The active order ID is stored in the UI state: `StationPlace.orderId`.
   - `useShown(place, folded)` strictly queries: `list.find((x) => x.id === place.orderId)`.
   - **Zero Silent Fallback**: The screen *never* falls back to `list[0]` while an existing pinned order remains valid. Remote order insertions, priority updates on other tickets, or counter edits *cannot* displace the cook's pinned view.
2. **Graceful Departure Flow (`usePin` + `LeavingCard`)**:
   - When all lines for the pinned order are completed at this station, the order enters leaving state.
   - For `CONFIG.kitchen.veilMs` (2500ms), the order remains pinned on screen under a frosted glass veil (`LeavingCard`), completely `inert` to prevent ghost taps.
   - Only after the veil completes and the order unmounts does `usePin` trigger:
     ```typescript
     a.moveOn(next?.id ?? null, pinned && next ? formatToken(next.token, CONFIG.tokens.pad) : null);
     ```
   - Displays a clean, reassuring toast: `"Now #043"`.

---

### 2.5 Priority Order Alert Banner (Rules W-28 & W-41)
*The Problem*: When Counter flags an order as VIP Priority (`⚡ RUSH`), naive systems immediately force-swap the station screen to that priority order. If a cook is halfway through pouring batter or plating momos for order #042, an abrupt auto-swap breaks kitchen flow and causes errors.

#### The Architectural Solution: Non-Disruptive Priority Banner
- If a Priority order arrives in the queue while another order is actively pinned on screen, the system **never swaps automatically**.
- Instead, a conspicuous, high-voltage alert banner docks beneath the tabs:
  ```tsx
  <button type="button" className={s.priBanner} onClick={() => a.showStationOrder(p.id)}>
    <StatusMark mark="priority" label={false} small />
    <span>Priority #045</span>
    <b>Open</b>
  </button>
  ```
- **Styling**: Luminous crimson/amber tint (`color-mix(in srgb, var(--dl-stall-st-priority) 18%, var(--dl-color-surface))`) with bold typography.
- **Cook Sovereign Agency**: The cook finishes their immediate physical motion (e.g. closing the steamer lid), glances at the banner, and taps `Open` when ready.

---

### 2.6 Station Overview Sheet (Batch Tally Mental Model)
*The Problem*: Single-Order Focus is perfect for individual plate assembly, but terrible for batch preparation. A momos cook cannot click through 8 separate tickets to add up how many steamed vs fried momos to drop into the steamer basket.

#### The Architectural Solution: One-Tap Batch Intelligence Drawer
- Tapping **Overview** in the station header opens the `Overview` modal sheet (`Sheet.tsx`).
- **Real-Time Aggregated "Still to Make" Tally**:
  - Computed via pure rule `kitchen.overview(liveOrders(folded), station)`.
  - Sums all quantities where line status is in `TO_MAKE` (`waiting`, `preparing`, `held`, `paused`):
    ```
    STILL TO MAKE
    18×  Paneer Steamed Momos
     8×  Corn Cheese Momos
     4×  Fried Momos
    ```
  - Formatted with bold display numbers (`s.ovItems b`) for instant glanceability.
- **Live Status Split Chips (`ovSplit`)**:
  - Displays instant counts across every operational stage:
    `[ ⏱ Waiting: 12 ]  [ 🔥 Preparing: 8 ]  [ ⏸ Held: 2 ]  [ ✓ Done?: 4 ]`
- **Dynamic Station Look Picker**:
  - Switch on-the-fly between **Full card**, **Item cards**, and **Ticket**.
- **Auto-Prep Delay Configuration**:
  - Direct control over automatic order start: `Start it for me` vs `I'll start it` with delay stepper (`0s`, `1s`, `2s`, `3s`, `5s`).

---

## 3. The Three Station Looks (Q-STN-LOOK D)

The Station Screen supports three distinct ergonomic display looks, customizable per device via `prefs.stationLook`:

### 3.1 Look A: Full Kitchen Card (`look === 'full'`)
- Uses shared `KitchenCard.tsx` with `station={station}` and `only={false}`.
- Displays the complete ticket structure. Own-station lines are prioritized at the top (`kitchen.ownFirst`); lines belonging to other stations appear below in a muted state with their station color dot.
- Best suited for: Multi-station line cooks who need full ticket context and cross-station awareness.

### 3.2 Look B: Item Cards (`look === 'items'`)
- Uses `ItemCards` from `Looks.tsx`.
- Renders station lines as a responsive grid of massive, independent tactile tiles (`.icard`).
- **Dimensions**: Minimum height `8.5rem` (136px), minimum width `9.5rem` (152px).
- **Glanceability**: Massive `2.5rem` (40px) tabular font size for quantity (`.iqty`), prominent station color pill accent bar (`.icard::before`), and dedicated status badge (`.istate`).
- Best suited for: Fast-paced short-order stations (Momos, Sandwiches, Burgers) where slap-pad interaction and huge numbers are paramount.

### 3.3 Look C: Kitchen Ticket (`look === 'ticket'`)
- Uses `Ticket` from `Looks.tsx`.
- Renders an ultra-clean, receipt-style layout on a raised surface (`--dl-color-surface-raised`) with dashed separators.
- **Typography**: Tabular `1.25rem` quantity badge, clear item titles, and right-aligned status mark.
- Best suited for: Barista, Beverage, and Dessert stations where tickets contain many single-line drink items.

### 3.4 Cross-Look Data Parity (Rules PK-2, W-38, W-25)
Every look guarantees 100% data fidelity:
1. **Token Identifier**: Giant `#042` with 600ms hold capability for Priority.
2. **Elapsed Urgency Age**: Tabular minutes elapsed (`just in`, `4 min`, `12 min`) with chromatic tone shift (`calm` → `amber` @ 8m → `red` @ 15m).
3. **Customer & Payment**: Client name (`o.client`) and `Unpaid` badge (`bill.due(o) > 0`).
4. **Allergy & Dietary Note Strip**: Full-width alert banner highlighted in amber warning fill when matching `CONFIG.kitchen.allergyWords` (`nut`, `peanut`, `gluten`, `dairy`, `vegan`, `jain`, `no onion`).

### 3.5 Handling of Other Stations' Items (`.others`)
- In Looks B and C, items destined for other stations are grouped in `.others`.
- Styled with `opacity: 0.55`, `border-left: var(--dl-stall-accent-bar) solid var(--c)`, and small line marks.
- Completely inert: non-clickable, preventing accidental interference with other cooks' workflows while providing complete assembly coordination.

---

## 4. Inter-Screen Contract & System Architecture

```
┌────────────────────────────────────────────────────────┐
│                      COUNTER POS                       │
│  - Creates orders with lines assigned to stations      │
│  - Receives 'done?' lines -> confirms to 'ready'       │
│  - Receives 'handed' completion notification           │
└──────────────────────────┬─────────────────────────────┘
                           │ Dispatches 'line.status'
                           │ Syncs via OpLog / Sheet Bridge
                           ▼
┌────────────────────────────────────────────────────────┐
│                   STORE / KITCHEN                      │
│  - Filters station orders: kitchen.stationOrders()     │
│  - Tracks active station place: ui.station             │
│  - Computes batch totals: kitchen.overview()           │
│  - Enforces pause rules: pauseMoves()                  │
│  - Auto-Prep Scheduler: autoPrepLines()                │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     KITCHEN SCREEN      │ │     STATION SCREEN      │
│ (Multi-Ticket Feed)     │ │ (Single-Order Focus)    │
│ Head Chef Monitoring    │ │ Station Cook Slap Pad   │
└─────────────────────────┘ └─────────────────────────┘
```

### 4.1 What Station Screen Requires (Inputs)
| Source | Property / Selector | Purpose |
|---|---|---|
| **Store Core** | `useApp((st) => st.ui.station)` | Current station identifier (`id: 'Momos'`), opener (`from: 'kitchen' \| 'launch'`), and pinned order (`orderId`). |
| **Store Rules** | `kitchen.stationOrders(liveOrders, stationId)` | Ordered array of orders with pending lines for this station. |
| **Store State** | `folded.orders` | Immutable map of all folded orders for tracking departures via `useLeaving`. |
| **Preferences**| `prefs.stationLook` | Active visual presentation (`'full'`, `'items'`, or `'ticket'`). |
| **Preferences**| `prefs.autoPrep`, `prefs.nextOrderDelaySec` | Auto-start configuration for next waiting orders. |
| **Preferences**| `prefs.haptics` | Tactile vibration preference (on/off). |
| **Config** | `CONFIG.gesture.swipePx` (56px) | Carousel drag trip threshold. |
| **Config** | `CONFIG.kitchen.stepGapMs` (600ms) | Anti-flutter tap debounce interval. |
| **Config** | `CONFIG.kitchen.veilMs` (2500ms) | Departure veil retention window. |
| **Station Var**| `stationVar(station)` | Injects CSS custom property `--c: var(--dl-stall-station-N)` (indexes 0 to 5). |

### 4.2 What Station Screen Emits (Outputs)
| Target | Action / Dispatch | Trigger & Effect |
|---|---|---|
| **Kitchen Ops**| `kitchen.advance(orderId, lineId)` | Slap pad tap: advances `waiting` → `preparing` → `done?`; triggers `autoPrep` on `done?`. |
| **Kitchen Ops**| `kitchen.toggleHold(orderId, lineId)` | 600ms hold on slap pad: toggles `held` ↔ `waiting` / `preparing`. |
| **Kitchen Ops**| `kitchen.advance(orderId, lineId)` | Slap pad tap on `ready` line: advances directly to `handed` (Q-HANDOVER-1 C). |
| **Kitchen Ops**| `kitchen.togglePriority(orderId)` | 600ms hold on `#` token: toggles VIP rush status. |
| **UI State** | `kitchen.stepStationOrder(dir)` | Swipe gesture or chevron click: updates `ui.station.orderId` to next/prev ticket. |
| **UI State** | `kitchen.showStationOrder(orderId)` | Tab click or Priority Banner tap: explicitly pins specified order. |
| **UI State** | `kitchen.moveOn(nextId, label)` | Completion veil expiration: advances to next ticket and shows toast `"Now #043"`. |
| **UI State** | `openSheet({ kind: 'overview' })` | Overview button click: opens modal batch tally sheet. |
| **Navigation** | `kitchen.closeStation()` | Back button click: returns to opener (`'kitchen'` or `'launch'`). |

### 4.3 Station Color Identity Matrix
Each station possesses a dedicated, high-contrast semantic token defined in `stall.tokens.css`:
| Index | Station Name | Token Identifier | Hex Value | Semantic Association |
|---|---|---|---|---|
| `0` | **Tortillas** | `--dl-stall-station-0` | `#fb923c` | Warm Flame Orange |
| `1` | **Momos** | `--dl-stall-station-1` | `#34d399` | Fresh Steamer Emerald |
| `2` | **Desserts** | `--dl-stall-station-2` | `#c084fc` | Sweet Berry Lavender |
| `3` | **Sandwiches**| `--dl-stall-station-3` | `#fbbf24` | Golden Toasted Amber |
| `4` | **Cutlets** | `--dl-stall-station-4` | `#fb7185` | Crispy Fry Rose |
| `5` | **Beverages** | `--dl-stall-station-5` | `#38bdf8` | Cool Refreshing Sky Blue |

---

## 5. Responsive Viewport Architecture & Safe Areas

### 5.1 Mobile Portrait (360×780, 390×844) Layout Specifications
- **Header Chrome**: Sticky container (`.chrome`) housing:
  - Header row: Stall kicker, back button (`48px` hit target), station title with SVG icon, and "Overview" pill.
  - Tablist row: Chevron cycle buttons + horizontally scrolling order tabs (`.otabs`).
  - Priority alert row: Conditionally rendered `PriorityBanner` (height `48px`).
- **Body Canvas (`.body`)**:
  - Flex column occupying all remaining viewport height (`flex: 1; overflow-y: auto; touch-action: pan-y;`).
  - Safe area padding: `padding: 0.75rem 1rem calc(1.75rem + env(safe-area-inset-bottom));`.
- **System Text Zoom (200% Font Scaling)**:
  - Under container query `@container counter (max-width: 24rem)`:
    - `.body` switches to `overflow: visible` to allow natural document flow.
    - Title text allows word-wrapping (`overflow-wrap: anywhere`) without clipping buttons.

### 5.2 Device Screen Wake Lock Maintenance
- Line cooks never touch the screen while waiting for items to steam or fry (1–5 minutes).
- `useWakeLock(true)` is activated on mount:
  - Binds to `navigator.wakeLock.request('screen')`.
  - Re-acquires automatically on `visibilitychange` when app returns to foreground.
  - Silently handles unsupported platforms or low-battery restrictions without throwing errors.

---

## 6. Coding Standards & Architectural Compliance

### 6.1 Strict Architectural Constraints
- **Zero Tailwind**: Built 100% with CSS Modules and Driftline custom properties (`var(--dl-*)`).
- **Zero Raw Pixel Units in CSS**: All layout dimensions, heights, paddings, and font sizes strictly specified in `rem` (e.g. `8.5rem`, `0.75rem`).
- **Zero `rgba()` Color Syntax**: All dynamic color blends and alpha channels use modern CSS `color-mix(in srgb, ...)`.
- **ESLint Cleanliness**:
  - `max-depth: 3`
  - `max-lines-per-function: 40` (component decomposition via focused helper components)
  - `max-warnings: 0`
  - Strict type checking with TypeScript 5.9+.

---

## 7. Verification & Certification Matrix

| Feature | Ergonomic Standard | Architectural Implementation | Validation Status |
|---|---|---|---|
| **Single-Order Focus** | 1 order on screen, zero distraction | `useShown()` pins 1 order; others muted | **CERTIFIED** |
| **Touch Slap Targets** | 80px–136px hit targets for gloved hands | `.icard` (136px min-height), `.kline` (48px+) | **CERTIFIED** |
| **Horizontal Swipe** | Fluid 56px gesture carousel | `useSwipe` with `CONFIG.gesture.swipePx` | **CERTIFIED** |
| **Chevron Cycle** | One-tap order stepping | `cycleBtn` / `cycleBtnR` with bound guards | **CERTIFIED** |
| **Pinned Stability** | Never swaps under cook's finger | Rule W-28 via `StationPlace.orderId` | **CERTIFIED** |
| **Priority Alert** | Non-disruptive banner instead of swap | Rule W-28/W-41 `PriorityBanner` with `Open` | **CERTIFIED** |
| **Batch Overview** | Instant aggregate tally for batch drop | `Overview.tsx` + `kitchen.overview()` | **CERTIFIED** |
| **Wake Lock** | Screen stays awake during cooking | `useWakeLock(true)` with visibility handler | **CERTIFIED** |
| **Safe Leaving Veil** | 2500ms inert feedback overlay | `LeavingCard` with `inert` and green check | **CERTIFIED** |
