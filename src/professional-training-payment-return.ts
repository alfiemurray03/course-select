async function reconcileProfessionalTrainingReturn() {
  const url = new URL(window.location.href);
  if (url.pathname !== '/basket' || url.searchParams.get('checkout') !== 'success') return;
  const orderId = url.searchParams.get('order_id') ?? '';
  if (!/^order-[0-9a-f-]{36}$/i.test(orderId)) return;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(`/api/professional-training/payment-status?orderId=${encodeURIComponent(orderId)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (response.ok) {
        const status = await response.json() as { paid?: boolean; status?: string };
        if (status.paid || ['failed', 'cancelled'].includes(String(status.status || ''))) return;
      }
    } catch {
      // Head Office remains the payment source of truth. A later authenticated
      // visit can retry reconciliation if the central webhook has not landed yet.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
}

void reconcileProfessionalTrainingReturn();
