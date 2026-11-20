// Printer settings: Bluetooth printer pairing, Test print, and receipt branding options.
import { useState } from 'react';
import { disconnectPrinter, getSavedPrinterName, selectPrinter, testPrinter, useApp } from '../../../store';
import { Sheet } from '../../kit/Sheet';
import kit from '../../kit/kit.module.css';
import { Group, Opt } from './Opt';

function EditStringSheet({
  title,
  label,
  placeholder,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  label: string;
  placeholder: string;
  initial: string;
  onSave: (val: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(initial);

  return (
    <Sheet title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--dl-color-text-muted)' }}>{label}</p>
        <input className={kit.input} placeholder={placeholder} value={val} onChange={(e) => { setVal(e.target.value); }} />
        <button
          type="button"
          className={kit.cta}
          onClick={() => {
            onSave(val);
            onClose();
          }}
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}

function PrinterConnectRows({
  name,
  onSelect,
  onDisconnect,
  onTest,
}: {
  name: string | null;
  onSelect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}) {
  return (
    <>
      <Opt
        t="Bluetooth printer"
        sub={name ? 'Paired and ready for 58mm printing' : 'Tap to pair your Bluetooth thermal printer'}
        value={name || 'Select printer'}
        onClick={onSelect}
      />
      {name ? <Opt t="Disconnect printer" sub="Unpair this device" value="Forget" onClick={onDisconnect} /> : null}
      <Opt t="Test printer" sub="Print a test ticket with header, lines, and feed" value="Print test" onClick={onTest} />
    </>
  );
}

function PrinterFormatRows({
  autoPrint,
  paperWidth,
  onToggleAuto,
  onTogglePaper,
}: {
  autoPrint: boolean;
  paperWidth: string;
  onToggleAuto: () => void;
  onTogglePaper: () => void;
}) {
  return (
    <>
      <Opt
        t="Auto-print on kitchen send"
        sub="Immediately print a token slip when sent to kitchen"
        sw={autoPrint}
        onClick={onToggleAuto}
      />
      <Opt
        t="Paper size"
        sub="Standard mobile Bluetooth thermal printer width"
        value={paperWidth}
        onClick={onTogglePaper}
      />
    </>
  );
}

function PrinterBrandingRows({
  settings,
  onEdit,
}: {
  settings: Readonly<Record<string, string>>;
  onEdit: (key: string) => void;
}) {
  return (
    <>
      <Opt t="Welcome note" sub="Printed at top of receipt (e.g. Welcome!)" value={settings.printerWelcome || 'None'} onClick={() => { onEdit('welcome'); }} />
      <Opt t="Slogan" sub="Printed below business name (e.g. Best Eats)" value={settings.printerSlogan || 'None'} onClick={() => { onEdit('slogan'); }} />
      <Opt t="Contact number" sub="Printed on slips for customer inquiries" value={settings.printerContact || 'None'} onClick={() => { onEdit('contact'); }} />
      <Opt t="Address / Booth" sub="Stall location or street address" value={settings.printerAddress || 'None'} onClick={() => { onEdit('address'); }} />
      <Opt t="Thank you note" sub="Printed at footer (e.g. Please visit again)" value={settings.printerThankYou || 'Default'} onClick={() => { onEdit('thankyou'); }} />
    </>
  );
}

interface SheetConf { title: string; label: string; placeholder: string; initial: string; field: string; toastMsg: string }

function getSheetConf(k: string, s: Readonly<Record<string, string>>): SheetConf | null {
  switch (k) {
    case 'welcome': return { title: 'Welcome Note', label: 'Short welcome note at top', placeholder: 'e.g. Welcome! Thank you for choosing us', initial: s.printerWelcome ?? '', field: 'printerWelcome', toastMsg: 'Welcome note saved' };
    case 'slogan': return { title: 'Slogan', label: 'Brand slogan or tagline', placeholder: 'e.g. Fresh, Hot & Delicious', initial: s.printerSlogan ?? '', field: 'printerSlogan', toastMsg: 'Slogan saved' };
    case 'contact': return { title: 'Contact Number', label: 'Phone or WhatsApp number', placeholder: 'e.g. +91 98765 43210', initial: s.printerContact ?? '', field: 'printerContact', toastMsg: 'Contact saved' };
    case 'address': return { title: 'Address / Booth', label: 'Stall booth number or address', placeholder: 'e.g. Stall #14, Main Food Court', initial: s.printerAddress ?? '', field: 'printerAddress', toastMsg: 'Address saved' };
    case 'thankyou': return { title: 'Thank You Note', label: 'Closing message before tear-off', placeholder: 'e.g. Thank you for your visit!', initial: s.printerThankYou ?? '', field: 'printerThankYou', toastMsg: 'Thank you note saved' };
    default: return null;
  }
}

export function PrinterSettings() {
  const a = useApp((x) => x);
  const set = a.folded.settings;
  const [printerName, setPrinterName] = useState<string | null>(getSavedPrinterName());
  const [sheetKey, setSheetKey] = useState<string | null>(null);

  const onSelect = () => {
    void selectPrinter()
      .then((name) => { setPrinterName(name); a.money.toast(`Connected to ${name}`); })
      .catch((err: unknown) => { console.warn(err); a.money.toast('Could not connect to printer. Make sure Bluetooth is on.'); });
  };

  const onTest = () => {
    a.money.toast('Sending test print to printer…');
    void testPrinter(set.stallName || 'Stall Tokens', set.eventName, set.printerSlogan, set.printerContact, set.printerAddress)
      .then(() => { a.money.toast('Test print sent successfully!'); })
      .catch((err: unknown) => { console.warn(err); a.money.toast('Printer did not respond. Check Bluetooth connection.'); });
  };

  const paperWidth = set.printerPaper || '58 mm';
  const autoPrint = set.printerAutoPrint === '1';
  const conf = sheetKey ? getSheetConf(sheetKey, set) : null;

  return (
    <Group label="Printer (58 mm Thermal / ESC-POS)">
      <PrinterConnectRows name={printerName} onSelect={onSelect} onDisconnect={() => { disconnectPrinter(); setPrinterName(null); a.money.toast('Printer disconnected'); }} onTest={onTest} />
      <PrinterFormatRows autoPrint={autoPrint} paperWidth={paperWidth} onToggleAuto={() => { a.catalog.setSetting('printerAutoPrint', autoPrint ? '0' : '1'); }} onTogglePaper={() => { a.catalog.setSetting('printerPaper', paperWidth === '58 mm' ? '80 mm' : '58 mm'); }} />
      <PrinterBrandingRows settings={set} onEdit={setSheetKey} />
      {conf ? (
        <EditStringSheet title={conf.title} label={conf.label} placeholder={conf.placeholder} initial={conf.initial}
          onSave={(v) => { a.catalog.setSetting(conf.field, v); a.money.toast(conf.toastMsg); }} onClose={() => { setSheetKey(null); }} />
      ) : null}
    </Group>
  );
}
