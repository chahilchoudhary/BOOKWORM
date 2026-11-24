import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Order } from '../api';
import { useAuth } from '../auth';
import { Cover, Empty, ErrorBox, Spinner } from '../components/ui';
import { deliveryLabel, inr } from '../format';
import { useFetch } from '../hooks';

export function ConfirmationPage() {
  const { id } = useParams();
  const { refreshUser } = useAuth();
  const { data, error, loading, reload } = useFetch<{ order: Order }>(`/orders/${id}`);
  const [cancelError, setCancelError] = useState('');

  if (loading) return <Spinner />;
  if (error) {
    return error === 'Order not found' ? <Empty title="Order not found"><Link to="/" className="btn-primary">Home</Link></Empty> : <ErrorBox message={error} onRetry={reload} />;
  }
  if (!data) return null;
  const { order } = data;
  const cancelled = order.status === 'CANCELLED';

  async function cancel() {
    if (!window.confirm('Cancel this order? Your payment will be refunded.')) return;
    setCancelError('');
    try {
      await api(`/orders/${order.id}/cancel`, { method: 'POST' });
      await refreshUser();
      reload();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel');
    }
  }

  return (
    <div className="books-bg flex min-h-[calc(100vh-3rem)] items-center justify-center p-4">
      <section aria-label="Order confirmation" className="w-full max-w-3xl bg-panel p-8 text-center">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${cancelled ? 'bg-danger' : 'bg-ok'}`}>
          <Check size={30} aria-hidden />
        </span>
        <h1 className="mt-8 text-xl">{cancelled ? 'This order has been cancelled' : 'Your purchase of the following reads is successful'}</h1>
        <p className="mt-1 text-sm text-muted">Order #{order.id} · Total {inr(order.total)}</p>

        <ul className="mt-6 grid gap-6 text-left sm:grid-cols-2">
          {order.items.map((i) => (
            <li key={i.bookId} className="flex gap-3 text-sm">
              <Cover book={{ title: i.title, coverColor: i.coverColor }} className="h-32 w-24" />
              <div className="space-y-1">
                <p className="text-lg"><Link to={`/books/${i.bookId}`}>{i.title}</Link></p>
                <p>by <Link to={`/authors/${i.authorId}`} className="link">{i.authorName}</Link></p>
                <p>{i.format} × {i.quantity}</p>
                <p className="text-lg font-semibold">{inr(i.unitPrice)}</p>
                <p className="text-xs">{deliveryLabel(i.deliveryDate)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">Continue your Shopping</Link>
          {order.canCancel && <button className="btn-secondary" onClick={cancel}>Cancel order (within 48 hrs)</button>}
        </div>
        {cancelError && <p role="alert" className="mt-3 text-sm text-danger">{cancelError}</p>}
      </section>
    </div>
  );
}
