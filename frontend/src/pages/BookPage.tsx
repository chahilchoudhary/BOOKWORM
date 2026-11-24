import { BookmarkPlus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type Book } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { BookCard, Breadcrumbs, CategoryTags, Cover, Empty, ErrorBox, Spinner, StarInput, Stars } from '../components/ui';
import { deliveryLabel, inr } from '../format';
import { useFetch } from '../hooks';

interface Review {
  id: number;
  rating: number;
  body: string;
  userName: string;
}

function ReviewForm({ bookId, onDone }: { bookId: number; onDone: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return navigate(`/login?next=/books/${bookId}`);
    if (!body.trim()) return setError('Write something');
    if (rating < 1) return setError('Choose a rating');
    setBusy(true);
    setError('');
    try {
      await api(`/books/${bookId}/reviews`, { method: 'POST', body: { rating, body } });
      setBody('');
      setRating(0);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="flex justify-between text-xs text-muted">
        <label htmlFor="review">Leave Your Review</label>
        <span>{body.length}/100</span>
      </div>
      <textarea id="review" className="input h-32" placeholder="Placeholder text" maxLength={100} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex items-center justify-between">
        <StarInput value={rating} onChange={setRating} />
        <button className="btn-primary" disabled={busy}>
          {user ? 'Submit' : 'Log in to review'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}

export function BookPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addOne } = useCart();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');

  const detail = useFetch<{ book: Book; author: { id: number; name: string; bio: string } }>(`/books/${id}`);
  const related = useFetch<{ items: Book[] }>(`/books/${id}/related`);
  const reviews = useFetch<{ items: Review[] }>(`/books/${id}/reviews`);

  if (detail.loading) return <Spinner />;
  if (detail.error) {
    return detail.error === 'Book not found' ? (
      <Empty title="Book not found"><Link to="/" className="btn-primary">Back to home</Link></Empty>
    ) : (
      <ErrorBox message={detail.error} onRetry={detail.reload} />
    );
  }
  if (!detail.data) return null;
  const { book, author } = detail.data;

  async function guard(action: () => Promise<void>, done: string) {
    if (!user) return navigate(`/login?next=/books/${book.id}`);
    try {
      await action();
      setMsg(done);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'Something went wrong');
    }
  }

  return (
    <div className="p-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: book.category, to: `/?category=${encodeURIComponent(book.category)}` }, { label: book.title }]} />

      <div className="lg:flex lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex gap-3">
              <Cover book={{ ...book, author: book.author }} className="h-72 w-48" />
              <div style={{ backgroundColor: book.coverColor }} aria-hidden className="hidden h-72 w-48 p-3 text-[10px] text-neutral-900 sm:block">
                <p className="italic">“{book.description}”</p>
                <p className="mt-3 font-semibold">About the Author</p>
                <p>{author.bio}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h1 className="text-2xl">{book.title}</h1>
              <p>by <Link to={`/authors/${author.id}`} className="link">{author.name}</Link></p>
              <p className="text-muted">{book.description}</p>
              <p>Published by: <Link to={`/?publisher=${encodeURIComponent(book.publisher)}`} className="link">{book.publisher}</Link></p>
              <p className="pt-2">{book.format}</p>
              <CategoryTags tags={book.tags} />
              <p className="pt-3 text-3xl font-semibold">{inr(book.price)}</p>
              <p>{book.inStock ? deliveryLabel(book.deliveryDate) : 'Out of stock'}</p>
              <div className="flex flex-wrap gap-3 pt-3">
                <button className="btn-primary" disabled={!book.inStock} onClick={() => guard(() => addOne(book.id), 'Added to cart')}>
                  Add to Cart <ShoppingCart size={16} />
                </button>
                <button className="btn-secondary" onClick={() => guard(() => api(`/wishlist/${book.id}`, { method: 'PUT' }).then(() => undefined), 'Added to wishlist')}>
                  Add to Wishlist <BookmarkPlus size={16} />
                </button>
              </div>
              <p role="status" className="h-5 text-ok">{msg}</p>
              <dl className="flex flex-wrap gap-8 pt-2">
                <div><dt className="text-xs text-muted">Language</dt><dd>{book.language}</dd></div>
                <div><dt className="text-xs text-muted">Rating</dt><dd>{book.rating ? <Stars value={book.rating} /> : 'No ratings yet'}</dd></div>
                <div><dt className="text-xs text-muted">Sells</dt><dd className="font-semibold">{book.unitsSold} copies sold</dd></div>
              </dl>
            </div>
          </div>

          <section aria-label="About the writer" className="mt-8">
            <h2 className="mb-3 text-xl">About the writer</h2>
            <p className="font-medium">{author.name}</p>
            <p className="text-sm text-muted">{author.bio}</p>
          </section>

          <section aria-label="Reviews" className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xl">Reviews</h2>
              <ReviewForm bookId={book.id} onDone={reviews.reload} />
            </div>
            <div className="space-y-5 pt-9">
              {reviews.data?.items.length === 0 && <p className="text-sm text-muted">No reviews yet. Be the first!</p>}
              {reviews.data?.items.map((r) => (
                <div key={r.id}>
                  <p className="font-medium">{r.userName}</p>
                  <p className="text-sm">{r.body}</p>
                  <Stars value={r.rating} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside aria-label="Related reads" className="mt-8 border-line lg:mt-0 lg:w-80 lg:shrink-0 lg:border-l lg:pl-6">
          <h2 className="mb-4 text-xl">Related Reads</h2>
          <div className="space-y-6">
            {related.data?.items.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
