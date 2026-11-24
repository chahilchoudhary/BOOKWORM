import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Book } from '../api';
import { useAuth } from '../auth';
import { BookCard, Empty, ErrorBox, Spinner } from '../components/ui';
import { useFetch } from '../hooks';

const PRICE_RANGES: Record<string, { label: string; min?: number; max?: number }> = {
  '': { label: 'All' },
  u200: { label: 'Under ₹200', max: 199 },
  '200-400': { label: '₹200 – ₹400', min: 200, max: 400 },
  o400: { label: 'Over ₹400', min: 401 },
};

const SORTS = [
  ['relevance', 'Relevance'],
  ['priceAsc', 'Price: low to high'],
  ['priceDesc', 'Price: high to low'],
  ['newest', 'Newest'],
  ['rating', 'Rating'],
];

interface Shelves {
  recommended: Book[];
  bestsellers: Book[];
  newLaunches: Book[];
}
interface List {
  items: Book[];
  page: number;
  pageSize: number;
  total: number;
}

function Shelf({ title, books }: { title: string; books: Book[] }) {
  return (
    <section aria-label={title} className="mb-8">
      <h2 className="mb-4 text-xl">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const get = (k: string) => params.get(k) ?? '';

  const categories = useFetch<{ categories: string[] }>('/categories');
  const publishers = useFetch<{ publishers: string[] }>('/publishers');

  // search box has its own state so we only hit the server after the user pauses typing
  const [text, setText] = useState(get('q'));
  useEffect(() => setText(get('q')), [params.get('q')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== get('q')) update({ q: text, page: '' });
    }, 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next);
  }

  const filtersActive = ['category', 'q', 'language', 'format', 'publisher', 'price'].some((k) => get(k)) || (get('sort') && get('sort') !== 'relevance');

  const range = PRICE_RANGES[get('price')] ?? PRICE_RANGES['']!;
  const query = new URLSearchParams();
  for (const k of ['q', 'category', 'language', 'format', 'publisher']) if (get(k)) query.set(k, get(k));
  if (range.min !== undefined) query.set('min', String(range.min));
  if (range.max !== undefined) query.set('max', String(range.max));
  if (get('sort')) query.set('sort', get('sort'));
  query.set('page', get('page') || '1');

  const shelves = useFetch<Shelves>(filtersActive ? null : '/books/shelves', user?.id);
  const list = useFetch<List>(filtersActive ? `/books?${query}` : null);
  const active = filtersActive ? list : shelves;

  const page = Number(get('page') || 1);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const selectedCategory = get('category');

  return (
    <div className="md:flex md:h-[calc(100vh-3rem)] md:overflow-hidden">
      <aside aria-label="Categories" className="border-line md:scroll-area md:w-56 md:shrink-0 md:border-r">
        <div className="p-3 md:hidden">
          <label className="label" htmlFor="cat-mobile">Category</label>
          <select id="cat-mobile" className="input" value={selectedCategory} onChange={(e) => update({ category: e.target.value, page: '' })}>
            <option value="">All</option>
            {categories.data?.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <ul className="hidden md:block">
          {['', ...(categories.data?.categories ?? [])].map((c) => (
            <li key={c || 'all'}>
              <button
                onClick={() => update({ category: c, page: '' })}
                aria-current={selectedCategory === c ? 'true' : undefined}
                className={`block w-full border-l-4 px-3 py-2 text-left text-sm font-medium ${
                  selectedCategory === c ? 'border-primary bg-field' : 'border-transparent hover:bg-panel'
                }`}
              >
                {c || 'All'}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-w-0 flex-1 p-4 md:scroll-area">
        <form role="search" className="mb-8 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="label truncate" htmlFor="q">Search you want to read here</label>
            <div className="relative">
              <input id="q" className="input pr-10" placeholder="Search" value={text} onChange={(e) => setText(e.target.value)} />
              <Search size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="language">Language</label>
            <select id="language" className="input" value={get('language')} onChange={(e) => update({ language: e.target.value, page: '' })}>
              <option value="">All</option>
              <option>English</option>
            </select>
          </div>
          <div>
            <label className="label truncate" htmlFor="format">Format</label>
            <select id="format" className="input" value={get('format')} onChange={(e) => update({ format: e.target.value, page: '' })}>
              <option value="">All</option>
              <option>Paperback</option>
              <option>Hardcover</option>
              <option>eBook</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="publisher">Publisher</label>
            <select id="publisher" className="input" value={get('publisher')} onChange={(e) => update({ publisher: e.target.value, page: '' })}>
              <option value="">All</option>
              {publishers.data?.publishers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="price">Price Range</label>
            <select id="price" className="input" value={get('price')} onChange={(e) => update({ price: e.target.value, page: '' })}>
              {Object.entries(PRICE_RANGES).map(([k, r]) => (
                <option key={k} value={k}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sort">Sort by</label>
            <select id="sort" className="input" value={get('sort') || 'relevance'} onChange={(e) => update({ sort: e.target.value === 'relevance' ? '' : e.target.value, page: '' })}>
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </form>

        {active.loading && <Spinner />}
        {active.error && <ErrorBox message={active.error} onRetry={active.reload} />}

        {!filtersActive && shelves.data && (
          <>
            <Shelf title="Recommended for You" books={shelves.data.recommended} />
            <Shelf title="Bestsellers this Month" books={shelves.data.bestsellers} />
            <Shelf title="New Launches" books={shelves.data.newLaunches} />
          </>
        )}

        {filtersActive && list.data && (
          <>
            <p className="mb-4 text-sm text-muted">{list.data.total} book{list.data.total === 1 ? '' : 's'} found</p>
            {list.data.items.length === 0 ? (
              <Empty title="No books match your search" hint="Try removing a filter.">
                <button className="btn-secondary" onClick={() => setParams({})}>Clear filters</button>
              </Empty>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {list.data.items.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            )}
            {pages > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4 text-sm">
                <button className="btn-secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</button>
                <span>Page {page} of {pages}</span>
                <button className="btn-secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Next</button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
