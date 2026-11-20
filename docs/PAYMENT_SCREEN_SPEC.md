# Payment Screen Specification & Interaction Blueprint: Stall App Mobile POS

## 1. Ergonomic Context & POS Mental Model
The Payment Screen applies the fluid, tactile interaction design of modern media streaming apps (YouTube, Spotify, Netflix) to high-throughput mobile POS payments:
- **Fast 2-Tap Checkout**: Tapping Cash or UPI assigns 100% of the payable amount to that tender and illuminates the prominent "Confirm payment" CTA.
  $$\text{Tap Tender (Cash/UPI)} \longrightarrow \text{Tap Confirm Payment}$$
- **Zero Virtual Keyboard Viewport Jitter**: Native OS virtual keyboards (iOS Safari / Android Chrome) are strictly avoided. Focusing an input in standard web apps degrades performance, causes layout thrashing, and pushes the bottom bar out of the thumb zone. Replaced with an integrated on-screen tactile Numpad (`Numpad.tsx`).
- **Dynamic Offline UPI QR Code Engine**: Generates `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...` with multi-payee switching and live paise-accurate amount embedding.
- **Split Tender Slider & Dual-Padlock Mechanism**: Continuous slider with ₹10 snap points, padlock mechanism to lock Cash or UPI while adjusting the other side.
- **Cash Tender & Change Drawer**: Quick cash denomination buttons (₹500, ₹200, ₹100, ₹50, etc.) that tally cash received and instantly calculate change to return.
- **Settled View & Cysno 58mm Thermal Slip Triggers**: Instant transition to celebratory "Paid ✓" state with token number banner, direct thermal slip print triggers, and "New order" turnaround.

---

## 2. Component Architecture & UI Elements

### 2.1 Header & Status Area (`DueHead`)
- **Token Callout**: High-visibility token badge formatted with `CONFIG.tokens.pad` (e.g. `Token #042`).
- **Amount Due Display**: Hero typography (`font-size: 2.25rem`, `font-weight: 800`) displaying net payable balance.
- **Adjustment Breakdown**: Displays original bill, tip additions (`+₹20`), and authorized waivers (`−₹10`).
- **Utility Actions**: "Print bill" button and desk "Calculator" sheet launcher.

### 2.2 Tender Selector (`MethodSeg`)
- **Hit Targets**: Minimum height 4.5rem (72px) for blind thumb tapping.
- **Tender Options**:
  - **Cash**: Emerald Green (`--dl-stall-pos-text`, `#30D158`).
  - **UPI**: Sky Blue (`--dl-stall-info-text`, `#5AC8FA`).
  - **Split**: Slate Muted (`--dl-color-text-muted`).
  - **Card (Roadmap)**: Indigo Accent (`--dl-color-accent`).

### 2.3 Integrated Tactile Numpad (`Numpad.tsx`)
- **Keypad Matrix**: 3×4 touch grid (`1–9`, `00`, `0`, `⌫`, `Done`).
- **Fresh Amount Heuristic**: First keypress on opening replaces the existing buffer rather than appending, eliminating backspace spamming.
- **Spring Physics**: Dismissible via downward swipe gesture using `useSheetDrag`.

### 2.4 Dynamic Offline UPI QR Code (`QrBlock.tsx`)
- **Deterministic Offline Deep Link**: Encodes merchant VPA, name, amount, and order token note.
- **Payee Switcher**: Horizontal pill selector enabling seamless switching between merchant bank accounts/VPAs.
- **Optical High Contrast**: Pure white card tile (`--dl-stall-white`, `#FFFFFF`) with deep black QR ink (`--dl-stall-qr-ink`, `#000000`) and ambient drop shadow (`--dl-stall-qr-shadow`) ensuring instant camera scanning in direct sunlight or dim night markets.

### 2.5 Split Slider & Padlocks (`Slider.tsx`)
- **Analog Dual-Track**: Visualizes proportional distribution via a two-tone gradient fill (Cash Green on the right, UPI Sky Blue on the left).
- **Tactile ₹10 Snap Grid**: Continuous gestures snap to ₹10 (`1,000 paise`) intervals.
- **Directional Ergonomics**: Dragging right increases UPI; dragging left increases Cash.
- **Padlock Isolation Engine (`toggleLock`)**:
  - Tapping padlock on Cash or UPI freezes that tender.
  - The slider track enters `.trackLocked` (disabled, pointer events none).
  - Any subsequent changes (Tips, Waives, Numpad typing) are absorbed by the **unlocked** tender.

### 2.6 Cash Denomination Drawer (`CountNotesDrawer`)
- **Banknote Denominations**: Standard Indian banknotes: ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5, plus secondary drawer for ₹1,000 / ₹2,000 notes.
- **RBI Banknote Color Swatches**: Chromatic accent bars mapped to Reserve Bank of India note hues.
- **Instant Tallying & Change Calculation**: Single-tap to increment (+1), stepper controls (−/+) for multi-note intake, with real-time change computation:
  $$\text{Change to return} = \max(0, \text{cashGiven} - \text{cashPaid})$$
- **Persistent Phone State**: Remembers open/closed preference on each device via `prefs.countNotesOpen`.

### 2.7 Settled View (`Settled`)
- **Celebratory Confirmation**: "Paid ✓" state with giant token number display (`#042`).
- **Direct Thermal Slip Triggers**: Single-tap buttons for "Print token" (pickup counter) and "Print bill" (customer receipt).
- **Sub-2-Second Turnaround**: Prominent "New order" CTA immediately calls `counter.newOrder()`.

---

## 3. Inter-Screen Contract Specification

### Upstream Contract (BillingScreen $\longrightarrow$ PaymentScreen)
- **Input Object**: `Order` entity from store.
- **Key Attributes**: `orderId`, `token`, `lines`, `client`, `netDue` (`bill.due(order)`), `total` (`bill.total(order)`).
- **Draft Preservation**: Local transient draft state (`ui.payDrafts[orderId]`) retains uncommitted tips, waivers, authorizer names, and notes across tab switches.

### Downstream Contract (PaymentScreen $\longrightarrow$ Store `counter.pay`)
- **Dispatched Op**: `payment.add` (appended to IndexedDB op-log, replicated offline-first).
- **Payload Structure**:
  ```typescript
  {
    paymentId: string;
    orderId: string;
    cash: Paise;
    upi: Paise;
    upiPayeeId: string | null;
    tip: Paise;
    waived: Paise;
    waivedBy: string;
    waivedNote: string;
    cashGiven: Paise;
    notes: Record<string, number>;
  }
  ```
- **Validation Invariants**: Rejects negative values, ensures exact sum balance (`cash + upi + waived === due + tip`), disallows waiving tips, and verifies order concurrency leases (`!isLocked()`).

### Peripheral Contract (PaymentScreen $\longrightarrow$ 58mm ESC/POS Bluetooth Thermal Printer)
- **Hardware Target**: Cysno / POS-58 58mm Bluetooth thermal printers (32 columns, Font A).
- **Data Payload**: Formatted `SlipText` with ASCII sanitization (replacing `₹` with `Rs ` to prevent garbage printer glyphs), chunked into 100-byte MTU writes over Web Bluetooth Low Energy, with automatic `window.print()` 58mm fallback.
