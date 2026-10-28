import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { brand, enquiry, residences } from '../data/properties';

interface Values {
  name: string;
  email: string;
  phone: string;
  residence: string;
  date: string;
  message: string;
  consent: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'demo'; values: Values } | { kind: 'error'; message: string };

const isoDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Values, min: string, max: string): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = 'Please enter your full name.';
  const hasEmail = v.email.trim() !== '';
  const hasPhone = v.phone.trim() !== '';
  if (!hasEmail && !hasPhone) e.email = 'Please give an email address or a phone number.';
  if (hasEmail && !EMAIL.test(v.email.trim())) e.email = 'Please enter a valid email address, for example name@example.com.';
  if (hasPhone && (v.phone.replace(/\D/g, '').length < 7 || /[^\d\s+()-.]/.test(v.phone))) e.phone = 'Please enter a valid phone number, including the country code if outside your country.';
  if (!v.residence) e.residence = 'Please choose a residence, or “Not sure yet”.';
  if (!v.date) e.date = 'Please choose a preferred viewing date.';
  else if (v.date < min) e.date = `Please choose a date on or after ${new Date(min + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  else if (v.date > max) e.date = 'Please choose a date within the next 12 months.';
  if (!v.consent) e.consent = 'Please confirm we may contact you about this enquiry.';
  return e;
}

export default function Enquiry({ preselectedId }: { preselectedId: string }) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const { min, max } = useMemo(() => {
    const now = new Date();
    const a = new Date(now); a.setDate(a.getDate() + enquiry.minLeadDays);
    const b = new Date(now); b.setFullYear(b.getFullYear() + 1);
    return { min: isoDate(a), max: isoDate(b) };
  }, []);
  const [values, setValues] = useState<Values>({ name: '', email: '', phone: '', residence: preselectedId, date: '', message: '', consent: false });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const demo = !enquiry.endpoint;

  useEffect(() => {
    if (preselectedId) setValues((v) => ({ ...v, residence: preselectedId }));
  }, [preselectedId]);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    const next = { ...values, [k]: val };
    setValues(next);
    if (touched[k] || errors[k]) setErrors(validate(next, min, max));
  };
  const blur = (k: keyof Values) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors(validate(values, min, max));
  };
  const shown = (k: keyof Values) => (touched[k] || status.kind !== 'idle' ? errors[k] : undefined) ?? undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(values, min, max);
    setErrors(errs);
    setTouched({ name: true, email: true, phone: true, residence: true, date: true, consent: true });
    if (Object.keys(errs).length) {
      setStatus({ kind: 'idle' });
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (demo) {
      setStatus({ kind: 'demo', values });
      requestAnimationFrame(() => resultRef.current?.focus());
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch(enquiry.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...values, residenceName: residences.find((r) => r.id === values.residence)?.name ?? 'Not sure yet' }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setStatus({ kind: 'sent' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const errorList = Object.entries(errors) as [keyof Values, string][];
  const showSummary = errorList.length > 0 && Object.keys(touched).length >= 6 && status.kind === 'idle';
  const field = (k: keyof Values) => ({
    id: id(k),
    'aria-invalid': shown(k) ? true : undefined,
    'aria-describedby': [shown(k) ? id(`${k}-err`) : '', id(`${k}-hint`)].filter(Boolean).join(' ') || undefined,
    onBlur: () => blur(k),
  });
  const residenceName = (rid: string) => residences.find((r) => r.id === rid)?.name ?? 'Not sure yet';

  return (
    <section id="enquire" className="enquire" aria-labelledby="enquire-title">
      <div className="container enquire__grid">
        <div className="enquire__intro">
          <p className="eyebrow">Private viewings</p>
          <h2 id="enquire-title" className="section-title section-title--md" tabIndex={-1}>Book a Private Viewing</h2>
          <p>{brand.contactNote} Share a few details and a preferred date; a member of the team would confirm availability.</p>
          {demo && (
            <p className="demo-note" role="note">
              <strong>Demo mode.</strong> No backend is connected, so enquiries are validated but not sent anywhere.
            </p>
          )}
        </div>

        {status.kind === 'demo' || status.kind === 'sent' ? (
          <div className="form-result" ref={resultRef} tabIndex={-1} role="status">
            {status.kind === 'demo' ? (
              <>
                <p className="eyebrow">Demo mode — not sent</p>
                <h3 className="minor-title">Your request passed validation.</h3>
                <p>Because no enquiry endpoint is configured, nothing was transmitted and no one will contact you. This is what would have been sent:</p>
                <dl className="facts facts--compact">
                  <div><dt>Name</dt><dd>{status.values.name}</dd></div>
                  <div><dt>Contact</dt><dd>{[status.values.email, status.values.phone].filter(Boolean).join(' · ')}</dd></div>
                  <div><dt>Residence</dt><dd>{residenceName(status.values.residence)}</dd></div>
                  <div><dt>Preferred date</dt><dd>{new Date(status.values.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
                </dl>
              </>
            ) : (
              <>
                <p className="eyebrow">Request received</p>
                <h3 className="minor-title">Thank you, {values.name.split(' ')[0]}.</h3>
                <p>Your viewing request for {residenceName(values.residence)} was submitted successfully.</p>
              </>
            )}
            <button className="btn btn--outline" onClick={() => setStatus({ kind: 'idle' })}>Start a new request</button>
          </div>
        ) : (
          <form className="form" noValidate onSubmit={submit}>
            {showSummary && (
              <div className="error-summary" ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby={id('sum')}>
                <p id={id('sum')}><strong>Please check {errorList.length === 1 ? 'one field' : `${errorList.length} fields`}:</strong></p>
                <ul>
                  {errorList.map(([k, msg]) => (
                    <li key={k}><a href={`#${id(k)}`}>{msg}</a></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="field">
              <label htmlFor={id('name')}>Full name</label>
              <input {...field('name')} name="name" autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
              <span id={id('name-hint')} hidden />
              {shown('name') && <p className="field__error" id={id('name-err')}>{shown('name')}</p>}
            </div>

            <fieldset className="field-group">
              <legend>How should we contact you? <span className="muted">Email or phone</span></legend>
              <div className="field-row">
                <div className="field">
                  <label htmlFor={id('email')}>Email</label>
                  <input {...field('email')} type="email" name="email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
                  <span id={id('email-hint')} hidden />
                  {shown('email') && <p className="field__error" id={id('email-err')}>{shown('email')}</p>}
                </div>
                <div className="field">
                  <label htmlFor={id('phone')}>Phone</label>
                  <input {...field('phone')} type="tel" name="phone" autoComplete="tel" inputMode="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
                  <span id={id('phone-hint')} hidden />
                  {shown('phone') && <p className="field__error" id={id('phone-err')}>{shown('phone')}</p>}
                </div>
              </div>
            </fieldset>

            <div className="field-row">
              <div className="field">
                <label htmlFor={id('residence')}>Residence</label>
                <select {...field('residence')} name="residence" value={values.residence} onChange={(e) => set('residence', e.target.value)} required>
                  <option value="">Choose a residence…</option>
                  {residences.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.location}</option>)}
                  <option value="not-sure">Not sure yet</option>
                </select>
                <span id={id('residence-hint')} hidden />
                {shown('residence') && <p className="field__error" id={id('residence-err')}>{shown('residence')}</p>}
              </div>
              <div className="field">
                <label htmlFor={id('date')}>Preferred viewing date</label>
                <input {...field('date')} type="date" name="date" min={min} max={max} value={values.date} onChange={(e) => set('date', e.target.value)} required />
                <p className="field__hint" id={id('date-hint')}>Earliest {new Date(min + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. We confirm the exact time with you.</p>
                {shown('date') && <p className="field__error" id={id('date-err')}>{shown('date')}</p>}
              </div>
            </div>

            <div className="field">
              <label htmlFor={id('message')}>Message <span className="muted">(optional)</span></label>
              <textarea id={id('message')} name="message" rows={3} maxLength={600} value={values.message} onChange={(e) => set('message', e.target.value)} />
            </div>

            <div className="field field--check">
              <input {...field('consent')} type="checkbox" name="consent" checked={values.consent} onChange={(e) => set('consent', e.target.checked)} />
              <label htmlFor={id('consent')}>I agree to be contacted about this viewing request.</label>
              <span id={id('consent-hint')} hidden />
              {shown('consent') && <p className="field__error" id={id('consent-err')}>{shown('consent')}</p>}
            </div>

            {status.kind === 'error' && (
              <div className="error-summary" ref={resultRef} tabIndex={-1} role="alert">
                <p><strong>Your request could not be sent.</strong> Please try again in a moment. ({status.message})</p>
              </div>
            )}

            <button className="btn btn--dark btn--block" type="submit" disabled={status.kind === 'sending'}>
              {status.kind === 'sending' ? 'Sending…' : demo ? 'Request a viewing (demo)' : 'Request a viewing'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
