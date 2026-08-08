export {};

const LEGACY_BASKET_PATHS = new Set([
  '/learning-library/basket',
]);

if (LEGACY_BASKET_PATHS.has(window.location.pathname)) {
  const target = new URL('/basket', window.location.origin);
  target.search = window.location.search;
  target.hash = window.location.hash;
  window.history.replaceState(null, '', `${target.pathname}${target.search}${target.hash}`);
}
