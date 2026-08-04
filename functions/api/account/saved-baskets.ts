import {
  cleanText,
  ensureAccountTables,
  requireSession,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

type BasketItem = {
  courseId?: string;
  quantity?: number;
};

type BasketRequest = {
  id?: string;
  name?: string;
  items?: BasketItem[];
};

function validItems(value: unknown): Array<{ courseId: string; quantity: number }> | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 25) return null;
  const items: Array<{ courseId: string; quantity: number }> = [];
  let licences = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const item = entry as BasketItem;
    const courseId = typeof item.courseId === 'string' ? item.courseId.trim() : '';
    const quantity = Number(item.quantity);
    if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > 25) return null;
    licences += quantity;
    if (licences > 25) return null;
    items.push({ courseId, quantity });
  }
  return items;
}

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  await ensureAccountTables(env.DB);

  const result = await env.DB.prepare(`
    SELECT id, name, items_json, created_at, updated_at
    FROM customer_saved_baskets
    WHERE account_id = ?
    ORDER BY updated_at DESC
  `).bind(auth.session.accountId).all<{ id: string; name: string; items_json: string; created_at: string; updated_at: string }>();

  const baskets = (result.results ?? []).map((basket) => ({
    id: basket.id,
    name: basket.name,
    items: JSON.parse(basket.items_json),
    createdAt: basket.created_at,
    updatedAt: basket.updated_at,
  }));
  return Response.json({ baskets }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPost: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  let input: BasketRequest;
  try {
    input = await request.json<BasketRequest>();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = cleanText(input.name, 100);
  const items = validItems(input.items);
  if (!name || !items) {
    return Response.json({
      error: 'invalid_saved_basket',
      message: 'Provide a basket name and at least one valid course. Saved online baskets are limited to 25 licences.',
    }, { status: 400 });
  }

  await ensureAccountTables(env.DB);
  const id = input.id?.startsWith('saved-basket-') ? input.id : `saved-basket-${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO customer_saved_baskets (id, account_id, name, items_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      items_json = excluded.items_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, auth.session.accountId, name, JSON.stringify(items)).run();

  return Response.json({ saved: true, id });
};

export const onRequestDelete: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'basket_id_required' }, { status: 400 });

  await ensureAccountTables(env.DB);
  await env.DB.prepare('DELETE FROM customer_saved_baskets WHERE id = ? AND account_id = ?')
    .bind(id, auth.session.accountId).run();
  return Response.json({ deleted: true });
};
