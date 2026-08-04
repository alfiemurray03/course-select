function replaceFixedCatalogueCount() {
  if (!document.body) return false;

  let changed = false;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const value = node.nodeValue;
    if (!value) continue;

    const next = value
      .replace(
        /Choose from \d+ Highfield Online Training courses available through JA Group Services Ltd\./g,
        'Explore a wide range of Highfield Online Training courses available through JA Group Services Ltd.',
      )
      .replace(/\b\d+ available courses\b/g, 'Extensive course catalogue');

    if (next !== value) {
      node.nodeValue = next;
      changed = true;
    }
  }

  return changed;
}

function startCatalogueWordingFix() {
  replaceFixedCatalogueCount();

  const observer = new MutationObserver(() => {
    replaceFixedCatalogueCount();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) startCatalogueWordingFix();
else window.addEventListener('DOMContentLoaded', startCatalogueWordingFix, { once: true });
