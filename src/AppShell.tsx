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
import AccessibilityTools from './AccessibilityTools';
import AgeGate from './AgeGate';
import AptenvoHomePage from './AptenvoHomePage';
import { useBasket } from './basket';
import ContactPage from './ContactPage';
import DigitalSupplyConsent from './DigitalSupplyConsent';
import { EnhancedAboutPage, HelpCentrePage } from './EnhancedPages';
import {
  AcceptableUsePolicyPage,
  PrivacyPolicyPage,
  RefundsPolicyPage,
  TermsOfUsePage,
} from './LegalPolicies';
import {
  DetailedDeliveryPage,
  DetailedIndividualsPage,
  DetailedOrganisationsPage,
} from './ServiceInformationPages';
import { AccessibilityPolicyPage, ComplaintsPolicyPage, SiteMapPage } from './TrustPages';

type ThemeMode = 'light' | 'dark' | 'system';

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
        <NavLink to="/courses">Courses</NavLink>
        <NavLink to="/individuals">Individuals</NavLink>
        <NavLink to="/organisations">Organisations</NavLink>
        <NavLink to="/how-courses-are-delivered">Delivery</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/support">Help</NavLink>
        <NavLink to="/contact">Contact</NavLink>
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
      <Link to="/">Home</Link><Link to="/courses">Course catalogue</Link><Link to="/individuals">For individuals</Link><Link to="/organisations">For organisations</Link><Link to="/how-courses-are-delivered">How courses are delivered</Link><Link to="/about">About Aptenvo</Link><Link to="/support">Help Centre</Link><Link to="/contact">Contact Aptenvo</Link>
    </nav>}
  </header>;
}

function EnhancedFooter() {
  return <>
    <footer className="footer"><div className="footer-grid">
      <div className="footer-brand"><span style={{ ...wordmarkStyle, color: '#4f7cff', fontSize: '2.15rem' }}>Aptenvo</span><p>Adult online training sold and supported by JA Group Services Ltd through Aptenvo.</p></div>
      <div><h3>Explore</h3><Link to="/courses">Course catalogue</Link><Link to="/individuals">For individuals</Link><Link to="/organisations">For organisations</Link><Link to="/account">My Aptenvo</Link><Link to="/sitemap">Site map</Link></div>
      <div><h3>Help</h3><Link to="/support">Help Centre</Link><Link to="/contact">Contact Aptenvo</Link><Link to="/accessibility">Accessibility</Link><Link to="/complaints">Complaints</Link><Link to="/how-courses-are-delivered">How course access works</Link></div>
      <div><h3>Legal</h3><Link to="/terms">Terms of Use</Link><Link to="/privacy">Privacy Policy</Link><Link to="/refunds">Refunds Policy</Link><Link to="/acceptable-use">Acceptable Use Policy</Link><Link to="/cookies">Cookie notice</Link></div>
    </div></footer>
    <div className="corporate-disclosure"><div><strong>Aptenvo is a trading division of JA Group Services Ltd.</strong><span>Registered in England and Wales. Company number 16314179. ICO registration ZB877370. Customers and learners must be aged 18 or over.</span></div><span>© {new Date().getFullYear()} JA Group Services Ltd.</span></div>
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
      ['Terms and conditions', 'Terms of Use'],
      ['Privacy notice', 'Privacy Policy'],
      ['Refund policy', 'Refunds Policy'],
    ]);

    const appendLink = (column: HTMLElement, href: string, text: string) => {
      if (column.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      column.append(link);
    };

    const update = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const value = node.nodeValue?.trim();
        if (value && replacements.has(value)) node.nodeValue = node.nodeValue?.replace(value, replacements.get(value) ?? value) ?? null;
      }

      document.querySelectorAll<HTMLAnchorElement>('a[href="/business"]').forEach((anchor) => anchor.setAttribute('href', '/organisations'));
      document.querySelectorAll<HTMLAnchorElement>('a[href="/providers"]').forEach((anchor) => anchor.setAttribute('href', '/how-courses-are-delivered'));

      const originalDesktopNavigation = document.querySelector<HTMLElement>('.desktop-nav');
      if (originalDesktopNavigation && !originalDesktopNavigation.querySelector('a[href="/contact"]')) {
        const contact = document.createElement('a');
        contact.href = '/contact';
        contact.textContent = 'Contact';
        originalDesktopNavigation.append(contact);
      }

      const originalMobileNavigation = document.querySelector<HTMLElement>('.mobile-nav');
      if (originalMobileNavigation && !originalMobileNavigation.querySelector('a[href="/contact"]')) {
        const contact = document.createElement('a');
        contact.href = '/contact';
        contact.textContent = 'Contact Aptenvo';
        originalMobileNavigation.append(contact);
      }

      const supportColumn = document.querySelector<HTMLElement>('.footer-grid > div:nth-child(3)');
      if (supportColumn) {
        appendLink(supportColumn, '/contact', 'Contact Aptenvo');
        appendLink(supportColumn, '/accessibility', 'Accessibility');
        appendLink(supportColumn, '/complaints', 'Complaints');
      }

      const legalColumn = document.querySelector<HTMLElement>('.footer-grid > div:nth-child(4)');
      if (legalColumn) appendLink(legalColumn, '/acceptable-use', 'Acceptable Use Policy');

      const exploreColumn = document.querySelector<HTMLElement>('.footer-grid > div:nth-child(2)');
      if (exploreColumn) appendLink(exploreColumn, '/sitemap', 'Site map');
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

export default function AppShell() {
  const location = useLocation();
  let enhancedPage: ReactNode = null;
  if (location.pathname === '/') enhancedPage = <AptenvoHomePage />;
  else if (location.pathname === '/about') enhancedPage = <EnhancedAboutPage />;
  else if (location.pathname === '/support' || location.pathname === '/help-centre') enhancedPage = <HelpCentrePage />;
  else if (location.pathname === '/account') enhancedPage = <AccountDashboard />;
  else if (location.pathname === '/individuals') enhancedPage = <DetailedIndividualsPage />;
  else if (location.pathname === '/organisations' || location.pathname === '/business') enhancedPage = <DetailedOrganisationsPage />;
  else if (location.pathname === '/how-courses-are-delivered' || location.pathname === '/providers') enhancedPage = <DetailedDeliveryPage />;
  else if (location.pathname === '/contact') enhancedPage = <ContactPage />;
  else if (location.pathname === '/terms' || location.pathname === '/terms-of-use') enhancedPage = <TermsOfUsePage />;
  else if (location.pathname === '/privacy' || location.pathname === '/privacy-policy') enhancedPage = <PrivacyPolicyPage />;
  else if (location.pathname === '/refunds' || location.pathname === '/refund-policy') enhancedPage = <RefundsPolicyPage />;
  else if (location.pathname === '/acceptable-use' || location.pathname === '/acceptable-use-policy' || location.pathname === '/aup') enhancedPage = <AcceptableUsePolicyPage />;
  else if (location.pathname === '/accessibility' || location.pathname === '/accessibility-policy') enhancedPage = <AccessibilityPolicyPage />;
  else if (location.pathname === '/complaints' || location.pathname === '/complaints-policy') enhancedPage = <ComplaintsPolicyPage />;
  else if (location.pathname === '/sitemap' || location.pathname === '/site-map') enhancedPage = <SiteMapPage />;

  return <>
    <AgeGate />
    <WordingEnhancer />
    <DigitalSupplyConsent />
    <AccessibilityTools />
    {enhancedPage ? <EnhancedLayout>{enhancedPage}</EnhancedLayout> : <App />}
  </>;
}
