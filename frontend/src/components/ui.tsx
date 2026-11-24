import { ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Book } from '../api';
import { deliveryLabel, inr } from '../format';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-4 border border-danger bg-panel p-4 text-sm">
      <p>{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="p-10 text-center text-muted">
      <p className="text-lg text-white">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-star text-star' : 'text-neutral-500'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-1"
        >
          <Star size={22} className={n <= value ? 'fill-star text-star' : 'text-neutral-400'} />
        </button>
      ))}
    </div>
  );
}

/** Breadcrumb trail: links separated by chevrons, the last item is the current page. */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="text-link hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-white' : ''}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight size={14} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Stand-in for cover art (no image files): coloured block, simple motif, title and author. */
export function Cover({ book, className = 'h-44 w-28' }: { book: Pick<Book, 'title' | 'coverColor'> & { author?: { name: string } }; className?: string }) {
  const light = isLight(book.coverColor);
  const motif = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)';
  const variant = book.title.length % 3;
  return (
    <div
      role="img"
      aria-label={`Cover of ${book.title}`}
      style={{ backgroundColor: book.coverColor }}
      className={`${className} relative flex shrink-0 flex-col items-center justify-between overflow-hidden p-2 text-center font-bold uppercase leading-tight shadow-md ${light ? 'text-neutral-900' : 'text-white'}`}
    >
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {variant === 0 && <circle cx="50" cy="58" r="26" fill={motif} />}
        {variant === 1 && <path d="M0 100 L100 40 L100 100 Z" fill={motif} />}
        {variant === 2 && <rect x="22" y="38" width="56" height="40" rx="4" fill={motif} />}
      </svg>
      <span className="relative text-[11px] tracking-wide">{book.title}</span>
      {book.author && <span className="relative text-[9px] font-medium tracking-wide">{book.author.name}</span>}
    </div>
  );
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}

export function CategoryTags({ tags }: { tags: string[] }) {
  return (
    <p className="text-xs">
      {tags.map((t, i) => (
        <span key={t}>
          <Link to={`/?q=${encodeURIComponent(t)}`} className="link">
            {t}
          </Link>
          {i < tags.length - 1 && ', '}
        </span>
      ))}
    </p>
  );
}

export function BookCard({ book }: { book: Book }) {
  return (
    <article className="flex h-full gap-4">
      <Link to={`/books/${book.id}`} aria-label={book.title} className="shrink-0 self-start">
        <Cover book={book} className="h-48 w-32" />
      </Link>
      {/* Fixed-height rows so every card in a grid lines up: title(1 line) / author / description(2 lines) / format / tags / price+delivery pinned to the bottom */}
      <div className="flex h-48 min-w-0 flex-1 flex-col text-sm">
        <h3 className="truncate text-lg leading-snug" title={book.title}>
          <Link to={`/books/${book.id}`}>{book.title}</Link>
        </h3>
        <p className="truncate">
          by{' '}
          <Link to={`/authors/${book.author.id}`} className="link">
            {book.author.name}
          </Link>
        </p>
        <p className="mt-1 line-clamp-2 min-h-10 text-muted">{book.description}</p>
        <p className="mt-1">{book.format}</p>
        <div className="truncate">
          <CategoryTags tags={book.tags} />
        </div>
        <div className="mt-auto">
          <p className="text-xl font-semibold leading-tight">{inr(book.price)}</p>
          <p className="text-xs">{book.inStock ? deliveryLabel(book.deliveryDate) : 'Out of stock'}</p>
        </div>
      </div>
    </article>
  );
}
