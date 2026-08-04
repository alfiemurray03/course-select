import {
  CircleUserRound,
  Menu,
  Moon,
  ShoppingBasket,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import './course-enrichment';
import App from './App';
import AccountDashboard from './AccountDashboard';
import AgeGate from './AgeGate';
import { useBasket } from './basket';
import DigitalSupplyConsent from './DigitalSupplyConsent';
import { EnhancedAboutPage, HelpCentrePage, RefundPolicyPage } from './EnhancedPages';

type ThemeMode = 'light' | 'dark' | 'system';

type StoredProfile = {
  customerType?: 'individual' | 'business';
  legalFirstName?: string;
  legalLastName?: string;
  email?: string;
  organisationName?: string;
};

type StoredLearner = {
  legalFirstName?: string;
  legalLastName?: string;
  enrolmentEmail?: string;
};

const wordmarkStyle = {
  color: '#2563eb',
  fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
  fontSize: '2rem',
  fontWeight: 800,
  letterSpacing: '-0.065em',
  lineHeight: 1,
  whiteSpace: 'nowrap' as const,
};

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const value = localStorage.getItem('aptenvo-theme');
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    localStorage.setItem('aptenvo-theme', mode);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return { mode, setMode };
}

function EnhancedHeader() {
  const [open, setOpen] = useState(false);
  const { itemCount, licenceCount } = useBasket();
  const { mode, setMode } = useTheme();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  const rotateTheme = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system');

  return <header className="site-header">
    <div className="header-inner">
      <Link to="/" className="brand" aria-label="Aptenvo home"><span style={wordmarkStyle}>Aptenvo</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/courses">Browse courses</NavLink>
        <NavLink to="/individuals">Individuals</NavLink>
        <NavLink to="/business">Organisations</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/support">Help Centre</NavLink>
      </nav>
      <div className="header-actions">
        <Link className="basket-header-button" to="/basket" aria-label={`Basket with ${itemCount} courses and ${licenceCount} licences`}>
          <ShoppingBasket size={19} /><span className="basket-header-label">Basket</span>
          {itemCount > 0 && <span className="basket-count-badge">{itemCount}</span>}
        </Link>
        <Link className="account-button desktop-account" to="/account"><CircleUserRound size={18} /> My Aptenvo</Link>
        <button className="icon-button theme-button" type="button" onClick={rotateTheme} aria-label={`Theme: ${mode}`}>
          {mode === 'dark' ? <Moon size={19} /> : mode === 'light' ? <Sun size={19} /> : <Sparkles size={19} />}
        </button>
        <button className="icon-button mobile-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </div>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation">
      <Link className="mobile-account" to="/account"><CircleUserRound size={19} /> My Aptenvo</Link>
      <Link className="mobile-basket-link" to="/basket"><ShoppingBasket size={19} /> Basket {itemCount > 0 && `(${itemCount})`}</Link>
      <Link to="/">Home</Link><Link to="/courses">Browse courses</Link><Link to="/individuals">For individuals</Link><Link to="/business">For organisations</Link><Link to="/about">About Aptenvo</Link><Link to="/support">Help Centre</Link>
    </nav>}
  </header>;
}

function EnhancedFooter() {
  return <>
    <footer className="footer"><div className="footer-grid">
      <div className="footer-brand"><span style={{ ...wordmarkStyle, color: '#4f7cff', fontSize: '2.15rem' }}>Aptenvo</span><p>Adult online training sold and supported by JA Group Services Ltd through Aptenvo.</p></div>
      <div><h3>Explore</h3><Link to="/courses">Course catalogue</Link><Link to="/basket">Your basket</Link><Link to="/business">For organisations</Link><Link to="/account">My Aptenvo</Link></div>
      <div><h3>Help</h3><Link to="/support">Help Centre</Link><Link to="/support?topic=large-order">Orders of 26+ licences</Link><Link to="/providers">How course access works</Link><Link to="/complaints">Complaints</Link></div>
      <div><h3>Legal</h3><Link to="/terms">Terms and conditions</Link><Link to="/privacy">Privacy notice</Link><Link to="/cookies">Cookie notice</Link><Link to="/refunds">Refund policy</Link></div>
    </div></footer>
    <div className="corporate-disclosure"><div><strong>Aptenvo is a trading division of JA Group Services Ltd.</strong><span>Registered in England and Wales. Company number 16314179. ICO registration ZB877370. Customers must be aged 18 or over.</span></div><span>© {new Date().getFullYear()} JA Group Services Ltd.</span></div>
  </>;
}

function EnhancedLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [location.pathname]);
  return <><EnhancedHeader />{children}<EnhancedFooter /></>;
}

function WordingEnhancer() {
  useEffect(() => {
    const replacements = new Map([
      ['Browse all 101 courses', 'Explore the course catalogue'],
      ['101 catalogue items', '101 available courses'],
    ]);
    const update = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const value = node.nodeValue?.trim();
        if (value && replacements.has(value)) node.nodeValue = node.nodeValue?.replace(value, replacements.get(value) ?? value) ?? null;
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

function parseStored<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function setInputValue(input: HTMLInputElement, value: string) {
  if (!value || input.value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function SavedDetailPrefill() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/basket') return;
    const profile = parseStored<StoredProfile>('aptenvo-account-profile');
    const learners = parseStored<StoredLearner[]>('aptenvo-account-learners') ?? [];
    if (!profile && !learners.length) return;

    const apply = () => {
      if (profile) {
        const typeInput = document.querySelector<HTMLInputElement>(`input[name="customer-type"][value="${profile.customerType ?? 'individual'}"]`);
        if (typeInput && !document.querySelector<HTMLInputElement>('input[name="customer-type"]:checked')) typeInput.click();
        const firstName = document.querySelector<HTMLInputElement>('input[autocomplete="given-name"]');
        const lastName = document.querySelector<HTMLInputElement>('input[autocomplete="family-name"]');
        const email = document.querySelector<HTMLInputElement>('input[autocomplete="email"]');
        const organisation = document.querySelector<HTMLInputElement>('input[autocomplete="organization"]');
        if (firstName) setInputValue(firstName, profile.legalFirstName ?? '');
        if (lastName) setInputValue(lastName, profile.legalLastName ?? '');
        if (email) setInputValue(email, profile.email ?? '');
        if (organisation) setInputValue(organisation, profile.organisationName ?? '');
      }

      const rows = [...document.querySelectorAll<HTMLElement>('.learner-entry-row')];
      const available = profile?.customerType === 'individual' && profile.legalFirstName && profile.legalLastName && profile.email
        ? [{ legalFirstName: profile.legalFirstName, legalLastName: profile.legalLastName, enrolmentEmail: profile.email }, ...learners]
        : learners;
      rows.forEach((row, index) => {
        const learner = available[index];
        if (!learner) return;
        const inputs = row.querySelectorAll<HTMLInputElement>('input');
        if (inputs[0]) setInputValue(inputs[0], learner.legalFirstName ?? '');
        if (inputs[1]) setInputValue(inputs[1], learner.legalLastName ?? '');
        if (inputs[2]) setInputValue(inputs[2], learner.enrolmentEmail ?? '');
      });
    };

    const timer = window.setTimeout(apply, 100);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, [location.pathname]);

  return null;
}

export default function AppShell() {
  const location = useLocation();
  let enhancedPage: ReactNode = null;
  if (location.pathname === '/about') enhancedPage = <EnhancedAboutPage />;
  else if (location.pathname === '/support' || location.pathname === '/help-centre') enhancedPage = <HelpCentrePage />;
  else if (location.pathname === '/account') enhancedPage = <AccountDashboard />;
  else if (location.pathname === '/refunds') enhancedPage = <RefundPolicyPage />;

  return <>
    <AgeGate />
    <WordingEnhancer />
    <SavedDetailPrefill />
    <DigitalSupplyConsent />
    {enhancedPage ? <EnhancedLayout>{enhancedPage}</EnhancedLayout> : <App />}
  </>;
}
