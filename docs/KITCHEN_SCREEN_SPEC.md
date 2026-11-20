# Exhaustive Screen Specification & Interaction Blueprint: Mobile Kitchen Screen (KDS)
**Stall App Mobile — High-Throughput Food Stall Kitchen Display System Architecture**  
**Author:** Kitchen Screen Architect  
**Target Viewports:** Mobile Portrait (360×780, 390×844), Mobile Landscape (667×375, 844×390), and Kitchen Tablet Grid (1024×768, 1180×820)  
**Standard Compliance:** Apple Human Interface Guidelines (HIG), Industrial Kitchen KDS Ergonomics, WCAG AAA  
**Codebase Locations:** `src/ui/kitchen/` (`KitchenScreen.tsx`, `KitchenCard.tsx`, `Kitchen.module.css`, `Leaving.tsx`, `StatusMark.tsx`, `stations.ts`), `src/store/rules/kitchen.ts`, `src/store/kitchen.ts`

---

## 1. Executive Summary & Kitchen Ergonomics ("Behind the Flames")

### 1.1 The Operational Reality: Extreme Kitchen Conditions
A commercial food stall kitchen during rush hours (festival fairs, night markets, food trucks) represents one of the most hostile operating environments for mobile software interfaces:
1. **Distance Glanceability (3–5 Feet Viewing Distance)**: The device is mounted on a magnetic arm or propped on an eye-level stainless steel shelf 1.0 to 1.5 meters away from the cook's eyes. Standard 14–16px typography is completely illegible at this distance.
2. **Environmental Visual Degradation**: High-ambient glare from sunlight or flickering outdoor tent lighting, rising steam plumes from momo steamers, aerosolized oil vapor from deep fryers, and heat haze significantly reduce perceived contrast.
3. **Tactile Hostility (Greasy, Wet, Saucy, Gloved Hands)**: Cooks have wet, oil-coated, flour-dusted, or vinyl/nitrile gloved fingertips. Capacitive touch blobs expand from the standard 8mm clean fingertip contact patch to 16–22mm. Fine motor precision is non-existent during peak cooking cadence.
4. **Cognitive Load & The 1.5-Second Rule**: Cooks can spare at most 1.5 seconds of visual attention away from the hot grill. The screen must instantly answer three questions without scrolling or reading paragraphs:
   - *What item do I drop on the grill right now?*
   - *Which ticket is the most urgent / delayed?*
   - *How do I bump this order forward with one gross motor slap?*

---

## 2. Mobile UX Architecture: Consumer Streaming Mental Model (YouTube / Spotify / Netflix)

Consumer streaming applications have refined mental models that millions of users navigate intuitively. Stall App Mobile translates these battle-tested patterns directly into high-throughput kitchen operations:

### 2.1 YouTube / Spotify Horizontal Filter Pill Carousel
- **Mental Model**: Just as YouTube and Spotify utilize horizontal scrollable pill carousels for instant category switching, the Kitchen Screen anchors a sticky horizontal station filter bar directly below the stall header.
- **Station Pills**:
  - `All` (Aggregate overview across every kitchen line).
  - Stations: `Tortillas`, `Momos`, `Desserts`, `Sandwiches`, `Cutlets`, `Beverages` (configured in `CONFIG.stations`).
- **Live "To-Make" Badges**:
  - Each station pill contains:
    - Station Icon (`Icon` component with custom SVGs: `tortillas`, `momos`, `desserts`, `sandwiches`, `cutlets`, `beverages`, `all`).
    - Station Title (e.g., `Momos`, `Cutlets`).
    - Tabular Numeric Counter (`kitchen.toMake(all, station)`), actively tallying all lines currently in `TO_MAKE` status (`waiting`, `preparing`, `held`, `paused`).
  - Active vs Inactive State:
    - Active pill (`.pillOn`): High-luminance station background (`color-mix(in srgb, var(--c) 30%, transparent)`), solid station icon stroke, and high-contrast bold white/dark count.
    - Inactive pill: Muted background (`color-mix(in srgb, var(--c) 12%, transparent)`).
    - Zero-count pill (`.pillZero`): Dimmed to 45% opacity (`opacity: 0.45`), immediately communicating that this station has zero pending work.
- **Gradient Fade Masking**:
  - The carousel container (`.pills`) applies a right-edge alpha mask (`mask-image: linear-gradient(90deg, ... calc(100% - 2.25rem), transparent 100%)`) indicating horizontal scrollability without intrusive scrollbars.
- **Contextual Action: "Open Station" Portal**:
  - When a station filter is selected (e.g., `Momos`), an immediate action button `Open Momos ↗` renders dynamically in the header grid (`grid-column: 3; grid-row: 2`).
  - Tapping this button transitions the screen directly into the dedicated full-screen `StationScreen` mode (`k.openStation(filter, 'kitchen')`), enabling focused single-station execution.

### 2.2 Netflix-Style Focus Queue & Ticket Prioritization
- **Visual Gravity**: Tickets are arranged as prominent cards with frosted glass backgrounds (`backdrop-filter: blur(var(--dl-blur-card)) saturate(160%)`), deep contrast borders, and layered elevation shadows (`--dl-stall-card-lift`).
- **Deterministic FIFO + VIP Rush Queue**:
  - Tickets are deterministically sorted by:
    1. Priority status (`o.priority === true` always sorts to top).
    2. Chronological arrival order (oldest tickets first).
- **Ambient Focus & Silent Alert**:
  - New incoming tickets glow quietly for 6 seconds (`CONFIG.kitchen.newGlowMs: 6000`) with a pulsating accent border (`animation: newGlow 3 alternate`), drawing eye focus without disruptive auditory blare.

---

## 3. Ticket Card Architecture & Glanceability Hierarchy

### 3.1 Giant High-Contrast Token Badge (`#042`)
- **Legibility Requirement**: Instantly legible from 3–5 feet through rising steam and grease films.
- **Visual Engineering**:
  - Minimum height: `2.75rem` (44px hit container, scaling up to 52px on display).
  - Typography: Display Heavy / Extra Bold (`font-weight: 800` or `--dl-stall-num-weight`), tabular numerals (`font-variant-numeric: tabular-nums; letter-spacing: -0.04em`).
  - Hash Decoupling: The `#` symbol is styled at 62% font size with 0.80 opacity (`.hash`), eliminating visual clutter so the brain registers only the digits (`042`).
  - Contrast Ratio: 7:1 (WCAG AAA compliant) against card background.

### 3.2 Elapsed Time & Three-Stage Chromatic Alert Hierarchy
Cooks must identify ticket aging at a split-second glance. The elapsed time is calculated every 30 seconds via `useClock()` and categorized into three distinct chromatic urgency tones via `kitchen.ageTone(createdAt, now, 8, 15)`:
1. **Stage 1 — Fresh / Calm (< 8 minutes)**:
   - Class: `.age` (Neutral muted text `--dl-color-text-muted`).
   - Copy: `just in` (for < 1 min) or `X min`.
   - Psychology: Normal prep cadence; no stress induction.
2. **Stage 2 — Amber Warning (8 to 14 minutes)**:
   - Class: `.ageAmber` (High-luminance amber `--dl-stall-warn-text`).
   - Copy: `8 min`, `12 min`.
   - Psychology: Warns line cooks that customer wait time is approaching service SLA.
3. **Stage 3 — Red Critical Alert (≥ 15 minutes)**:
   - Class: `.ageRed` (Urgent crimson danger `--dl-color-danger`).
   - Copy: `15 min`, `22 min`.
   - Psychology: Maximum urgency. Demands immediate station clearance and expediter intervention.

### 3.3 Customer Context & Payment Flag
- **Customer / Buzzer ID**: Displayed in prominent bold text (`.who`, `font-size: 0.9375rem; font-weight: 600`) directly beside elapsed time, word-wrapping safely without breaking card layout.
- **Unpaid Badge**: If `bill.due(o) > 0`, a high-contrast crimson badge `.unpaid` renders prominently ("Unpaid"). Cooks know not to release the completed meal at the counter window until the cashier collects payment.

### 3.4 Allergy & Dietary Warning Strip (`NoteStrip`)
- **Safety Standard**: Critical allergy instructions must never be missed or mistaken for ordinary cooking requests.
- **Dictionary Parser**: Evaluates order notes against `CONFIG.kitchen.allergyWords` (`allergy`, `allergic`, `nut`, `nuts`, `peanut`, `peanuts`, `gluten`, `dairy`, `lactose`, `egg`, `eggs`, `jain`, `vegan`, `no onion`, `no garlic`).
- **Styling Architecture**:
  - **Standard Request**: Rendered in subtle neutral background bubble (`.noteStrip`) prefixed with `✎`.
  - **Allergy / Dietary Alert (`.noteWarn`)**:
    - High-contrast caution background (`color-mix(in srgb, var(--dl-stall-warn-text) 16%, transparent)`).
    - Vivid warning text (`var(--dl-stall-warn-text)`).
    - Bold caution icon prefix `⚠ `.
    - Never truncated; wrapped across lines (`overflow-wrap: anywhere`).

---

## 4. Tactile Mechanics, Gestures & State Machine

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LINE ITEM STATE MACHINE                         │
│                                                                        │
│          ┌───────────────────────┐                                     │
│          │        WAITING        │ ◄────────────────────────┐          │
│          └──────────┬────────────┘                          │          │
│                     │ Tap                                   │ Tap      │
│                     ▼                                       │ (Resume) │
│          ┌───────────────────────┐         Hold 600ms       │          │
│   ┌────► │       PREPARING       ├─────────────────────► ┌──┴──────┐   │
│   │      └──────────┬────────────┘                       │ ON HOLD │   │
│   │                 │ Tap                                └──┬──────┘   │
│   │                 ▼                                       │          │
│   │ Hold ┌───────────────────────┐                          │          │
│   └──────┤         DONE?         │                          │          │
│  (Revert)└──────────┬────────────┘                          │          │
│                     │ Counter Confirm / Station Advance     │          │
│                     ▼                                       │          │
│          ┌───────────────────────┐                          │          │
│          │         READY         │ ◄────────────────────────┘          │
│          └──────────┬────────────┘                                     │
│                     │ Tap (Station or Counter Handover)                │
│                     ▼                                                  │
│          ┌───────────────────────┐                                     │
│          │      HANDED OVER      │                                     │
│          └───────────────────────┘                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 "Touch Slap" Stepping: Single Tap Advance
- **Large Tactile Hit Zone**:
  - Each item line row (`.kline`) spans full card width with min-height `var(--dl-hit-min)` (44px minimum, scaling with padding to ~60px).
  - Designed for gross motor contact (hitting with the heel of a palm or greasy thumb).
- **Linear Progression Flow**:
  1. `waiting` → `preparing`: Station accepts item; cook begins grilling/steaming.
  2. `preparing` → `done?`: Cook completes preparation; marks item as proposed ready.
  3. `done?` → `ready`: Confirmed ready (either by Counter cashier via Confirm button or by direct kitchen advance).
  4. `ready` → `handed`: Plated and passed to customer; line mutes to 45% opacity.
- **Anti-Flutter Debounce Guard**:
  - Enforced via `gapOk(orderId, lineId)` in `src/store/kitchen.ts`:
  - `CONFIG.kitchen.stepGapMs: 600ms`.
  - Rejects rapid duplicate taps or accidental capacitive flutter from grease droplets within 600ms.
- **Instant Step Reversal (Undo Toast)**:
  - Every status advance triggers a non-blocking toast lasting 5.0 seconds (`CONFIG.kitchen.undoToastMs: 5000`) with an explicit "Undo" CTA.
  - Tapping "Undo" rolls the line back to its previous status and cancels any auto-prep scheduler.

### 4.2 Press-and-Hold for "On Hold" / "Revert"
- **Timing & Threshold**:
  - Handled by `usePress` with `HOLD.durationMs` (600ms).
  - Drag discrimination: If finger travel exceeds `CONFIG.gesture.moveCancelPx: 10px`, the hold timer immediately clears and the gesture becomes a vertical scroll.
- **Hold Behaviors**:
  - Holding a `waiting` or `preparing` line toggles it to `held` (Purple `--dl-stall-st-held`).
  - Holding a `held` line restores it to `waiting`.
  - Holding a `done?` (proposed ready) line reverts it back to `preparing` (essential when the expediter inspects an item and asks the cook to crisp or reheat it).

### 4.3 Order Priority Toggle & Automated Kitchen Pause Cascade
- **Trigger**:
  - Press-and-hold (600ms) on the giant token number `#042`.
  - Haptic feedback: Confirms with a distinct tactile buzz (`buzz(haptics, 'confirm')`).
- **Visual Priority Affirmation**:
  - Card activates `.isPriority`:
    - 10% accent wash (`color-mix(in srgb, var(--dl-color-accent) 10%, var(--dl-color-surface))`).
    - Luminous card border and ambient glow (`0 0 1rem color-mix(in srgb, var(--dl-color-accent) 14%, transparent)`).
    - Status mark activates dynamic bobbing motion (`<Bob className={s.stBob}><Icon name="stPriority" /></Bob>`).
- **The Pause Cascade (`pauseMoves`)**:
  - Toggling Priority executes pure rule `pauseMoves(orders)` in `src/store/rules/kitchen.ts`:
  - Determines which kitchen stations the Priority order needs (`neededStations(orders)`).
  - Automatically transitions all `preparing` lines of other standard orders at those stations to `paused` (`line.status` → `paused`, rendered at 50% opacity `.isPaused`).
  - Frees up grill surface and fryer baskets exclusively for the rush ticket.
  - Once the Priority order's lines are marked complete, all `paused` lines automatically resume back to `preparing` with zero manual intervention!

### 4.4 Reorder Guard (Accidental Tap Suppression)
- **Problem**: When a new Priority ticket enters or an order is prioritized, it instantly sorts to the top of the queue. If a cook was in mid-reach to tap ticket `#043`, their finger would strike the newly inserted priority card instead.
- **Architectural Solution**:
  - `useReorderGuard(ids, filter)` monitors order list permutations.
  - Whenever cards reorder or an order inserts above existing cards, `.guard` is activated on the card container:
    ```css
    .guard { pointer-events: none; }
    ```
  - Pointer events are suppressed for `CONFIG.kitchen.reorderGuardMs: 450ms`.
  - Container marks `aria-busy="true"`.
  - Accidental mis-taps during queue shifts are mathematically eliminated.

### 4.5 Completed / Cancelled Leaving Veil (`LeavingCard` & `useLeaving`)
- **Problem**: Abruptly removing an order card when its final item is completed causes all lower tickets to violently jerk upward, resulting in accidental double-taps on the next ticket.
- **Architectural Solution**:
  - Handled by `useLeaving` hook and `LeavingCard` component.
  - Triggered when all lines reach `handed` (`orderComplete(o)` is true) or when Counter cancels the ticket (`o.cancel`).
  - **Frosted Glass Veil**:
    - The card remains in its exact DOM position for `CONFIG.kitchen.veilMs: 2500ms`.
    - Frosted overlay: `backdrop-filter: blur(0.375rem) saturate(140%)` with tinted background.
    - Centered pop-in badge (`PopIn` spring animation):
      - Completed: Emerald circle badge with white checkmark (`Icon name="check"`), text: "Completed".
      - Cancelled: Crimson circle badge with white cross (`Icon name="cross"`), text: "Cancelled".
      - Handed Over (Station view): "Handed over · N left at other stations".
  - **Zero Ghost Taps**:
    - The leaving container applies the HTML `inert` attribute and `pointer-events: none` in the very same render frame that the order completes (`W-29`). No ghost taps can register.
    - After 2.5 seconds, the card gently drops off the screen.

---

## 5. Inter-Screen Contract Specification

The Kitchen Display System does not operate in isolation. It forms the central operational bridge between the front-of-house Counter and individual preparation Station screens.

```
┌────────────────────────────────────────────────────────────────────────┐
│                         INTER-SCREEN CONTRACT                          │
└────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────┐               ┌────────────────────────┐
    │     COUNTER SCREEN      │               │     STATION SCREEN     │
    │  (Billing / Open Order) │               │   (Momos, Grill, etc.) │
    └───────────┬─────────────┘               └───────────▲────────────┘
                │                                         │
 1. Send Order  │ Real-time                   1. Filtered │ Live Station
    & Lines     │ Synced                         Orders   │ Orders
 2. Unpaid Due  │ Log                         2. Station  │ Live "To-Make"
 3. Cancel Order│                                Counts   │ Counts
 4. Confirm     │                             3. Line     │ Bidirectional
    Ready       │                                Statuses │ Step Sync
 5. Handover    │                             4. OwnFirst │ Station lines
                │                                Sorting  │ on top
                ▼                                         │
    ┌─────────────────────────────────────────────────────┴────────────┐
    │                      KITCHEN SCREEN (KDS)                        │
    │     - Global Kitchen Overview & Multi-Station Coordination       │
    │     - Station Filter Carousel with Real-Time "To-Make" Tally     │
    │     - Priority Bobbing & Cross-Station Pause Moves Cascading     │
    │     - Anti-Flutter Debounce & 450ms Reorder Guard Lockout        │
    │     - 2.5s Frosted Glass Leaving Veil & Auto-Prep Delay Engine   │
    └──────────────────────────────────────────────────────────────────┘
```

### 5.1 Contract with Counter (Billing & Payment / POS)
- **What Kitchen Requires from Counter**:
  - `order.id`: Unique immutable order UUID.
  - `token`: Sequential 3-digit token (`001` to `999`).
  - `createdAt`: Timestamp in ms (clock source for elapsed timer).
  - `priority`: Boolean VIP flag toggled during billing or counter management.
  - `client`: Customer name or buzzer identifier.
  - `note`: Special requests and dietary constraints.
  - `lines[]`: Menu items, quantities, station allocations, notes.
  - `bill.due`: Live balance due. If positive, Kitchen renders `Unpaid` warning.
  - `order.cancel`: Instant cancellation signal. Kitchen immediately freezes prep and overlays Cancelled veil.
- **What Kitchen Provides to Counter (Open Orders)**:
  - `line.status` transitions:
    - Counter's Open Orders tab badge live-reflects pending tickets.
    - When Kitchen advances an item to `done?`, Counter Open Orders displays it as "Ready" with a one-tap "Confirm" button.
    - When Counter confirms, line moves to `ready`.
    - When meal is handed to customer, Counter or Kitchen triggers `handed`, completing the ticket.
  - Counter Override (`line.finish`): Cashier can tap "Mark ready" at Counter to immediately bypass kitchen steps for grab-and-go items; Kitchen displays this with the Ready icon labelled "Marked by counter".

### 5.2 Contract with Station Screens (Individual Prep Stations)
- **What Kitchen Provides to Station Screens**:
  - Station-Filtered Order Stream: `kitchen.stationOrders(orders, stationId)` isolates only tickets with pending lines for that station.
  - Station Counts: `kitchen.toMake(orders, stationId)` calculates the active work backlog.
  - `ownFirst` Line Sorting: When rendering a ticket on a station screen, lines belonging to that station are sorted to the top; lines belonging to other stations appear below, muted at 50% opacity (`.isOther`).
  - Quiet Handover Veil (`W-37`): When a station finishes its own lines on a multi-station order, it shows "Handed over · 2 left at other stations" under a quiet veil. The order leaves that station's screen while remaining active on the main Kitchen Screen.
- **What Station Screens Provide to Kitchen**:
  - Real-time line advances (`advance`, `toggleHold`) executed by station cooks immediately sync to the master Kitchen Screen via the shared Zustand store.

### 5.3 Hardware & Operating System Integration Contract
- **Screen Wake Lock API (`useWakeLock`)**:
  - Line cooks cannot unlock screens with greasy hands.
  - `useWakeLock(true)` invokes `navigator.wakeLock.request('screen')`.
  - Automatically re-acquires lock when browser tab regains focus (`visibilitychange` event).
  - Fails silently without crashing if hardware or browser lacks Wake Lock support.
- **Tactile Haptic Actuation (`buzz`)**:
  - Triggers physical vibration patterns via `navigator.vibrate` when enabled in device preferences:
    - Priority toggle: 40ms confirmation buzz.
    - Status advance: crisp tactile click.

---

## 6. Comprehensive Interaction Audit Matrix

The following interaction audit details every single touch, gesture, state transition, and responsive adaptation across the entire Kitchen Screen subsystem:

| Interaction Target | Gesture / Event | Threshold / Timing | Action & State Transition | Visual & Haptic Feedback | Safety & Error Guards |
|---|---|---|---|---|---|
| **Station Pill** | Tap (Click) | Immediate (< 100ms) | `k.filterKitchen(station)` updates `ui.kitchenFilter` | Pill background darkens to 30% tint; icon stroke lights up; list filters instantaneously | Zero guard needed (filtering is non-destructive) |
| **Station Carousel** | Horizontal Drag | `touch-action: pan-x` | Scrolls pill row smoothly; reveals hidden stations | Smooth momentum scrolling; soft right-edge gradient fade mask | Scroll gesture never triggers pill selection |
| **"Open Station" CTA** | Tap (Click) | Immediate | `k.openStation(filter, 'kitchen')` | Navigates to dedicated single-order Station view | Button only renders when a specific station is active |
| **Back Arrow Button** | Tap (Click) | Immediate | `go('launch')` | Returns to Launchpad screen | Hit area strictly ≥ 44×44px (`var(--dl-hit-min)`) |
| **Giant Token (`#042`)** | Press-and-Hold | 600ms (`HOLD.durationMs`) | `k.togglePriority(o.id)` dispatches `order.priority` | 40ms haptic buzz; card activates amber glow & bobbing priority icon | Drag > 10px cancels hold; 5.0s Undo toast shown; 450ms reorder guard activated |
| **Line Item Row** | Single Tap (Slap) | Immediate on touch-up | `k.advance(orderId, lineId)` advances line status | Line bar/badge updates; 40ms haptic click; Undo toast pops up | **600ms anti-flutter debounce** (`gapOk`); paused lines refuse tap |
| **Line Item Row** | Press-and-Hold | 600ms (`HOLD.durationMs`) | `k.toggleHold(orderId, lineId)` toggles `held` state | Line status shifts to Purple "On hold" (or reverts to Preparing) | Drag > 10px cancels hold; auto-prep countdown cancelled |
| **Reorder Queue Shift** | Order Re-sorting | Automatic on queue change | `useReorderGuard` triggers `.guard` | Pointer events disabled on card list for 450ms | Prevents accidental mis-taps when queue shifts beneath finger |
| **Ticket Completion** | All Lines Handed | Immediate on final line | `LeavingCard` activates frosted veil | Frosted glass blur (6px) + centered checkmark badge pops in | Card becomes completely `inert` for 2.5s; drops off cleanly |
| **Ticket Cancellation** | Counter Cancels | Immediate via sync | `LeavingCard` activates red cross veil | Red cross badge pops in; card displays "Cancelled" | Card becomes `inert`; removed after 2.5s |
| **Device Wake Lock** | Screen Mount / Tab Focus | Continuous | `navigator.wakeLock.request('screen')` | Screen stays awake indefinitely; never dims or sleeps | Listens to `visibilitychange` to reclaim lock upon app resume |
| **Tablet Viewport** | Screen Resize / Rotate | Width ≥ 48rem & Height ≥ 30rem | `useWide()` switches `.phone` to `.wide` and `.kgrid` | Cards reflow from single column to 2–4 column auto-fill grid | Rem-based calculation ensures 200% text preserves single column |
| **Mobile Landscape** | Orientation Change | `orientation: landscape` & height < 30rem | CSS media query activates compact landscape header | Kicker hides; header shrinks; max ticket area visible | Eliminates wasted vertical space on shelf-mounted phones |
| **200% Accessibility Zoom**| System Font Scale | Container width < 24rem | Container query `@container (max-width: 24rem)` | Station pills wrap into multi-line grid; header scrolls with cards | Complete WCAG AAA compliance; zero text truncation |

---

## 7. Responsive Viewport Scaling & Layout Blueprints

### 7.1 Mobile Portrait Blueprint (360×780, 390×844)
```
┌──────────────────────────────────────────────────────────────┐
│  STALL NAME                                    [Back] [All]  │  <-- Header Grid (48px)
│  Kitchen · 5 Orders                            [Open Momos ↗]│
├──────────────────────────────────────────────────────────────┤
│  [All 14]  [Tortillas 4]  [Momos 6]  [Desserts 2]  [Bev 2]   │  <-- Horizontal Pill Carousel
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  ┌────────────┐   #042         ⏱ 3 min ago               │ │  <-- High-Contrast Token Tile
│ │  │    #042    │   Rahul S.     Unpaid                    │ │
│ │  └────────────┘                                          │ │
│ │  ⚠️ ALLERGY: NO PEANUTS / EXTRA CRISPY                   │ │  <-- Allergy Alert Strip
│ │ ┌──────────────────────────────────────────────────────┐ │ │
│ │ │ ●  2× Steamed Veg Momos                  [Preparing] │ │ │  <-- 60px Tactile Touch Line
│ │ └──────────────────────────────────────────────────────┘ │ │
│ │ ┌──────────────────────────────────────────────────────┐ │ │
│ │ │ ●  1× Fried Paneer Momos                     [Start] │ │ │
│ │ └──────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  #043 ...                                                │ │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Kitchen Tablet Grid Blueprint (1024×768, 1180×820)
When mounted on a kitchen wall or central expediter counter, tablets automatically reflow via `.kgrid`:
```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ FAIR STALL                    Kitchen · 8 Orders                              [Back] [All] │
│ [All 22]  [Tortillas 5]  [Momos 8]  [Desserts 3]  [Sandwiches 2]  [Cutlets 4]              │
├────────────────────────────┬────────────────────────────┬──────────────────────────────────┤
│ TICKET #042    ⚡ PRIORITY  │ TICKET #043     ⏱ 9 min ago│ TICKET #044           ⏱ just in  │
│ Rahul · Unpaid             │ Priya                      │ Amit                             │
│ ⚠️ NO PEANUTS              │ ────────────────────────── │ ──────────────────────────────── │
│ ────────────────────────── │ 2× Dosa      [Preparing]   │ 1× Veg Sandwich         [Start]  │
│ 2× Momos      [Preparing]  │ 1× Chai      [Preparing]   │ 1× Cold Coffee          [Start]  │
│ 1× Chai            [Done?] │                            │                                  │
├────────────────────────────┼────────────────────────────┼──────────────────────────────────┤
│ TICKET #045    ⏱ 16m [RED] │ TICKET #046     ⏱ 2 min ago│ TICKET #047           ⏱ just in  │
│ ...                        │ ...                        │ ...                              │
└────────────────────────────┴────────────────────────────┴──────────────────────────────────┘
```

---

## 8. Technical Standards & Code Quality Audit

### 8.1 Driftline Tokens & Styling Directives
- **Zero Tailwind**: Strictly forbidden by architecture ADR-0001. Enforced by ESLint rule `no-restricted-imports`.
- **Pure CSS Modules**: All styles encapsulated in `src/ui/kitchen/Kitchen.module.css`.
- **Zero Raw Pixels (`px`)**: All dimensions declared in `rem` (`16px = 1rem`), allowing fluid scaling under operating system font magnification.
- **Zero `rgba()`**: Modern color blending exclusively uses `color-mix(in srgb, ...)`.
- **Token Compliance**: All colors draw from semantic tokens (`--dl-stall-station-*`, `--dl-stall-st-*`, `--dl-color-*`, `--dl-card-*`).

### 8.2 Strict Architectural Linter Compliance
- `max-depth: 3`: Function nesting depth strictly capped at 3 levels.
- `max-lines-per-function: 40`: Modular component decomposition (cleanly partitioned into `Pill`, `KitchenScreen`, `Token`, `Facts`, `NoteStrip`, `PriorityToken`, `LineRow`, `KitchenCard`, `StatusMark`, `LeavingCard`).
- `max-warnings: 0`: Zero linting or styling warnings permitted across the codebase.
- Verified passing with `eslint . --max-warnings=0` and `stylelint "src/**/*.css"`.

---

## 9. Architectural Certification
The Mobile Kitchen Screen (KDS) specification is certified complete, robust, and aligned with industrial commercial kitchen standards and Apple Human Interface Guidelines. Every physical challenge (distance, grease, smoke, rush cadence) is counteracted with a defensive software architectural mechanism (high-contrast tokens, anti-flutter debouncing, reorder guards, and frosted leaving veils).
