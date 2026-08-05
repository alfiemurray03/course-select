import {
  Accessibility,
  Contrast,
  Link2,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Type,
  X,
  ZapOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './accessibility-tools.css';

type AccessibilityState = {
  fontSizeLevel: number;
  highContrast: boolean;
  reduceMotion: boolean;
  easyReadFont: boolean;
  underlineLinks: boolean;
  grayscale: boolean;
};

const STORAGE_KEY = 'ja_a11y_state';

const DEFAULT_STATE: AccessibilityState = {
  fontSizeLevel: 0,
  highContrast: false,
  reduceMotion: false,
  easyReadFont: false,
  underlineLinks: false,
  grayscale: false,
};

function loadState(): AccessibilityState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_STATE, ...JSON.parse(stored) as Partial<AccessibilityState> } : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function applyState(state: AccessibilityState) {
  const root = document.documentElement;
  root.style.fontSize = state.fontSizeLevel === 0 ? '' : `${100 + state.fontSizeLevel * 10}%`;

  const attributes: Array<[string, boolean, string]> = [
    ['data-a11y-contrast', state.highContrast, 'high'],
    ['data-a11y-motion', state.reduceMotion, 'reduce'],
    ['data-a11y-font', state.easyReadFont, 'easy-read'],
    ['data-a11y-links', state.underlineLinks, 'underline'],
    ['data-a11y-grayscale', state.grayscale, 'true'],
  ];

  attributes.forEach(([name, enabled, value]) => {
    if (enabled) root.setAttribute(name, value);
    else root.removeAttribute(name);
  });
}

function SkipNavigation() {
  useEffect(() => {
    const updateMain = () => {
      const main = document.querySelector('main');
      if (main && !main.id) main.id = 'main-content';
    };

    updateMain();
    const observer = new MutationObserver(updateMain);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <a href="#main-content" className="skip-nav">Skip to main content</a>;
}

function AccessibilityBubble() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AccessibilityState>(() => loadState());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyState(state);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Browser storage may be unavailable. */ }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (panelRef.current && event.target instanceof Node && !panelRef.current.parentElement?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  const update = useCallback((patch: Partial<AccessibilityState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => setState({ ...DEFAULT_STATE }), []);
  const hasActiveSetting = state.fontSizeLevel !== 0
    || state.highContrast
    || state.reduceMotion
    || state.easyReadFont
    || state.underlineLinks
    || state.grayscale;

  const toggles = [
    { key: 'highContrast' as const, icon: Contrast, label: 'High contrast' },
    { key: 'reduceMotion' as const, icon: ZapOff, label: 'Reduce motion' },
    { key: 'easyReadFont' as const, icon: Type, label: 'Easy-read font' },
    { key: 'underlineLinks' as const, icon: Link2, label: 'Underline all links' },
    { key: 'grayscale' as const, icon: Palette, label: 'Grayscale mode' },
  ];

  return <div className="aptenvo-a11y-widget">
    {open && <div className="aptenvo-a11y-panel" role="dialog" aria-labelledby="a11y-panel-title" ref={panelRef}>
      <div className="aptenvo-a11y-header">
        <div><Accessibility size={19} /><strong id="a11y-panel-title">Accessibility tools</strong></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close accessibility tools"><X size={18} /></button>
      </div>

      <div className="aptenvo-a11y-content">
        <div className="aptenvo-a11y-text-size">
          <div><Type size={18} /><span>Text size</span></div>
          <div className="aptenvo-a11y-size-controls">
            <button type="button" onClick={() => update({ fontSizeLevel: Math.max(-2, state.fontSizeLevel - 1) })} disabled={state.fontSizeLevel <= -2} aria-label="Decrease text size"><Minus size={15} /></button>
            <span aria-live="polite">{state.fontSizeLevel === 0 ? 'Default' : `${state.fontSizeLevel > 0 ? '+' : ''}${state.fontSizeLevel * 10}%`}</span>
            <button type="button" onClick={() => update({ fontSizeLevel: Math.min(4, state.fontSizeLevel + 1) })} disabled={state.fontSizeLevel >= 4} aria-label="Increase text size"><Plus size={15} /></button>
          </div>
        </div>

        <div className="aptenvo-a11y-toggle-list">
          {toggles.map(({ key, icon: Icon, label }) => {
            const active = state[key];
            return <button type="button" key={key} className={active ? 'active' : ''} onClick={() => update({ [key]: !active })} aria-pressed={active}>
              <span><Icon size={18} />{label}</span>
              <i aria-hidden="true"><b /></i>
            </button>;
          })}
        </div>

        <p className="aptenvo-a11y-note">These controls change Sousa Murray eLearning’s presentation in this browser. They do not change the separate Highfield Learning Management System.</p>

        {hasActiveSetting && <button type="button" className="aptenvo-a11y-reset" onClick={reset}><RotateCcw size={16} /> Reset all tools</button>}
        <a className="aptenvo-a11y-policy-link" href="/accessibility">Read the Accessibility Policy</a>
      </div>
    </div>}

    <button
      type="button"
      className={`aptenvo-a11y-trigger${open ? ' open' : ''}${hasActiveSetting ? ' has-active-setting' : ''}`}
      onClick={() => setOpen((current) => !current)}
      aria-label="Open accessibility tools"
      aria-expanded={open}
    >
      <Accessibility size={23} />
      {hasActiveSetting && <span aria-hidden="true" />}
    </button>
  </div>;
}

export default function AccessibilityTools() {
  return <><SkipNavigation /><AccessibilityBubble /></>;
}
