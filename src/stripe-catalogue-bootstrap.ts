const PRODUCTION_HOST = 'sousamurrayelearning.jagroupservices.co.uk';
const BATCH_SIZE = 5;

type SyncResponse = {
  family: 'sousa_murray' | 'highfield';
  offset: number;
  total: number;
  synced: number;
  complete: boolean;
  nextOffset: number | null;
};

async function syncFamily(family: 'sousa_murray' | 'highfield') {
  let offset = 0;
  for (let batch = 0; batch < 200; batch += 1) {
    const response = await fetch(`/api/catalogue/stripe-sync?family=${family}&offset=${offset}&limit=${BATCH_SIZE}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      console.warn(`Stripe ${family} course catalogue sync paused at offset ${offset}: HTTP ${response.status}.`);
      return;
    }
    const result = await response.json() as SyncResponse;
    if (result.complete || result.nextOffset === null) return;
    offset = result.nextOffset;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
}

async function synchroniseStripeCourseCatalogue() {
  if (window.location.hostname !== PRODUCTION_HOST) return;
  try {
    await syncFamily('sousa_murray');
    await syncFamily('highfield');
  } catch (error) {
    console.warn('Stripe course catalogue background sync paused.', error);
  }
}

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void synchroniseStripeCourseCatalogue();
  }, 4_000);
}
