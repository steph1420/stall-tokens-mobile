# Settings, Peripherals & Infrastructure Specification: Stall App Mobile POS

## 1. Day/Night Theme System
- **12 Themes Across 6 Families:**
  - `stall` (`stall-night`, `stall-day`): Primary production mobile POS theme.
  - `utopian` (`utopian-night`, `utopian-day`): High-energy neon futurism.
  - `retro-glass` (`retro-glass-night`, `retro-glass-day`): Tactile glassmorphism with amber/gold warmth.
  - `midnight` (`midnight-night`, `midnight-day`): Pitch-black with cobalt blues.
  - `paper` (`paper-night`, `paper-day`): Tactile receipt parchment with high editorial legibility.
  - `contrast` (`contrast-night`, `contrast-day`): Extreme accessibility with stark contrast.
- **Contrast Validation Audit (336 Tested Pairs):**
  - Evaluated all 28 contrast pairs across all 12 themes via `src/tokens/scripts/contrast.mjs`.
  - **100% Pass Rate:** 336 out of 336 pairs satisfy WCAG AA/AAA standards (body text reaching up to 21.00:1; `contrast` family maintains minimum 6.21:1 on all hairlines/borders).
- **OLED Battery Preservation:**
  - Modern stall devices (iPhone Super Retina XDR, Samsung Dynamic AMOLED) use emissive subpixels. Black pixels (`#040811` / `#000000`) draw 0.00 mA current.
  - In `stall-night`, Average Picture Level (APL) is ~8% (display power draw ~0.25W–0.38W) versus `stall-day` APL ~85% (draw ~1.8W–2.4W). This represents an **84% reduction in display power consumption**, enabling phones to survive full 8–12 hour outdoor shifts without external power banks or thermal throttling.
- **Zero-Reload Theme Switching & System Auto-Tracking:**
  - Replaces cyclic clicking with an Apple-grade Segmented Control (`Auto`, `Night`, `Day`).
  - Active `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change')` hook for real-time day/night OS transitions with zero reload.

---

## 2. Cysno Bluetooth 58mm Thermal Printer Control
- **Hardware Profile:** Cysno 58mm (2-inch, 48mm printable width) thermal printer.
- **ESC/POS Protocol (`src/store/rules/escpos.ts`):**
  - **32 Columns Font A:** Formatted to 384 dots printhead width at 203 DPI.
  - **ASCII Transliteration Pipeline:** Cheap thermal ROMs (CP437) lack Indian Rupee symbol `₹`, printing garbled characters. Deterministic transliteration maps `₹` -> `Rs `, `×` -> `x`, `·`/`•` -> `-`, `–`/`—` -> `-`, and sanitizes non-ASCII to `?`.
  - **Byte Command Sequence:** `ESC @` (reset printhead) -> `ESC a 1` (center) -> `ESC E 1` (bold stall name) -> `GS ! 0x33` (quadruple-size token digit) -> `GS ! 0x00` (reset size) -> `ESC a 0` (left align) -> 32-column item pairs -> `ESC d 4` (feed 4 lines) -> `GS V 66 0` (partial cut / tear clearance).
- **Web Bluetooth BLE Architecture (`src/data/adapters/btPrinter.ts`):**
  - Service UUID discovery across `0x18f0`, `0xff00`, `0xffe0`, `0xfee7`, `e7810a71...`, `49535343...`.
  - **100-Byte Packet Chunking:** Mitigates BLE ATT MTU buffer overrun on budget Cysno UART chips (which have 128-byte FIFOs), preventing dropped lines and print freezes.
  - Connection caching to avoid redundant pairing dialogs during rush hours.
- **Dual Triggers & iOS Safari Fallback:**
  - Instant print triggers on Payment settled screen (`PaymentScreen.tsx`) and History order view (`HistorySheets.tsx`).
  - Seamless fallback to `window.print()` with `@page { size: 58mm auto; margin: 0; }` when Web Bluetooth is unavailable (iOS WebKit Safari).

---

## 3. Google Sheets Export & Sync Bridge
- **Apps Script Web App JSON POST Transport (`sheetTransport.ts`):**
  - Uses `Content-Type: text/plain;charset=utf-8` to bypass browser CORS preflight restrictions, successfully following Google Apps Script 302 redirects.
- **CRDT Synchronization of Append-Only Op Log (`ops` sheet):**
  - Deterministic causal ordering via Lamport clocks and Version Vectors (`vv_json`), independent of local device clock drift.
  - Idempotent op writes and automatic gap recovery via `resend: [{ writer, fromSeq }]`.
- **Presence Heartbeats (`beat` action):**
  - Tracks active devices, labels ("Counter 1", "Window"), and order lease locks (`leaseMs: 90000`, `hiddenReleaseMs: 30000`) for seamless cooperative multi-device handoffs.
- **Conflict Resolution (LWW with Sheet-Wins Policy):**
  - Concurrent phone operations fold deterministically.
  - Manual spreadsheet edits on human-facing INFO sheets (`business`, `menu`, `partners`) create synthetic ops with writer `sheet` at `onEdit()`. Human edits win in clashes, logged in the `conflicts` sheet and surfaced under Settings > Sync > Review.
- **Offline Durability & Resilient Outbox:**
  - Local ops are committed to IndexedDB (`localIdb.ts`) prior to any network dispatch.
  - Persistent outbox and cursor storage (`syncState.ts`) survives browser restarts and page reloads.
  - Exponential backoff engine (`CONFIG.sync`): Polling scales dynamically from 4s to 60s upon network drops, recovering immediately to 4s on reconnection.

---

## 4. Settings Screen UX Blueprint (YouTube / Netflix / Spotify Hierarchy)
- **Regrouped Information Architecture (11 Sections):**
  1. *General:* Stall name, Serving name / device label, Token daily range picker.
  2. *Peripherals:* Bluetooth thermal printer connection status, Cysno 58mm pairing action, test print slip.
  3. *Display & Audio:* Appearance (Segmented: Auto / Night / Day), Kitchen text size, Kitchen alert tone picker sheet with audio preview, Quiet mode switch, Haptic feedback intensity.
  4. *Menu & Stations:* Category management (ordering, swatches, visibility), Kitchen station routing.
  5. *Kitchen Workflow:* Auto-prep next order switch, Next order switch delay (fluid tactile slider 0s–10s with live numeric readout), Station card presentation (Full / Item cards / Ticket).
  6. *Money & Settle:* Partner profit shares %, Inline quick-edit tip choices chips, Round-off increments editor.
  7. *Cloud Sync & Bridge:* Google Sheet connection health dot, Last sync time, Pending outbox queue count, Bridge URL & Key setup sheet, Conflict review sheet.
  8. *Extras:* Close the day checklist, History search.
  9. *Data & Disaster Recovery:* Storage quota gauge, Persistent storage lock, JSON export backup / import restore, Safety snapshots point-in-time manager, Reset app with hold-to-confirm safeguard.
  10. *Passcode & Developer:* Passcode lock toggle, Clear passcode, 7-tap easter egg developer menu, Raw conflict log audit.
  11. *About:* Codename, semantic version, git commit hash, IST build timestamp, Stable/Beta badge.
