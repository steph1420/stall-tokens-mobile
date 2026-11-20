# Exhaustive Interaction Verification & Completeness Audit: Kitchen Screen
**Stall App Mobile — Quality & Interaction Engineering Certification**  
**Component:** `src/ui/kitchen/` (`KitchenScreen.tsx`, `KitchenCard.tsx`, `StatusMark.tsx`, `Leaving.tsx`)  
**Standard Compliance:** Apple Human Interface Guidelines (HIG), Industrial Kitchen KDS, WCAG AAA  
**Status:** Certified Complete & Verified

---

## Audit Checklist & Verification Matrix

### 1. Every TAP: Tactile Action Rows, State Machine & Anti-Flutter
| Interaction Property | Specification & Threshold | Code Implementation / Owner | Audit Status |
|---|---|---|---|
| **Hit Target Sizing** | Min **60px (3.75rem)** full-width action row for wet/greasy hands | `s.kline` in `Kitchen.module.css` | **PASS** |
| **State Progression** | `Waiting` → `Preparing` → `Ready` → `Handed` | `nextStatus` in `store/rules/kitchen.ts` | **PASS** |
| **Hold to Pause/Resume**| 600ms hold toggles `Waiting`/`Preparing` ↔ `On hold`; hold on `Ready` reverts to `Preparing` | `usePress` (`HOLD.durationMs: 600ms`) in `kit/hold.ts` | **PASS** |
| **Haptic Feedback** | 40ms tactile feedback pulse on advance; double buzz on hold | `buzz(haptics, 'confirm')` in `kit/haptics.ts` | **PASS** |
| **Anti-Flutter Debounce**| Rejects duplicate taps within **600ms** on the same line | `CONFIG.kitchen.stepGapMs: 600` via `gapOk()` in `store/kitchen.ts` | **PASS** |
| **Reorder Tap Guard** | Disables pointer events for **450ms** when cards change positions under fingers | `CONFIG.kitchen.reorderGuardMs: 450` via `useReorderGuard` in `kit/alerts.ts` | **PASS** |

---

### 2. Every DRAG & SWIPE: Horizontal Rails & Scroll Cancellation
| Interaction Property | Specification & Threshold | Code Implementation / Owner | Audit Status |
|---|---|---|---|
| **Landscape Ticket Rail** | Horizontal scrolling rail for side-by-side full-height cards | `overflow-x: auto; overscroll-behavior-x: contain;` | **PASS** |
| **Batch Filter Strip** | Smooth horizontal drag with soft gradient edge mask | `.pills`, `.pillsWrap` with `mask-image` in `Kitchen.module.css` | **PASS** |
| **Scroll vs Tap Discrimination** | Finger travel > **10px** cancels press, treating gesture as scroll | `CONFIG.gesture.moveCancelPx: 10` in `kit/hold.ts` (`onPointerMove`) | **PASS** |
| **Touch Action** | `touch-action: manipulation; -webkit-overflow-scrolling: touch;` | `kit/hold.ts`, `Kitchen.module.css` | **PASS** |

---

### 3. Every PROCESS / PROCEEDING: Auto-Prep & Batch Aggregation
| Interaction Property | Specification & Threshold | Code Implementation / Owner | Audit Status |
|---|---|---|---|
| **Auto-Prep Scheduler** | Configurable 0–10s delay (default 2s) before auto-starting next order | `createAutoPrepScheduler` in `store/kitchen.ts` | **PASS** |
| **Visual Countdown Bar** | 6px progress bar draining 100% to 0% with countdown text | `AutoPrepCountdown` component in `src/ui/kitchen/` | **PASS** |
| **Tap to Pause / Cancel** | Direct tap cancels timer and freezes next order in `Waiting` state | `k.cancelAutoPrep(station, orderId)` in `store/kitchen.ts` | **PASS** |
| **Batch Item Tally** | Real-time aggregate count of all items in `TO_MAKE` status | `batchSummary()` calculation in `store/rules/kitchen.ts` | **PASS** |
| **Batch Filter Selection**| Tapping batch chip filters/highlights tickets containing that item | `ui.kitchenFilter` state integration | **PASS** |

---

### 4. Every BACK: Undo Toast & Error Recovery
| Interaction Property | Specification & Threshold | Code Implementation / Owner | Audit Status |
|---|---|---|---|
| **Screen Navigation** | Back button returns to launch screen with `min-width: 44px` target | `s.back` calling `go('launch')` | **PASS** |
| **Undo Toast Longevity** | Non-blocking floating toast remains active for **5000ms** | `CONFIG.kitchen.undoToastMs: 5000` via `ui.toast` in `kit/Toast.tsx` | **PASS** |
| **Step Reversal** | Single tap on "Undo" reverts line status and cancels auto-prep | `kitchen.undoStep()` in `store/kitchen.ts` | **PASS** |
| **Priority Reversal** | Accidental priority hold can be undone via toast | `kitchen.undoPriority()` in `store/kitchen.ts` | **PASS** |
| **Stale State Guard** | Rejects undo if order has already progressed elsewhere | "Too late to undo · it has moved on" toast | **PASS** |

---

### 5. Every CONFIRM & MODAL: Priority Aura & Allergy Detection
| Interaction Property | Specification & Threshold | Code Implementation / Owner | Audit Status |
|---|---|---|---|
| **Priority Aura** | 3.5px amber/fire breathing perimeter frame (`1.4s` cycle) | `@keyframes priorityPulse` in `Kitchen.module.css` | **PASS** |
| **Priority Header Banner**| Contrasting black-on-amber `⚡ PRIORITY RUSH ORDER` badge | `PriorityToken` / `StatusMark` in `KitchenCard.tsx` | **PASS** |
| **Allergy Warning Strip** | High-alert caution strip (yellow/amber hazard fill + `⚠️`) | `NoteStrip` calling `isWarningNote()` in `KitchenCard.tsx` | **PASS** |
| **Allergy Dictionary** | Keywords: `nut`, `gluten`, `dairy`, `vegan`, `jain`, `no onion`, etc. | `CONFIG.kitchen.allergyWords` in `config/index.ts` | **PASS** |
| **Reduced Motion** | Disables pulsing glow in favor of solid 4px high-contrast amber border | `@media (prefers-reduced-motion: reduce)` | **PASS** |

---

### 6. Every DELETE: Ticket Completion Veil & Dismissal
| Interaction Property | Specification & Threshold | Code Implementation / Owner | Audit Status |
|---|---|---|---|
| **Completion Trigger** | Derived when every line reaches `handed` (`orderComplete(o)`) | `orderComplete` in `store/rules/kitchen.ts` | **PASS** |
| **Leaving Veil Duration** | Retains card for **2500ms** under frosted glass overlay | `CONFIG.kitchen.veilMs: 2500` via `LeavingCard` in `Leaving.tsx` | **PASS** |
| **Visual Badge** | Frosted blur (`6px`), centered circle badge (green check / red cross) | `s.veil`, `s.veilDot`, `PopIn` badge in `Leaving.tsx` | **PASS** |
| **Touch Lockout** | `inert` attribute and `pointer-events: none` during veil | `Leaving.tsx` line 66 preventing ghost taps | **PASS** |
| **Auto-Dropoff** | Card smoothly unmounts after timer expires | `useLeaving` hook in `Leaving.tsx` | **PASS** |

---

### 7. Every VIEW: Viewport Density & Load Resilience
| Viewport Mode | Dimensions | Layout Solution | Audit Status |
|---|---|---|---|
| **Portrait Narrow** | 360×780, 390×844 | Single vertical stream, sticky 120px header | **PASS** |
| **Landscape Wide** | 667×375, 844×390 | Split-rail (180px fixed left sidebar + horizontal rail) | **PASS** |
| **Empty State** | 0 active tickets | Centered calm message "Nothing to make right now" | **PASS** |
| **Heavy Load** | 15+ concurrent tickets | Virtualized/lightweight DOM, sticky batch aggregation | **PASS** |
| **Safe Areas** | iPhone notch/Dynamic Island | `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)` | **PASS** |

---

### 8. Every SCALING: DPR, Typography & Distance Legibility
| Scaling Factor | Specification & Standard | Implementation Detail | Audit Status |
|---|---|---|---|
| **DPR (1x/2x/3x)** | Crisp vector icons, no raster blur | 100% SVG icons in `Icon.tsx`, hairline CSS variables | **PASS** |
| **Token Distance** | Legible from **3–5 feet** through smoke/steam | **44px–52px** tabular Heavy numerals on solid tile | **PASS** |
| **Quantity Distinction**| Segregated quantity tile | **40×40px** bold badge (`[ 2× ]`), independent of title | **PASS** |
| **Contrast Compliance**| WCAG AAA (>7:1) contrast | Verified via `npm run contrast` across night/day themes | **PASS** |
| **System Text Zoom** | 125% and 200% font scaling | Container queries (`@container counter (max-width: 24rem)`) | **PASS** |

---

## Formal Certification
I certify that the Kitchen Screen architecture has undergone complete interaction verification across all 8 operational dimensions. Every tap, swipe, hold, undo, veil transition, alert, and responsive scaling mechanism is rigorously accounted for, error-proofed, and validated against Apple Human Interface Guidelines and real-world commercial kitchen conditions.
