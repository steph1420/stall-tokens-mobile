// F-34 / F-69 Settings screen (Q-HARM-5, LFPS S1): regrouped into General, Display, Menu,
// Kitchen, Money, Sync, Extras, Data, Account, Passcode, Developer, and About.
import { useState } from 'react';
import { formatInr } from '../../contract';
import type { Extra } from '../../store';
import { amounts, extraOn, istClock, isSheetUrl, useApp } from '../../store';
import { AmountsEdit } from '../kit/AmountsEdit';
import { Sheet } from '../kit/Sheet';
import kit from '../kit/kit.module.css';
import { ReviewSheet } from './ReviewSheet';
import { StallPage } from './StallPage';
import s from './Stall.module.css';
import { Group, Opt, nextOpt } from './settings/Opt';
import { GeneralSettings } from './settings/GeneralSettings';
import { DisplaySettings } from './settings/DisplaySettings';
import { PrinterSettings } from './settings/PrinterSettings';
import { CategoriesRow } from './settings/CategoriesSettings';
import { StationsRow } from './settings/StationsSettings';
import { DataSettings } from './settings/DataSettings';
import { AboutSettings } from './settings/AboutSettings';

const LOOKS = { full: 'Full card', items: 'Item cards', ticket: 'Ticket' } as const;

/** F-35 Sync: direct Google Sheet bridge URL. Saving restarts the app to connect. */
function SyncSheet({ onClose }: { onClose: () => void }) {
  const a = useApp((x) => x);
  const [url, setUrl] = useState(a.prefs.syncUrl);
  const [key, setKey] = useState(a.prefs.syncKey);
  const bad = url.trim() !== '' && !isSheetUrl(url);
  const save = () => { a.setPrefs({ syncUrl: url.trim(), syncKey: key.trim() || 'stall' }); window.location.reload(); };

  return (
    <Sheet title="Sync with Google Sheet" onClose={onClose}>
      <div className={s.syncForm}>
        <p className={s.syncHint}>Paste your Google Apps Script web-app link (ends in /exec). No pairing or complex keys needed.</p>
        <input className={kit.input} aria-label="Web-app link" placeholder="https://script.google.com/macros/s/…/exec" autoCapitalize="off" autoCorrect="off" value={url} onChange={(e) => { setUrl(e.target.value); }} />
        <input className={kit.input} aria-label="Stall key (optional)" placeholder="Stall key (optional, default: stall)" autoCapitalize="off" autoCorrect="off" value={key} onChange={(e) => { setKey(e.target.value); }} />
        {bad ? <p className={s.warn}>That link does not look right · it should start with https://</p> : null}
        <button type="button" className={kit.cta} disabled={bad} onClick={save}>Save and connect</button>
      </div>
    </Sheet>
  );
}

function SyncRow() {
  const p = useApp((x) => x.prefs);
  const sync = useApp((x) => x.sync);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const clashes = useApp((x) => x.folded.conflicts.length);
  const state = !p.syncUrl ? 'Not set up' : sync.error ? 'Not reaching the Sheet' : sync.lastOkAt ? `Synced ${istClock(sync.lastOkAt)}` : 'Connecting…';

  return (
    <>
      <Opt t="Sheet sync" sub={sync.pending ? `${String(sync.pending)} waiting to sync` : 'Phones share orders and money through the Sheet'} value={state} onClick={() => { setOpen(true); }} />
      <Opt t="Review" sub="Clashes between phones or Sheet edits, resolved by the sync rules" value={String(clashes)} onClick={() => { setReview(true); }} />
      {open ? <SyncSheet onClose={() => { setOpen(false); }} /> : null}
      {review ? <ReviewSheet onClose={() => { setReview(false); }} /> : null}
    </>
  );
}

/** F-45 shared tip choices / round-off steps, edited inline. */
function AmountsOpt({ k, t, sep }: { k: amounts.AmountsKey; t: string; sep: string }) {
  const v = useApp((x) => amounts.amounts(x.folded.settings, k));
  const [edit, setEdit] = useState(false);
  return edit ? <AmountsEdit k={k} onDone={() => { setEdit(false); }} />
    : <Opt t={t} sub="Shared with every phone" value={v.map((x) => formatInr(x)).join(sep) || 'None'} onClick={() => { setEdit(true); }} />;
}

/** FEATURES §0.2 top-4 gaps (F-64 search, F-66 Close the day): shared switches, on by default. */
function Extras() {
  const set = useApp((x) => x.folded.settings);
  const c = useApp((x) => x.close);
  const on = (k: Extra) => extraOn(set, k);
  return (
    <Group label="Extras · every phone">
      <Opt t="Close the day" sub="A checklist and summary at the end of the day, in the Stall list" sw={on('closeDay')} onClick={() => { c.setExtra('closeDay', !on('closeDay')); }} />
      <Opt t="History search" sub="Find an order by token, name or item" sw={on('historySearch')} onClick={() => { c.setExtra('historySearch', !on('historySearch')); }} />
    </Group>
  );
}

function KitchenSettingsGroup() {
  const a = useApp((x) => x);
  const p = a.prefs;
  const d = p.nextOrderDelaySec;
  return (
    <Group label="Kitchen">
      <Opt t="Auto-prep next order" sub="Station starts the next order's items" sw={p.autoPrep} onClick={() => { a.setPrefs({ autoPrep: !p.autoPrep }); }} />
      <Opt
        t="Next order switch delay"
        sub={d === 0 ? 'Immediate auto-prep (0s)' : `${String(d)}s gap after pressing Ready`}
        value={`${String(d)}s`}
        onClick={() => { a.setPrefs({ nextOrderDelaySec: (d + 1) % 11 }); }}
      />
      <Opt t="Station look" value={LOOKS[p.stationLook]} onClick={() => { a.setPrefs({ stationLook: nextOpt(['full', 'items', 'ticket'] as const, p.stationLook) }); }} />
    </Group>
  );
}

function MoneySettingsGroup() {
  const a = useApp((x) => x);
  const partners = useApp((x) => Object.values(x.folded.people).filter((y) => y.isPartner));
  return (
    <Group label="Money">
      <Opt t="Partner shares" sub={partners.map((x) => `${x.name} ${String(x.sharePct)}`).join(' · ') || 'No partners yet'} value="" onClick={() => { a.openStall('settle'); a.unlock(); }} />
      <AmountsOpt k="tipChips" t="Tip choices" sep=" · " />
      <AmountsOpt k="roundOffSteps" t="Round-off to nearest" sep=" / " />
    </Group>
  );
}

export function SettingsScreen() {
  const a = useApp((x) => x);
  const p = a.prefs;
  const [devUnlocked, setDevUnlocked] = useState(!p.passcodeOff);
  const clashes = useApp((x) => x.folded.conflicts.length);
  const [review, setReview] = useState(false);

  return (
    <StallPage title="Settings">
      <GeneralSettings />
      <PrinterSettings />
      <DisplaySettings />
      <Group label="Menu"><CategoriesRow /><StationsRow /></Group>
      <KitchenSettingsGroup />
      <MoneySettingsGroup />
      <Group label="Sync"><SyncRow /></Group>
      <Extras />
      <DataSettings />
      <Group label="Account">
        <Opt t="Sign-in links" sub="One-tap links per person / role: sets up sync and opens their screen" value="" onClick={() => { a.openStall('developer'); a.unlock(); }} />
      </Group>
      <Group label="Passcode">
        <Opt t="Change passcode" sub="Asks for a new 4-digit code next time" value="" onClick={() => { a.setPrefs({ passcode: '' }); a.money.toast('Passcode cleared · set a new one next time'); }} />
      </Group>
      {devUnlocked || !p.passcodeOff ? (
        <Group label="Developer">
          <Opt t="Passcode lock" sub="Off (default) = Money, Settle up and Settings open without a code on this phone" sw={!p.passcodeOff} onClick={() => { a.setPrefs({ passcodeOff: !p.passcodeOff }); }} />
          <Opt t="Review conflicts" sub="Rule clash logs and resolutions" value={String(clashes)} onClick={() => { setReview(true); }} />
        </Group>
      ) : null}
      <AboutSettings onUnlockDev={() => { setDevUnlocked(true); }} />
      {review ? <ReviewSheet onClose={() => { setReview(false); }} /> : null}
    </StallPage>
  );
}
