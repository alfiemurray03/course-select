import {
  CircleUserRound,
  Menu,
  Moon,
  ShoppingBasket,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useBasket } from './basket';
import { useLearningCourseBasket } from './learning-course-basket';
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
  if (route === '/about') return pathname === '/about';
  if (route === '/professional-training') {
    return pathname === '/professional-training' || pathname.startsWith('/courses');
  }
  if (route === '/learning-library/courses') {
    return pathname.startsWith('/learning-library');
  }
  if (route === '/plans') return pathname === '/plans' || pathname === '/pricing';
  return false;
}

export default function PublicSiteHeader() {
  const [open, setOpen] = useState(false);
  const { itemCount: highfieldCourseCount } = useBasket();
  const { itemCount: ownCourseCount } = useLearningCourseBasket();
  const basketCount = highfieldCourseCount + ownCourseCount;
  const { mode, setMode } = usePublicTheme();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const rotateTheme = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system');

  return <header className="site-header" data-public-header="sousa-murray-elearning">
    <div className="header-inner">
      <Link to="/" className="brand" aria-label="Sousa Murray eLearning home">
        <span style={wordmarkStyle}>Sousa Murray eLearning</span>
      </Link>

      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/" className={routeIsActive(location.pathname, '/') ? 'active' : undefined}>Home</NavLink>
        <NavLink to="/about" className={routeIsActive(location.pathname, '/about') ? 'active' : undefined}>About us</NavLink>
        <NavLink to="/professional-training" className={routeIsActive(location.pathname, '/professional-training') ? 'active' : undefined}>Highfield Online Training</NavLink>
        <NavLink to="/learning-library/courses" className={routeIsActive(location.pathname, '/learning-library/courses') ? 'active' : undefined}>Sousa Murray eLearning courses</NavLink>
        <NavLink to="/plans" className={routeIsActive(location.pathname, '/plans') ? 'active' : undefined}>Plans</NavLink>
      </nav>

      <div className="header-actions">
        <Link
          className="basket-header-button"
          to="/basket"
          aria-label={`Basket with ${basketCount} selected ${basketCount === 1 ? 'course' : 'courses'}`}
          title="Basket"
        >
          <ShoppingBasket size={19} />
          <span className="basket-header-label">Basket</span>
          {basketCount > 0 && <span className="basket-count-badge">{basketCount}</span>}
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
      <Link className="mobile-basket-link" to="/basket"><ShoppingBasket size={19} /> Basket {basketCount > 0 && `(${basketCount})`}</Link>
      <Link to="/">Home</Link>
      <Link to="/about">About us</Link>
      <Link to="/professional-training">Highfield Online Training</Link>
      <Link to="/learning-library/courses">Sousa Murray eLearning courses</Link>
      <Link to="/plans">Plans</Link>
    </nav>}
  </header>;
}