// data/ entry: builds the DataSource from the browser, or a fake one for tests and e2e.
import { createDeviceStore } from './adapters/deviceStore';
import { createFallbackOpStore } from './adapters/fallback';
import { createLocalIdb } from './adapters/localIdb';
import { createTabChannel } from './adapters/tabChannel';
import { createSheetTransport, isSheetUrl } from './adapters/sheetTransport';
import { createIdbSnapshotsStore, createMemorySnapshotsStore } from './adapters/snapshots';
import { createBrowserStorageInfo } from './adapters/storageInfo';
import { createSyncStateStore } from './adapters/syncState';
import { applyJoinFromLocation } from './join';
import type { DataSource, Transport } from './types';

export type { Beat, DataSource, DevicePrefs, OpStore, Seen, Transport, TabChannel, DeviceStore, BackupMeta, BackupFileContent, SnapshotSummary, SnapshotRecord, SnapshotsStore, StorageEstimate, StorageInfoStore } from './types';
export type { SyncStateStore, TransportSyncState } from './adapters/syncState';
export { createSyncEngine, type Presence, type SyncEngine, type SyncStatus } from './sync/engine';
export { createMemoryOpStore, createMemoryChannelHub } from './adapters/memory';
export { createFakeHub, createFakeTransport, type FakeHub } from './adapters/fakeTransport';
export { createDeviceStore } from './adapters/deviceStore';
export { createFallbackOpStore } from './adapters/fallback';
export { createSheetTransport, isSheetUrl, type SheetConfig } from './adapters/sheetTransport';
export { createSyncStateStore } from './adapters/syncState';
export { joinUrl, readJoin, isRole, type JoinLink } from './join';
export { bluetoothPrint, canBluetoothPrint, selectPrinter, getSavedPrinterName, disconnectPrinter, testPrinter } from './adapters/btPrinter';
export { dropReceipt, getReceipt, putReceipt, receiptIds } from './adapters/receipts';
export { backupFilename, createBackupData, computeOpLogHash, parseBackupJson, triggerFileDownload } from './adapters/backupFile';
export { createIdbSnapshotsStore, createMemorySnapshotsStore } from './adapters/snapshots';
export { resetAllLocalData, resetBrowserData } from './adapters/reset';
export { createBrowserStorageInfo, createMemoryStorageInfo } from './adapters/storageInfo';

function safeLocalStorage(): Storage | null {
  try { return globalThis.localStorage; } catch (e) {
    console.warn('localStorage blocked', e);
    return null;
  }
}

function safeSessionStorage(): Storage | null {
  try { return globalThis.sessionStorage; } catch { return null; } // blocked: no per-tab place, the device's place is used
}

/** The browser data source. The Sheet bridge joins when this phone has a sync URL and key (F-35); else local only. */
export function createBrowserDataSource(makeId: () => string, transports?: readonly Transport[]): DataSource {
  const idb = typeof indexedDB === 'undefined' ? null : indexedDB;
  const device = createDeviceStore(safeLocalStorage(), makeId, safeSessionStorage());
  applyJoinFromLocation(device);
  // A link opened in an already-open tab only changes the #fragment: apply it and restart the app.
  if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (applyJoinFromLocation(device)) window.location.reload(); });
  const { syncUrl, syncKey } = device.read();
  const sheet = isSheetUrl(syncUrl) ? [createSheetTransport({ url: syncUrl, key: syncKey || 'stall' })] : [];
  const snapshots = idb ? createIdbSnapshotsStore(idb) : createMemorySnapshotsStore();
  const syncState = createSyncStateStore(safeLocalStorage());
  return { ops: createFallbackOpStore(idb ? createLocalIdb(idb) : null), device, channel: createTabChannel(), transports: transports ?? sheet, snapshots, storageInfo: createBrowserStorageInfo(), syncState };
}
