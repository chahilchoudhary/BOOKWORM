import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, type CartResponse, type Order } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { ErrorBox, Spinner } from '../components/ui';
import { formatCard, inr, luhn, validExpiry } from '../format';
import type { CheckoutState } from './CartPage';

type Method = 'credit_card' | 'debit_card' | 'upi' | 'wallet';
const TABS: [Method, string][] = [
  ['credit_card', 'Credit Card'],
  ['debit_card', 'Debit card'],
  ['upi', 'UPI'],
  ['wallet', 'Wallet'],
];

export function PaymentPage() {
  const location = useLocation();
  const checkout = location.state as CheckoutState | null;
  const navigate = useNavigate();
  const { refresh } = useCart();
  const { refreshUser } = useAuth();

  const [method, setMethod] = useState<Method>('credit_card');
  const [card, setCard] = useState({ number: '', name: '', cvv: '', expiry: '' });
  const [upi, setUpi] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const payable = useFetchQuote(checkout);

  if (!checkout) return <Navigate to="/cart" replace />;
  if (payable.loading) return <Spinner />;
  if (payable.error || !payable.total) return <ErrorBox message={payable.error ?? 'Could not load your cart'} />;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (method === 'credit_card' || method === 'debit_card') {
      if (!luhn(card.number)) e.number = 'Enter a valid card number';
      if (!card.name.trim()) e.name = 'Enter the name on the card';
      if (!/^\d{3}$/.test(card.cvv)) e.cvv = 'CVV must be 3 digits';
      if (!validExpiry(card.expiry)) e.expiry = 'Use MM/YYYY, not in the past';
    }
    if (method === 'upi' && !/^[\w.-]+@\w+$/.test(upi)) e.upi = 'Enter a valid UPI ID (name@bank)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!checkout || !validate()) return;
    setBusy(true);
    setServerError('');
    try {
      const { order } = await api<{ order: Order }>('/orders', {
        method: 'POST',
        body: {
          address: checkout.address,
          couponCode: checkout.couponCode || undefined,
          pointsToRedeem: checkout.pointsToRedeem,
          payment: { method, cardNumber: card.number || undefined, upiId: upi || undefined },
        },
      });
      // never keep card details around once the payment has been sent
      setCard({ number: '', name: '', cvv: '', expiry: '' });
      await Promise.all([refresh(), refreshUser()]);
      navigate(`/confirmation/${order.id}`, { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  const isCard = method === 'credit_card' || method === 'debit_card';
  const err = (k: string) => errors[k];
  const props = (k: string) => ({ 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `${k}-err` : undefined, className: `input ${err(k) ? 'input-error' : ''}` });

  return (
    <div className="books-bg flex min-h-[calc(100vh-3rem)] items-center justify-center p-4">
      <form onSubmit={submit} noValidate className="w-full max-w-2xl bg-panel" aria-label="Complete payment">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h1 className="text-xl">Complete Payment</h1>
          <p className="font-semibold">Payable Amount: {inr(payable.total)}</p>
        </div>
        <div className="sm:flex">
          <div role="tablist" aria-orientation="vertical" aria-label="Payment method" className="flex sm:w-44 sm:flex-col">
            {TABS.map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={method === m}
                onClick={() => {
                  setMethod(m);
                  setErrors({});
                  setServerError('');
                }}
                className={`flex-1 border-l-4 px-4 py-4 text-left text-sm sm:flex-none ${method === m ? 'border-primary bg-panel font-semibold' : 'border-transparent bg-field text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="flex-1 space-y-4 p-4">
            {isCard && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="number">Card Number</label>
                  <input id="number" {...props('number')} placeholder="XXXX-XXXX-XXXX-XXXX" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} />
                  {err('number') && <p id="number-err" className="mt-1 text-xs text-danger">{err('number')}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="name">Name on Card</label>
                  <input id="name" {...props('name')} placeholder="Name" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  {err('name') && <p id="name-err" className="mt-1 text-xs text-danger">{err('name')}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="cvv">CVV</label>
                  <input id="cvv" {...props('cvv')} placeholder="XXX" inputMode="numeric" maxLength={3} type="password" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} />
                  {err('cvv') && <p id="cvv-err" className="mt-1 text-xs text-danger">{err('cvv')}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="expiry">Date of Expiry</label>
                  <input id="expiry" {...props('expiry')} placeholder="MM/YYYY" maxLength={7} autoComplete="cc-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                  {err('expiry') && <p id="expiry-err" className="mt-1 text-xs text-danger">{err('expiry')}</p>}
                </div>
                <p className="text-xs text-muted sm:col-span-2">Demo cards — success: 4111 1111 1111 1111 · declined: 4000 0000 0000 0002</p>
              </div>
            )}
            {method === 'upi' && (
              <div>
                <label className="label" htmlFor="upi">UPI ID</label>
                <input id="upi" {...props('upi')} placeholder="name@bank" value={upi} onChange={(e) => setUpi(e.target.value)} />
                {err('upi') && <p id="upi-err" className="mt-1 text-xs text-danger">{err('upi')}</p>}
              </div>
            )}
            {method === 'wallet' && <p className="text-sm text-muted">Pay using your Book Worm wallet. (Demo: wallet payments always succeed.)</p>}

            {serverError && <p role="alert" className="text-sm text-danger">{serverError}</p>}
            <div className="flex justify-end">
              <button className="btn-primary" disabled={busy}>{busy ? 'Processing…' : 'Pay Now'}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Asks the server for the final amount for this checkout (never computed in the browser). */
function useFetchQuote(checkout: CheckoutState | null) {
  const [state, setState] = useState<{ loading: boolean; total: number | null; error: string | null }>({ loading: true, total: null, error: null });
  useEffect(() => {
    if (!checkout) return;
    let cancelled = false;
    api<CartResponse>('/cart/quote', { method: 'POST', body: { couponCode: checkout.couponCode || undefined, pointsToRedeem: checkout.pointsToRedeem } })
      .then((q) => {
        if (!cancelled) setState({ loading: false, total: q.items.length ? q.quote.total : null, error: q.items.length ? null : 'Your cart is empty' });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ loading: false, total: null, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [checkout]);
  return state;
}
