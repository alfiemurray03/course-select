import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppErrorBoundary from './AppErrorBoundary';
import RootApplication from './RootApplication';
import { BasketProvider } from './basket';
import { LearningCourseBasketProvider } from './learning-course-basket';
import { installPublicBrandScrubber } from './public-brand-scrubber';
import './legacy-route-normaliser';
import './customer-websites-menu';
import './professional-training-payment-return';
import './course-family-boundaries';
import './learning-detail-enhancements';
import './free-course-trial';
import './enrolment-details-ui';
import './own-course-catalogue-commerce';
import './lms-start-course-routing';
import './public-navigation-simplifier';
import './styles.css';
import './catalogue.css';
import './basket.css';
import './reliability.css';
import './learner-details.css';
import './basket-layout-refinement.css';
import './site-expansion.css';
import './digital-consent.css';
import './service-information.css';
import './visual-contrast-fixes.css';
import './highfield-branding.css';
import './home-footer-spacing.css';
import './home-hero-layout-fix.css';
import './mobile-responsive.css';
import './dark-select-fix.css';
import './customer-websites-menu.css';
import './course-family-boundaries.css';
import './learning-detail-enhancements.css';
import './free-course-trial.css';
import './enrolment-details-ui.css';
import './course-commerce-refresh.css';
import './learning-course-basket.css';
import './own-course-catalogue-commerce.css';
import './public-wording-fixes';
import './highfield-branding';

function enableReliableInternalNavigation() {
  document.addEventListener('click', (event: MouseEvent) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin) return;

    const sameDocument =
      destination.pathname === window.location.pathname
      && destination.search === window.location.search;

    if (sameDocument && destination.hash) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(destination.href);
  }, true);
}

enableReliableInternalNavigation();

const root = document.getElementById('app');
if (!root) throw new Error('Application root not found.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <BasketProvider>
          <LearningCourseBasketProvider>
            <RootApplication />
          </LearningCourseBasketProvider>
        </BasketProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);

installPublicBrandScrubber();