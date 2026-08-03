import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AppErrorBoundary from './AppErrorBoundary';
import { BasketProvider } from './basket';
import './styles.css';
import './catalogue.css';
import './basket.css';
import './reliability.css';

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

    const anchor = target.closest('a[href]');
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
          <App />
        </BasketProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);
