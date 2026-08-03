import { ArrowRight, BookOpen, Check, Minus, Plus, ShieldCheck, ShoppingBasket, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { catalogue, formatMoney, tierForQuantity } from './catalogue';
import { useBasket } from './basket';

export default function BasketPage() {
  const { items, itemCount, licenceCount, setItemQuantity, removeItem, clearBasket } = useBasket();
  const [searchParams] = useSearchParams();
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    if (checkoutStatus === 'success') clearBasket();
  }, [checkoutStatus, clearBasket]);

  const detailedItems = useMemo(() => items.flatMap((item) => {
    const course = catalogue.find((entry) => entry.id === item.courseId);
    if (!course) return [];
    const tier = tierForQuantity(course, item.quantity);
    return [{ ...item, course, tier }];
  }), [items]);

  const totals = useMemo(() => detailedItems.reduce((sum, item) => ({
    net: sum.net + item.tier.aptenvoNetPence * item.quantity,
    vat: sum.vat + item.tier.vatPence * item.quantity,
    gross: sum.gross + item.tier.aptenvoGrossPence * item.quantity,
  }), { net: 0, vat: 0, gross: 0 }), [detailedItems]);

  const beginCheckout = async () => {
    if (!detailedItems.length) return;
    setCheckingOut(true);
    setCheckoutMessage('Preparing your secure checkout…');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: detailedItems.map((item) => ({
            courseId: item.course.id,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await response.json() as { url?: string; message?: string };

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      setCheckoutMessage(data.message ?? 'Stripe checkout is not connected yet.');
    } catch {
      setCheckoutMessage('Checkout is temporarily unavailable. Your basket has been kept safely on this device.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (checkoutStatus === 'success') {
    return (
      <main>
        <section className="page-hero basket-page-hero">
          <div className="container">
            <div className="eyebrow">Order received</div>
            <h1>Thank you for your purchase</h1>
            <p>Your payment has been received. Aptenvo will confirm the order and prepare the relevant course licences.</p>
          </div>
        </section>
        <section className="section">
          <div className="container basket-confirmation-card">
            <div className="basket-confirmation-icon"><Check size={34} /></div>
            <h2>Your purchase is being processed</h2>
            <p>Your basket has been cleared and the purchased courses are now recorded against your Aptenvo order.</p>
            <div className="button-row basket-confirmation-actions">
              <Link className="button button-primary" to="/account">View My Aptenvo</Link>
              <Link className="button button-secondary" to="/courses">Browse more courses</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="page-hero basket-page-hero">
        <div className="container">
          <div className="eyebrow">Your basket</div>
          <h1>Review your training basket</h1>
          <p>Add several different courses, choose the number of licences required for each one, and pay for everything together in one secure checkout.</p>
        </div>
      </section>

      <section className="section basket-section">
        <div className="container">
          {checkoutStatus === 'cancelled' && (
            <div className="basket-notice basket-notice-warning" role="status">
              Checkout was cancelled. Nothing has been charged and all courses remain in your basket.
            </div>
          )}

          {!detailedItems.length ? (
            <div className="empty-basket-card">
              <div className="empty-basket-icon"><ShoppingBasket size={36} /></div>
              <h2>Your basket is currently empty</h2>
              <p>Browse the course catalogue and add the training you need. You can purchase up to 25 different courses together in a single checkout.</p>
              <Link className="button button-primary" to="/courses">Browse courses <ArrowRight size={18} /></Link>
            </div>
          ) : (
            <div className="basket-layout">
              <div className="basket-items-panel">
                <div className="basket-panel-heading">
                  <div>
                    <span>{itemCount} different {itemCount === 1 ? 'course' : 'courses'}</span>
                    <h2>{licenceCount} {licenceCount === 1 ? 'licence' : 'licences'} selected</h2>
                  </div>
                  <button className="basket-clear-button" type="button" onClick={clearBasket}>Clear basket</button>
                </div>

                <div className="basket-item-list">
                  {detailedItems.map(({ course, quantity, tier }) => {
                    const lineTotal = tier.aptenvoGrossPence * quantity;
                    return (
                      <article className="basket-item" key={course.id}>
                        <div className="basket-item-icon"><BookOpen size={24} /></div>
                        <div className="basket-item-main">
                          <div className="basket-item-heading">
                            <div>
                              <span>{course.category} · {course.level}</span>
                              <Link to={`/courses/${course.slug}`}>{course.title}</Link>
                              <small>Course provider: {course.provider}</small>
                            </div>
                            <button className="basket-remove-button" type="button" onClick={() => removeItem(course.id)} aria-label={`Remove ${course.title}`}>
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="basket-item-controls">
                            <div className="basket-quantity-control" aria-label={`Licence quantity for ${course.title}`}>
                              <button type="button" onClick={() => setItemQuantity(course.id, Math.max(1, quantity - 1))} aria-label="Reduce quantity"><Minus size={16} /></button>
                              <input
                                type="number"
                                min="1"
                                max="9999"
                                value={quantity}
                                onChange={(event) => setItemQuantity(course.id, Number(event.target.value) || 1)}
                              />
                              <button type="button" onClick={() => setItemQuantity(course.id, Math.min(9999, quantity + 1))} aria-label="Increase quantity"><Plus size={16} /></button>
                            </div>
                            <div className="basket-item-price">
                              <span>{formatMoney(tier.aptenvoGrossPence)} per licence</span>
                              <strong>{formatMoney(lineTotal)}</strong>
                              <small>including VAT</small>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <Link className="basket-continue-link" to="/courses">← Continue browsing courses</Link>
              </div>

              <aside className="basket-summary-card">
                <h2>Basket summary</h2>
                <div className="basket-summary-row"><span>Different courses</span><strong>{itemCount}</strong></div>
                <div className="basket-summary-row"><span>Total licences</span><strong>{licenceCount}</strong></div>
                <div className="basket-summary-divider" />
                <div className="basket-summary-row"><span>Subtotal excluding VAT</span><strong>{formatMoney(totals.net)}</strong></div>
                <div className="basket-summary-row"><span>VAT</span><strong>{formatMoney(totals.vat)}</strong></div>
                <div className="basket-summary-total"><span>Total to pay</span><strong>{formatMoney(totals.gross)}</strong></div>
                <span className="basket-vat-note">The total shown includes VAT.</span>

                <button className="button button-primary full-width basket-checkout-button" type="button" onClick={beginCheckout} disabled={checkingOut}>
                  <ShieldCheck size={18} /> {checkingOut ? 'Preparing checkout…' : 'Proceed to secure checkout'}
                </button>
                {checkoutMessage && <p className="checkout-message" role="status">{checkoutMessage}</p>}

                <ul className="basket-confidence-list">
                  <li><Check size={16} /> One secure payment for the complete basket</li>
                  <li><Check size={16} /> Prices are verified against the Aptenvo database</li>
                  <li><Check size={16} /> Quantity pricing is applied separately to each course</li>
                  <li><Check size={16} /> Payment will be processed securely through Stripe</li>
                </ul>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
