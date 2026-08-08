export {};

const REPLACEMENTS = new Map<string, string>([
  ['Sousa Murray course basket', 'Sousa Murray eLearning basket'],
  ['Purchase individual Sousa Murray courses.', 'Review your Sousa Murray eLearning basket.'],
  ['Your Sousa Murray course basket is empty', 'Your Sousa Murray eLearning basket is empty'],
  ['Add courses from the Sousa Murray eLearning catalogue. Learning Library plans are purchased separately and are never added to this basket.', 'Add individual courses from the Sousa Murray eLearning or Highfield Online Training catalogues. Learning Library plans are purchased separately and are never basket items.'],
  ['Learning Library plans are not placed in this basket. Highfield Online Training continues to use the separate Highfield Basket.', 'Learning Library plans are purchased separately. Individual Sousa Murray and Highfield courses use this one website basket.'],
]);

function applySharedBasketWording() {
  if (window.location.pathname !== '/basket') return;
  const root = document.querySelector('.sml-course-basket-page');
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue ?? '';
    const trimmed = raw.trim();
    const replacement = REPLACEMENTS.get(trimmed);
    if (!replacement) continue;
    node.nodeValue = raw.replace(trimmed, replacement);
  }
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applySharedBasketWording();
  });
}

schedule();
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
