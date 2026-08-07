import {
  ChevronDown,
  CircleUserRound,
  Menu,
  Moon,
  ShoppingBasket,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useBasket } from './basket';
import './public-site-header.css';

type ThemeMode = 'light' | 'dark' | 'system';

const wordmarkStyle = {
  color: '#2563eb',
  fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
  fontSize: '1.42rem',
  fontWeight: 800,
  letterSpacing: '-0.035em',
  lineHeight: 1,
  whiteSpace: 'nowrap' as const,
};

function usePublicTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const current = localStorage.getItem('sousa-murray-elearning-theme');
    if (current === 'light' || current === 'dark' || current === 'system') return current;

    const legacy = localStorage.getItem('aptenvo-theme');
    return legacy === 'light' || legacy === 'dark' || legacy === 'system' ? legacy : 'system';
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };

    apply();
    localStorage.setItem('sousa-murray-elearning-theme', mode);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return { mode, setMode };
}

function routeIsActive(pathname: string, route: string) {
  if (route === '/') return pathname === '/';
  if (route === '/learning-library') return pathname.startsWith('/learning-library') || pathname.startsWith('/lms');
  if (route === '/professional-training') return pathname === '/professional-training' || pathname.startsWith('/courses');
  if (route === '/plans') return pathname === '/plans' || pathname === '/pricing';
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function PublicSiteHeader() {
  const [open, setOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const coursesMenuRef = useRef<HTMLDivElement>(null);
  const { itemCount, licenceCount } = useBasket();
  const { mode, setMode } = usePublicTheme();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setCoursesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || coursesMenuRef.current?.contains(target)) return;
      setCoursesOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const rotateTheme = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system');
  const coursesActive = routeIsActive(location.pathname, '/learning-library') || routeIsActive(location.pathname, '/professional-training');

  return <header className="site-header">
    <div className="header-inner">
      <Link to="/" className="brand" aria-label="Sousa Murray eLearning home">
        <span style={wordmarkStyle}>Sousa Murray eLearning</span>
      </Link>

      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/" className={location.pathname === '/' ? 'active' : undefined}>Home</NavLink>

        <div className="nav-dropdown" ref={coursesMenuRef}>
          <button
            type="button"
            className={coursesActive ? 'active' : undefined}
            aria-haspopup="menu"
            aria-expanded={coursesOpen}
            onClick={() => setCoursesOpen((value) => !value)}
          >
            Courses <ChevronDown size={15} />
          </button>
          {coursesOpen && <div className="dropdown-panel" role="menu">
            <Link to="/learning-library" role="menuitem">
              <strong>Learning Library</strong>
              <span>Unlimited included Sousa Murray courses through a monthly plan.</span>
            </Link>
            <Link to="/professional-training" role="menuitem">
              <strong>Professional Training</strong>
              <span>Individually purchased Highfield Online Training courses.</span>
            </Link>
          </div>}
        </div>

        <NavLink to="/plans" className={routeIsActive(location.pathname, '/plans') ? 'active' : undefined}>Plans</NavLink>
        <NavLink to="/organisations">Organisations</NavLink>
        <NavLink to="/how-courses-are-delivered">Delivery</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/support">Help</NavLink>
        <NavLink to="/contact">Contact</NavLink>
      </nav>

      <div className="header-actions">
        <Link
          className="basket-header-button"
          to="/basket"
          aria-label={`Basket with ${itemCount} courses and ${licenceCount} licences`}
        >
          <ShoppingBasket size={19} />
          <span className="basket-header-label">Basket</span>
          {itemCount > 0 && <span className="basket-count-badge">{itemCount}</span>}
        </Link>

        <Link className="account-button desktop-account" to="/lms/dashboard">
          <CircleUserRound size={18} /> My Sousa Murray eLearning
        </Link>

        <button
          className="icon-button theme-button"
          type="button"
          onClick={rotateTheme}
          aria-label={`Theme: ${mode}`}
          title={`Theme: ${mode}`}
        >
          {mode === 'dark' ? <Moon size={19} /> : mode === 'light' ? <Sun size={19} /> : <Sparkles size={19} />}
        </button>

        <button
          className="icon-button mobile-menu-button"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </div>

    {open && <nav className="mobile-nav" aria-label="Mobile navigation">
      <Link className="mobile-account" to="/lms/dashboard"><CircleUserRound size={19} /> My Sousa Murray eLearning</Link>
      <Link className="mobile-basket-link" to="/basket"><ShoppingBasket size={19} /> Basket {itemCount > 0 && `(${itemCount})`}</Link>
      <Link to="/">Home</Link>
      <Link to="/learning-library">Learning Library</Link>
      <Link to="/learning-library/courses">Learning Library courses</Link>
      <Link to="/professional-training">Professional Training</Link>
      <Link to="/courses">Professional course catalogue</Link>
      <Link to="/plans">Plans</Link>
      <Link to="/organisations">Organisations</Link>
      <Link to="/how-courses-are-delivered">Delivery</Link>
      <Link to="/about">About Sousa Murray eLearning</Link>
      <Link to="/support">Help Centre</Link>
      <Link to="/contact">Contact</Link>
    </nav>}
  </header>;
}
