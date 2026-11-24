import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Address, type CartResponse } from '../api';
import { useCart } from '../cart';
import { Breadcrumbs, CategoryTags, Cover, Empty } from '../components/ui';
import { deliveryLabel, emptyAddress, inr, validateAddress } from '../format';

export interface CheckoutState {
  address: Address;
  couponCode: string;
  pointsToRedeem: number;
}

function Field({ id, label, error, children, className = '' }: { id: string; label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function CartPage() {
  const { cart, setQuantity, remove, refresh } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState<Address>(emptyAddress);
  const [touched, setTouched] = useState(false);
  const [useSaved, setUseSaved] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [points, setPoints] = useState(0);
  const [quoted, setQuoted] = useState<CartResponse | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Totals ALWAYS come from the server (/cart/quote); the UI never calculates prices.
  const itemsKey = cart?.items.map((i) => `${i.book.id}:${i.quantity}`).join(',') ?? '';
  useEffect(() => {
    if (!cart || cart.items.length === 0) return setQuoted(null);
    let cancelled = false;
    api<CartResponse>('/cart/quote', { method: 'POST', body: { couponCode: appliedCoupon || undefined, pointsToRedeem: points } })
      .then((q) => !cancelled && setQuoted(q))
      .catch(() => !cancelled && setQuoted(null));
    return () => {
      cancelled = true;
    };
  }, [itemsKey, appliedCoupon, points]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleSaved(checked: boolean) {
    setUseSaved(checked);
    if (!checked) return;
    const res = await api<{ address: Address | null }>('/auth/me/address');
    if (res.address) setAddress({ ...emptyAddress, ...res.address });
    else setMessage('You have no saved address yet.');
  }

  if (!cart) return null;
  if (cart.items.length === 0) {
    return (
      <Empty title="Your cart is empty" hint="Add some books to get started.">
        <Link to="/" className="btn-primary">Browse books</Link>
      </Empty>
    );
  }

  const errors = validateAddress(address);
  const valid = Object.keys(errors).length === 0;
  const q = quoted?.quote ?? cart.quote;
  const shown = (k: keyof Address) => (touched ? errors[k] : undefined);
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddress({ ...address, [k]: e.target.value });
  const bind = (k: keyof Address, extra = '') => ({
    id: k,
    className: `input ${shown(k) ? 'input-error' : ''} ${extra}`,
    value: address[k] ?? '',
    onChange: set(k),
    'aria-invalid': !!shown(k),
    'aria-describedby': shown(k) ? `${k}-err` : undefined,
  });

  function applyCoupon() {
    setMessage('');
    setAppliedCoupon(coupon.trim().toUpperCase());
  }

  function pay() {
    setTouched(true);
    if (!valid) return;
    const state: CheckoutState = { address, couponCode: appliedCoupon, pointsToRedeem: q.pointsUsed };
    navigate('/payment', { state });
  }

  return (
    <div className="p-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
        <h1 className="text-2xl">Shopping Cart</h1>
        <p className="text-sm text-muted">{cart.items.length} item{cart.items.length === 1 ? '' : 's'} in your cart</p>
      </div>

      <section aria-label="Cart items" className="panel mb-6">
        <ul className="flex flex-wrap gap-8">
          {cart.items.map(({ book, quantity }) => (
            <li key={book.id} className="flex w-full gap-4 text-sm sm:w-96">
              <Cover book={book} className="h-40 w-28" />
              <div className="space-y-1">
                <h2 className="text-lg"><Link to={`/books/${book.id}`}>{book.title}</Link></h2>
                <p>by <Link to={`/authors/${book.author.id}`} className="link">{book.author.name}</Link></p>
                <p>{book.format}</p>
                <CategoryTags tags={book.tags} />
                <p className="text-xl font-semibold">{inr(book.price)}</p>
                <p className="text-xs">{deliveryLabel(book.deliveryDate)}</p>
                <div className="flex items-center gap-1 pt-1" role="group" aria-label={`Quantity for ${book.title}`}>
                  <button className="btn-secondary !p-2" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(book.id, quantity - 1)}><Minus size={14} /></button>
                  <span className="w-8 text-center" aria-live="polite">{quantity}</span>
                  <button className="btn-secondary !p-2" aria-label="Increase quantity" disabled={quantity >= 10} onClick={() => setQuantity(book.id, quantity + 1).catch((e: Error) => setMessage(e.message))}><Plus size={14} /></button>
                  <button className="btn-secondary !p-2 ml-2" aria-label={`Remove ${book.title}`} onClick={() => remove(book.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Address" className="panel">
          <h2 className="mb-4 text-xl">Address</h2>
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useSaved} onChange={(e) => toggleSaved(e.target.checked)} /> Use Saved Address
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="firstName" label="First Name" error={shown('firstName')}><input {...bind('firstName')} placeholder="First Name" autoComplete="given-name" /></Field>
            <Field id="lastName" label="Last Name" error={shown('lastName')}><input {...bind('lastName')} placeholder="Last Name" autoComplete="family-name" /></Field>
            <Field id="line1" label="Address" error={shown('line1')}><input {...bind('line1')} placeholder="Address Line 1" autoComplete="address-line1" /></Field>
            <Field id="email" label="e-mail" error={shown('email')} className="sm:col-span-1"><input {...bind('email')} type="email" placeholder="e-mail" autoComplete="email" /></Field>
            <Field id="city" label="City" error={shown('city')}><input {...bind('city')} placeholder="City" autoComplete="address-level2" /></Field>
            <Field id="pin" label="Pin" error={shown('pin')}><input {...bind('pin')} placeholder="000000" inputMode="numeric" maxLength={6} autoComplete="postal-code" /></Field>
            <Field id="phone" label="Phone Number" error={shown('phone')} className="sm:col-span-1">
              <div className="flex gap-2">
                <select aria-label="Country code" className="input !w-24" value={address.phoneCode} onChange={set('phoneCode')}>
                  <option>+91</option><option>+1</option><option>+44</option>
                </select>
                <input {...bind('phone')} placeholder="1234567890" inputMode="numeric" maxLength={10} autoComplete="tel-national" />
              </div>
            </Field>
            <Field id="state" label="State" error={shown('state')}><input {...bind('state')} placeholder="State" autoComplete="address-level1" /></Field>
            <Field id="country" label="Country" error={shown('country')}>
              <select {...bind('country')}><option>India</option><option>United States</option><option>United Kingdom</option></select>
            </Field>
          </div>
        </section>

        <section aria-label="Grand total" className="panel">
          <h2 className="mb-4 text-xl">Grand Total</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt>Price ({cart.items.length} item{cart.items.length === 1 ? '' : 's'})</dt><dd>{inr(q.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{inr(q.tax)}</dd></div>
            <div className="flex justify-between border-b border-line pb-3"><dt>Delivery Charges</dt><dd>{q.delivery === 0 ? 'Free' : inr(q.delivery)}</dd></div>
          </dl>
          <div className="my-3 flex gap-2">
            <input aria-label="Coupon code" className="input" placeholder="Apply Coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
            <button className="btn-primary" onClick={applyCoupon}>Apply</button>
          </div>
          {q.couponError && <p role="alert" className="mb-2 text-xs text-danger">{q.couponError}</p>}
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3"><dt>Discount</dt><dd>{inr(q.discount)}</dd></div>
            <div className="flex items-center justify-between gap-2">
              <dt><label htmlFor="points">Redeem gift points <span className="text-muted">(you have {cart.pointsBalance})</span></label></dt>
              <dd className="flex items-center gap-2">
                <input id="points" type="number" min={0} max={cart.pointsBalance} className="input !w-20" value={points} onChange={(e) => setPoints(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
              </dd>
            </div>
            {points > 0 && <p className="text-xs text-muted">Applying {q.pointsUsed} points (max 20% of the bill)</p>}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total Amount</dt><dd>{inr(q.total)}</dd></div>
          </dl>
          {message && <p role="status" className="mt-3 text-xs text-muted">{message}</p>}
          <button className="btn-primary mt-4 w-full" onClick={pay} disabled={touched && !valid}>Pay Now</button>
          {touched && !valid && <p role="alert" className="mt-2 text-xs text-danger">Please fix the address errors above.</p>}
        </section>
      </div>
    </div>
  );
}
