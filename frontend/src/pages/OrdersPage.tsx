import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Order } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { Cover, Empty, ErrorBox, Spinner } from '../components/ui';
import { inr, shortDate } from '../format';
import { useFetch } from '../hooks';

export function OrdersPage() {
  const { data, error, loading, reload } = useFetch<{ items: Order[] }>('/orders');
  const { refresh } = useCart();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  async function cancel(o: Order) {
    if (!window.confirm(`Cancel order #${o.id}? Your payment will be refunded.`)) return;
    try {
      await api(`/orders/${o.id}/cancel`, { method: 'POST' });
      await refreshUser();
      setMessage(`Order #${o.id} cancelled`);
      reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not cancel');
    }
  }

  async function buyAgain(o: Order) {
    try {
      await api(`/orders/${o.id}/buy-again`, { method: 'POST' });
      await refresh();
      navigate('/cart');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not add to cart');
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || data.items.length === 0) {
    return <Empty title="No orders yet" hint="Your purchases will show up here."><Link to="/" className="btn-primary">Browse books</Link></Empty>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl">My Orders</h1>
      {message && <p role="status" className="mb-4 text-sm text-ok">{message}</p>}
      <ul className="space-y-6">
        {data.items.map((o) => (
          <li key={o.id} className="panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-semibold">Order #{o.id}</p>
                <p className="text-muted">Placed {shortDate(o.placedAt)} · {inr(o.total)}</p>
              </div>
              <span className={`px-2 py-1 text-xs ${o.status === 'CANCELLED' ? 'bg-danger' : 'bg-ok'}`}>{o.status === 'CANCELLED' ? 'Cancelled' : 'Confirmed'}</span>
            </div>
            <ul className="flex flex-wrap gap-6">
              {o.items.map((i) => (
                <li key={i.bookId} className="flex gap-3 text-sm">
                  <Cover book={{ title: i.title, coverColor: i.coverColor }} className="h-24 w-16" />
                  <div>
                    <Link to={`/books/${i.bookId}`} className="text-base">{i.title}</Link>
                    <p className="text-muted">Qty {i.quantity} · {inr(i.unitPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => buyAgain(o)}>Buy it again</button>
              {o.canCancel && <button className="btn-secondary" onClick={() => cancel(o)}>Cancel order</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
