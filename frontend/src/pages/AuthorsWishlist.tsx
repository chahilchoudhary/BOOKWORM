import { Link, useParams } from 'react-router-dom';
import { api, type Book } from '../api';
import { useCart } from '../cart';
import { BookCard, Empty, ErrorBox, Spinner } from '../components/ui';
import { useFetch } from '../hooks';

export function AuthorPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useFetch<{ author: { id: number; name: string; bio: string }; books: Book[] }>(`/authors/${id}`);
  if (loading) return <Spinner />;
  if (error) return error === 'Author not found' ? <Empty title="Author not found"><Link to="/" className="btn-primary">Home</Link></Empty> : <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  return (
    <div className="p-4">
      <h1 className="text-2xl">{data.author.name}</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm text-muted">{data.author.bio}</p>
      <h2 className="mb-4 text-xl">Books by {data.author.name}</h2>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.books.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
    </div>
  );
}

/** "My Writers" = authors of the books you have bought. */
export function WritersPage() {
  const { data, error, loading, reload } = useFetch<{ items: { id: number; name: string; bio: string; books: number }[] }>('/auth/me/writers');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || data.items.length === 0) {
    return <Empty title="No writers yet" hint="Authors of books you buy will appear here."><Link to="/" className="btn-primary">Browse books</Link></Empty>;
  }
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl">My Writers</h1>
      <ul className="space-y-4">
        {data.items.map((a) => (
          <li key={a.id} className="panel">
            <Link to={`/authors/${a.id}`} className="text-lg link">{a.name}</Link>
            <p className="text-sm text-muted">{a.bio}</p>
            <p className="mt-1 text-xs">{a.books} book{a.books === 1 ? '' : 's'} bought</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WishlistPage() {
  const { data, error, loading, reload } = useFetch<{ items: Book[] }>('/wishlist');
  const { addOne } = useCart();
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || data.items.length === 0) {
    return <Empty title="Your wishlist is empty" hint="Tap “Add to Wishlist” on any book."><Link to="/" className="btn-primary">Browse books</Link></Empty>;
  }
  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl">My Wishlist</h1>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((b) => (
          <li key={b.id}>
            <BookCard book={b} />
            <div className="mt-3 flex gap-2">
              <button className="btn-primary" disabled={!b.inStock} onClick={() => addOne(b.id)}>Add to Cart</button>
              <button className="btn-secondary" onClick={async () => { await api(`/wishlist/${b.id}`, { method: 'DELETE' }); reload(); }}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
