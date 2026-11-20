// F-41 Web Bluetooth thermal printer (Chrome on Android / Desktop).
// Universal ESC/POS 58 mm support for micro thermal printers (Cysno, POS-58, MPT-II, JP-58, Goojprt).
// Paced in 20-byte chunks with 15ms delays to avoid micro-printer RX FIFO buffer overflows.

interface Char {
  readonly properties: { readonly write: boolean; readonly writeWithoutResponse: boolean };
  writeValueWithoutResponse?: (b: BufferSource) => Promise<void>;
  writeValue: (b: BufferSource) => Promise<void>;
}

interface Svc {
  getCharacteristics: () => Promise<Char[]>;
}

interface Gatt {
  readonly connected: boolean;
  connect: () => Promise<Gatt>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<Svc[]>;
  getPrimaryService: (service: string | number) => Promise<Svc>;
}

interface BtDevice {
  readonly name?: string;
  readonly id: string;
  readonly gatt?: Gatt;
}

interface Bt {
  requestDevice: (o: object) => Promise<BtDevice>;
  getDevices?: () => Promise<BtDevice[]>;
}

/** Comprehensive ESC/POS & serial BLE services used by 58 mm mobile thermal printers. */
const SERVICES: (string | number)[] = [
  0x18f0, // Standard ESC/POS
  0xff00, // Common Chinese thermal printers (Cysno, POS-58, JP-58, MPT-II)
  0xffe0, // HM-10 / MPT-II transparent UART
  0xfee7, // Tencent / WeChat IoT hardware
  0xfff0, // Alternative BLE serial module
  0xae00, // Custom BLE printer profile
  0xae30,
  0x1800, // Generic Access
  0x1801, // Generic Attribute
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART (very common on Cysno and mobile POS printers)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic Semiconductor UART Service (NUS)
];

// 20 bytes is the universal BLE ATT MTU safe payload limit.
const CHUNK_SIZE = 20;
const INTER_CHUNK_DELAY_MS = 15;
const PRINTER_STORAGE_KEY = 'stall_bt_printer_name';

let cachedDevice: BtDevice | null = null;
let cachedChar: Char | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bt = (): Bt | null =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator
    ? (navigator as unknown as { bluetooth: Bt }).bluetooth
    : null;

export const canBluetoothPrint = (): boolean => bt() !== null;

export function getSavedPrinterName(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(PRINTER_STORAGE_KEY);
}

export function disconnectPrinter(): void {
  try {
    cachedDevice?.gatt?.disconnect();
  } catch (err) {
    console.warn('Disconnect error', err);
  }
  cachedDevice = null;
  cachedChar = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(PRINTER_STORAGE_KEY);
  }
}

async function findWritableChar(svc: Svc): Promise<Char | null> {
  try {
    const chars = await svc.getCharacteristics();
    return chars.find((x) => x.properties.writeWithoutResponse || x.properties.write) ?? null;
  } catch (err: unknown) {
    console.warn('Skip service characteristics', err);
    return null;
  }
}

async function findCharInServices(g: Gatt): Promise<Char | null> {
  try {
    const svcs = await g.getPrimaryServices();
    for (const svc of svcs) {
      const c = await findWritableChar(svc);
      if (c) return c;
    }
  } catch (err: unknown) {
    console.warn('Skip bulk service query', err);
  }
  return null;
}

async function findCharInKnownUuids(g: Gatt): Promise<Char | null> {
  for (const sUuid of SERVICES) {
    try {
      const svc = await g.getPrimaryService(sUuid);
      const c = await findWritableChar(svc);
      if (c) return c;
    } catch (err: unknown) {
      console.warn('Skip UUID candidate', sUuid, err);
    }
  }
  return null;
}

async function findChar(dev: BtDevice): Promise<Char> {
  if (!dev.gatt) throw new Error('This printer has no Bluetooth LE connection');
  const g = dev.gatt.connected ? dev.gatt : await dev.gatt.connect();

  const c1 = await findCharInServices(g);
  if (c1) return c1;

  const c2 = await findCharInKnownUuids(g);
  if (c2) return c2;

  throw new Error('No writable print channel found on this printer');
}

/** Prompts user to pick a Bluetooth thermal printer and verifies connection. */
export async function selectPrinter(): Promise<string> {
  const b = bt();
  if (!b) throw new Error('Bluetooth printing is not available in this browser');
  const dev = await b.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  cachedDevice = dev;
  cachedChar = await findChar(dev);
  const name = dev.name || 'Bluetooth Thermal Printer';
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PRINTER_STORAGE_KEY, name);
  }
  return name;
}

/** Sends raw ESC/POS bytes to the printer in paced 20-byte chunks. */
export async function bluetoothPrint(bytes: Uint8Array): Promise<void> {
  const b = bt();
  if (!b) throw new Error('Bluetooth printing is not available in this browser');

  if (!cachedChar || !cachedDevice?.gatt?.connected) {
    const dev = cachedDevice ?? (await b.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES }));
    cachedDevice = dev;
    cachedChar = await findChar(dev);
    if (dev.name && typeof localStorage !== 'undefined') {
      localStorage.setItem(PRINTER_STORAGE_KEY, dev.name);
    }
  }

  const c = cachedChar;
  try {
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const part = bytes.slice(i, i + CHUNK_SIZE);
      if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) {
        await c.writeValueWithoutResponse(part);
      } else {
        await c.writeValue(part);
      }
      if (i + CHUNK_SIZE < bytes.length) {
        await sleep(INTER_CHUNK_DELAY_MS);
      }
    }
  } catch (e) {
    cachedChar = null;
    throw e;
  }
}

function buildTestSlip(
  stallName: string,
  eventName?: string,
  slogan?: string,
  contact?: string,
  address?: string
): Uint8Array {
  const COLS = 32;
  const ESC = 0x1b;
  const GS = 0x1d;
  const out: number[] = [];
  const cmd = (...b: number[]) => { out.push(...b); };
  const text = (s: string) => {
    for (const ch of s.replace(/[^\x20-\x7e]/g, '?')) out.push(ch.charCodeAt(0));
    out.push(0x0a);
  };

  cmd(ESC, 0x40, ESC, 0x61, 1, ESC, 0x45, 1); // Center, bold
  text(stallName);
  cmd(ESC, 0x45, 0); // Bold off

  if (eventName) text(eventName);
  if (slogan) text(slogan);
  if (address) text(address);
  if (contact) text(`Contact: ${contact}`);

  text('='.repeat(COLS));
  cmd(GS, 0x21, 0x11); // Double size
  text('TEST PRINT OK');
  cmd(GS, 0x21, 0x00); // Normal size
  text('='.repeat(COLS));

  cmd(ESC, 0x61, 0); // Left align
  text('Printer: 58mm Bluetooth');
  text(`Time: ${new Date().toLocaleTimeString('en-IN')}`);
  text(`Date: ${new Date().toLocaleDateString('en-GB')}`);
  text('-'.repeat(COLS));
  text('Ready for tokens & billing!');
  text('-'.repeat(COLS));

  cmd(ESC, 0x61, 1); // Centre
  text('Thank you for choosing us!');
  cmd(ESC, 0x64, 4, GS, 0x56, 0x42, 0x00); // Feed 4 lines, cut/feed
  return Uint8Array.from(out);
}

/** Prints a test receipt to verify printer functionality, text alignment, and paper feed. */
export async function testPrinter(
  stallName = 'Stall Tokens',
  eventName?: string,
  slogan?: string,
  contact?: string,
  address?: string
): Promise<void> {
  const bytes = buildTestSlip(stallName, eventName, slogan, contact, address);
  await bluetoothPrint(bytes);
}
