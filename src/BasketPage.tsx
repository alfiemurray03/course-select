import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  FileSpreadsheet,
  FileText,
  Info,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { catalogue, formatMoney, tierForQuantity } from './catalogue';
import { ONLINE_LICENCE_LIMIT, useBasket } from './basket';

type CustomerType = '' | 'individual' | 'business';
type SubmissionMethod = 'manual' | 'file';
type LearnerField = 'legalFirstName' | 'legalLastName' | 'enrolmentEmail';

type LearnerDetails = {
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maximumUploadBytes = 10 * 1024 * 1024;
const allowedUploadExtensions = ['csv', 'xls', 'xlsx', 'pdf'];
const emptyLearner = (): LearnerDetails => ({
  legalFirstName: '',
  legalLastName: '',
  enrolmentEmail: '',
});

function uploadExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BasketPage() {
  const {
    items,
    itemCount,
    licenceCount,
    remainingLicenceCapacity,
    setItemQuantity,
    removeItem,
    clearBasket,
  } = useBasket();
  const [searchParams] = useSearchParams();
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerType, setCustomerType] = useState<CustomerType>('');
  const [legalFirstName, setLegalFirstName] = useState('');
  const [legalLastName, setLegalLastName] = useState('');
  const [enrolmentEmail, setEnrolmentEmail] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [providerConsent, setProviderConsent] = useState(false);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>('manual');
  const [learnerDetails, setLearnerDetails] = useState<Record<string, LearnerDetails[]>>({});
  const [learnerFile, setLearnerFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
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

  useEffect(() => {
    setLearnerDetails((current) => {
      const next: Record<string, LearnerDetails[]> = {};
      for (const item of detailedItems) {
        const existing = current[item.course.id] ?? [];
        next[item.course.id] = Array.from({ length: item.quantity }, (_, index) => existing[index] ?? emptyLearner());
      }
      return next;
    });
  }, [detailedItems]);

  useEffect(() => {
    const primary = {
      legalFirstName: legalFirstName.trim(),
      legalLastName: legalLastName.trim(),
      enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
    };
    if (!primary.legalFirstName && !primary.legalLastName && !primary.enrolmentEmail) return;

    setLearnerDetails((current) => {
      let changed = false;
      const next = { ...current };
      for (const item of detailedItems) {
        const rows = [...(next[item.course.id] ?? [])];
        const first = rows[0];
        if (first && !first.legalFirstName && !first.legalLastName && !first.enrolmentEmail) {
          rows[0] = primary;
          next[item.course.id] = rows;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [legalFirstName, legalLastName, enrolmentEmail, detailedItems]);

  const totals = useMemo(() => detailedItems.reduce((sum, item) => ({
    net: sum.net + item.tier.aptenvoNetPence * item.quantity,
    vat: sum.vat + item.tier.vatPence * item.quantity,
    gross: sum.gross + item.tier.aptenvoGrossPence * item.quantity,
  }), { net: 0, vat: 0, gross: 0 }), [detailedItems]);

  const manualAssignments = useMemo(() => detailedItems.flatMap((item) => (
    (learnerDetails[item.course.id] ?? []).map((learner, index) => ({
      courseId: item.course.id,
      position: index + 1,
      legalFirstName: learner.legalFirstName.trim(),
      legalLastName: learner.legalLastName.trim(),
      enrolmentEmail: learner.enrolmentEmail.trim().toLowerCase(),
    }))
  )), [detailedItems, learnerDetails]);

  const manualDetailsComplete = manualAssignments.length === licenceCount && manualAssignments.every((learner) => (
    learner.legalFirstName.length > 0
    && learner.legalLastName.length > 0
    && emailPattern.test(learner.enrolmentEmail)
  ));

  const customerDetailsComplete = Boolean(
    customerType
    && legalFirstName.trim().length > 0
    && legalLastName.trim().length > 0
    && emailPattern.test(enrolmentEmail.trim())
    && providerConsent
    && authorityConfirmed,
  );

  const submissionComplete = submissionMethod === 'manual'
    ? manualDetailsComplete
    : Boolean(learnerFile && !fileError);

  const detailsComplete = customerDetailsComplete && submissionComplete;

  const updateLearner = (courseId: string, index: number, field: LearnerField, value: string) => {
    setLearnerDetails((current) => {
      const rows = [...(current[courseId] ?? [])];
      rows[index] = { ...(rows[index] ?? emptyLearner()), [field]: value };
      return { ...current, [courseId]: rows };
    });
  };

  const usePrimaryDetails = (courseId: string, index: number) => {
    setLearnerDetails((current) => {
      const rows = [...(current[courseId] ?? [])];
      rows[index] = {
        legalFirstName: legalFirstName.trim(),
        legalLastName: legalLastName.trim(),
        enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
      };
      return { ...current, [courseId]: rows };
    });
  };

  const chooseLearnerFile = (file: File | null) => {
    setLearnerFile(null);
    setFileError('');
    if (!file) return;

    const extension = uploadExtension(file.name);
    if (!allowedUploadExtensions.includes(extension)) {
      setFileError('Upload a CSV, XLS, XLSX or PDF file.');
      return;
    }
    if (file.size < 1 || file.size > maximumUploadBytes) {
      setFileError('The learner file must be no larger than 10 MB.');
      return;
    }
    setLearnerFile(file);
  };

  const beginCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (!detailedItems.length) return;

    if (!detailsComplete) {
      setCheckoutMessage(
        submissionMethod === 'manual'
          ? 'Complete the customer details and every learner row before proceeding to payment.'
          : 'Complete the customer details, attach a valid learner file and confirm the required declarations before proceeding.',
      );
      return;
    }

    setCheckingOut(true);
    setCheckoutMessage('Saving the learner information and preparing your secure checkout…');

    try {
      const payload = {
        items: detailedItems.map((item) => ({
          courseId: item.course.id,
          quantity: item.quantity,
        })),
        customer: {
          type: customerType,
          legalFirstName: legalFirstName.trim(),
          legalLastName: legalLastName.trim(),
          enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
          organisationName: customerType === 'business' ? organisationName.trim() : '',
          providerConsent,
          authorityConfirmed,
        },
        learnerSubmission: {
          method: submissionMethod,
          learners: submissionMethod === 'manual' ? manualAssignments : [],
        },
      };

      const body = new FormData();
      body.set('payload', JSON.stringify(payload));
      if (submissionMethod === 'file' && learnerFile) body.set('learnerFile', learnerFile);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        body,
      });
      const data = await response.json() as { url?: string; message?: string };

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      setCheckoutMessage(data.message ?? 'Checkout could not be prepared. Please contact Sousa Murray eLearning if the problem continues.');
    } catch {
      setCheckoutMessage('Checkout is temporarily unavailable. Your basket and learner information remain on this page. Please contact Sousa Murray eLearning if you need assistance.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (checkoutStatus === 'success') {
    return (
      <main>
        <section className="page-hero basket-page-hero">
          <div className="container">
            <div className="eyebrow">Sousa Murray eLearning order received</div>
            <h1>Thank you for your purchase</h1>
            <p>Your payment has been received by Sousa Murray eLearning. The submitted learner information is now attached to the paid order for enrolment processing.</p>
          </div>
        </section>
        <section className="section">
          <div className="container basket-confirmation-card">
            <div className="basket-confirmation-icon"><Check size={34} /></div>
            <h2>Your Sousa Murray eLearning purchase is awaiting enrolment</h2>
            <p>Sousa Murray eLearning will review the learner information and complete enrolment. Highfield will then email each learner with instructions for accessing its Learning Management System. Contact Sousa Murray eLearning for all support.</p>
            <div className="button-row basket-confirmation-actions">
              <Link className="button button-primary" to="/account">View My Sousa Murray eLearning</Link>
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
          <div className="eyebrow">Your Sousa Murray eLearning basket</div>
          <h1>Review your training purchase</h1>
          <p>Set the licence quantities, provide the customer and learner information, and then continue to secure payment.</p>
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
              <p>Browse the course catalogue and add the training you need. A single online basket may contain no more than {ONLINE_LICENCE_LIMIT} licences in total.</p>
              <Link className="button button-primary" to="/courses">Browse courses <ArrowRight size={18} /></Link>
            </div>
          ) : (
            <form className="basket-layout" onSubmit={beginCheckout}>
              <div className="basket-items-panel">
                <div className="basket-panel-heading">
                  <div>
                    <span>{itemCount} different {itemCount === 1 ? 'course' : 'courses'}</span>
                    <h2>{licenceCount} of {ONLINE_LICENCE_LIMIT} online licences selected</h2>
                  </div>
                  <button className="basket-clear-button" type="button" onClick={clearBasket}>Clear basket</button>
                </div>

                <div className="basket-limit-strip">
                  <Info size={18} />
                  <span>{remainingLicenceCapacity > 0
                    ? `${remainingLicenceCapacity} ${remainingLicenceCapacity === 1 ? 'licence remains' : 'licences remain'} within the online limit.`
                    : `The ${ONLINE_LICENCE_LIMIT}-licence online limit has been reached.`}</span>
                  <Link to="/support?topic=large-order">Need {ONLINE_LICENCE_LIMIT + 1}+ licences?</Link>
                </div>

                <div className="basket-item-list">
                  {detailedItems.map(({ course, quantity, tier }) => {
                    const lineTotal = tier.aptenvoGrossPence * quantity;
                    const maximumForItem = quantity + remainingLicenceCapacity;
                    return (
                      <article className="basket-item" key={course.id}>
                        <div className="basket-item-icon"><BookOpen size={24} /></div>
                        <div className="basket-item-main">
                          <div className="basket-item-heading">
                            <div>
                              <span>{course.category} · {course.level}</span>
                              <Link to={`/courses/${course.slug}`}>{course.title}</Link>
                              <small>Sold by Sousa Murray eLearning · Course delivered through Highfield Online Training</small>
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
                                max={maximumForItem}
                                value={quantity}
                                onChange={(event) => setItemQuantity(course.id, Number(event.target.value) || 1)}
                              />
                              <button type="button" onClick={() => setItemQuantity(course.id, quantity + 1)} disabled={remainingLicenceCapacity === 0} aria-label="Increase quantity"><Plus size={16} /></button>
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

                <section className="customer-details-panel" aria-labelledby="customer-details-heading">
                  <div className="learner-panel-heading">
                    <div className="learner-panel-icon"><UserRound size={24} /></div>
                    <div>
                      <span>Required before payment</span>
                      <h2 id="customer-details-heading">Customer details</h2>
                      <p>Tell us who is purchasing and who Sousa Murray eLearning should contact about this order.</p>
                    </div>
                  </div>

                  <fieldset className="customer-type-fieldset">
                    <legend>Are you purchasing as? <span aria-hidden="true">*</span></legend>
                    <div className="customer-type-options">
                      <label className={customerType === 'individual' ? 'selected' : ''}>
                        <input type="radio" name="customer-type" value="individual" checked={customerType === 'individual'} onChange={() => setCustomerType('individual')} required />
                        <UserRound size={20} /><span><strong>Individual</strong><small>Buying personally</small></span>
                      </label>
                      <label className={customerType === 'business' ? 'selected' : ''}>
                        <input type="radio" name="customer-type" value="business" checked={customerType === 'business'} onChange={() => setCustomerType('business')} required />
                        <Building2 size={20} /><span><strong>Business</strong><small>Buying for an organisation</small></span>
                      </label>
                    </div>
                  </fieldset>

                  <div className="customer-details-fields">
                    <div className="enrolment-name-grid">
                      <label>Legal first name <span aria-hidden="true">*</span><input type="text" autoComplete="given-name" maxLength={80} value={legalFirstName} onChange={(event) => setLegalFirstName(event.target.value)} required /></label>
                      <label>Legal last name <span aria-hidden="true">*</span><input type="text" autoComplete="family-name" maxLength={80} value={legalLastName} onChange={(event) => setLegalLastName(event.target.value)} required /></label>
                    </div>

                    <label className="enrolment-field">Primary contact or learner email <span aria-hidden="true">*</span>
                      <input type="email" autoComplete="email" maxLength={254} value={enrolmentEmail} onChange={(event) => setEnrolmentEmail(event.target.value)} required />
                      <small>This is the Sousa Murray eLearning order contact. You can use the same details for learner rows where appropriate.</small>
                    </label>

                    {customerType === 'business' && (
                      <label className="enrolment-field">Organisation name <span className="optional-label">Optional</span>
                        <input type="text" autoComplete="organization" maxLength={160} value={organisationName} onChange={(event) => setOrganisationName(event.target.value)} />
                      </label>
                    )}
                  </div>

                  <div className="customer-declarations">
                    <label className="provider-consent-field">
                      <input type="checkbox" checked={authorityConfirmed} onChange={(event) => setAuthorityConfirmed(event.target.checked)} required />
                      <span>I confirm that I am authorised to provide the personal information of every learner included in this order.</span>
                    </label>

                    <label className="provider-consent-field">
                      <input type="checkbox" checked={providerConsent} onChange={(event) => setProviderConsent(event.target.checked)} required />
                      <span>I confirm that the learner details may be provided to Highfield Online Training solely for course enrolment, LMS access and course delivery. Sousa Murray eLearning remains the customer support contact.</span>
                    </label>
                  </div>
                </section>

                <section className="learner-submission-panel" aria-labelledby="learner-information-heading">
                  <div className="learner-panel-heading">
                    <div className="learner-panel-icon"><Users size={24} /></div>
                    <div>
                      <span>Required before payment</span>
                      <h2 id="learner-information-heading">Learner information</h2>
                      <p>Enter every learner manually or attach a spreadsheet or PDF containing the complete learner list.</p>
                    </div>
                  </div>

                  <fieldset className="submission-method-fieldset">
                    <legend>How would you like to provide the learner list?</legend>
                    <div className="submission-method-options">
                      <label className={submissionMethod === 'manual' ? 'selected' : ''}>
                        <input type="radio" name="submission-method" checked={submissionMethod === 'manual'} onChange={() => setSubmissionMethod('manual')} />
                        <Users size={20} />
                        <span><strong>Enter learner details</strong><small>Complete one row for every licence</small></span>
                      </label>
                      <label className={submissionMethod === 'file' ? 'selected' : ''}>
                        <input type="radio" name="submission-method" checked={submissionMethod === 'file'} onChange={() => setSubmissionMethod('file')} />
                        <Upload size={20} />
                        <span><strong>Upload learner list</strong><small>CSV, Excel spreadsheet or PDF</small></span>
                      </label>
                    </div>
                  </fieldset>

                  {submissionMethod === 'manual' ? (
                    <div className="course-learner-groups">
                      {detailedItems.map(({ course, quantity }) => (
                        <section className="course-learner-group" key={`learners-${course.id}`}>
                          <div className="course-learner-heading">
                            <div><BookOpen size={19} /><span><strong>{course.title}</strong><small>{quantity} {quantity === 1 ? 'learner' : 'learners'} required</small></span></div>
                          </div>
                          <div className="learner-row-list">
                            {(learnerDetails[course.id] ?? []).map((learner, index) => (
                              <div className="learner-entry-row" key={`${course.id}-${index}`}>
                                <div className="learner-entry-number">{index + 1}</div>
                                <div className="learner-entry-fields">
                                  <label>Legal first name<input type="text" maxLength={80} value={learner.legalFirstName} onChange={(event) => updateLearner(course.id, index, 'legalFirstName', event.target.value)} required /></label>
                                  <label>Legal last name<input type="text" maxLength={80} value={learner.legalLastName} onChange={(event) => updateLearner(course.id, index, 'legalLastName', event.target.value)} required /></label>
                                  <label className="learner-email-field">Enrolment email<input type="email" maxLength={254} value={learner.enrolmentEmail} onChange={(event) => updateLearner(course.id, index, 'enrolmentEmail', event.target.value)} required /></label>
                                </div>
                                <button className="copy-primary-button" type="button" onClick={() => usePrimaryDetails(course.id, index)} disabled={!legalFirstName.trim() || !legalLastName.trim() || !emailPattern.test(enrolmentEmail.trim())}>
                                  Use primary details
                                </button>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="learner-upload-area">
                      <div className="upload-guidance">
                        <FileSpreadsheet size={25} />
                        <div>
                          <h3>Upload the learner list</h3>
                          <p>The document must clearly show the course, legal first name, legal last name and enrolment email for every learner.</p>
                          <a href="/templates/aptenvo-learner-upload-template.csv" download>Download the CSV template</a>
                        </div>
                      </div>

                      {!learnerFile ? (
                        <label className={`learner-file-picker${fileError ? ' has-error' : ''}`}>
                          <Upload size={30} />
                          <strong>Choose a spreadsheet or PDF</strong>
                          <span>CSV, XLS, XLSX or PDF · maximum 10 MB</span>
                          <input type="file" accept=".csv,.xls,.xlsx,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => chooseLearnerFile(event.target.files?.[0] ?? null)} required />
                        </label>
                      ) : (
                        <div className="selected-learner-file">
                          {uploadExtension(learnerFile.name) === 'pdf' ? <FileText size={27} /> : <FileSpreadsheet size={27} />}
                          <div><strong>{learnerFile.name}</strong><span>{formatFileSize(learnerFile.size)} · ready to attach securely</span></div>
                          <button type="button" onClick={() => chooseLearnerFile(null)} aria-label="Remove learner file"><X size={18} /></button>
                        </div>
                      )}
                      {fileError && <p className="learner-file-error" role="alert">{fileError}</p>}
                      <p className="upload-security-note"><ShieldCheck size={17} /> The file will be stored privately and linked to the Sousa Murray eLearning order. It will not be publicly accessible.</p>
                    </div>
                  )}
                </section>

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

                <button className="button button-primary full-width basket-checkout-button" type="submit" disabled={checkingOut || licenceCount > ONLINE_LICENCE_LIMIT}>
                  <ShieldCheck size={18} /> {checkingOut ? 'Preparing checkout…' : 'Continue to secure payment'}
                </button>
                {checkoutMessage && <p className="checkout-message" role="status">{checkoutMessage}</p>}
                <p className="basket-secure-note"><ShieldCheck size={16} /> Secure payment is processed by Stripe.</p>
              </aside>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
