// Types mirror the backend JSON. Money is whole rupees.
export interface Book {
  id: number;
  title: string;
  description: string;
  author: { id: number; name: string };
  publisher: string;
  category: string;
  tags: string[];
  format: string;
  language: string;
  price: number;
  inStock: boolean;
  unitsSold: number;
  rating: number;
  coverColor: string;
  deliveryDate: string | null;
}

export interface Quote {
  subtotal: number;
  discount: number;
  pointsUsed: number;
  tax: number;
  delivery: number;
  total: number;
  couponError?: string;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface CartResponse {
  items: CartItem[];
  quote: Quote;
  pointsBalance: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  phone: string;
  phoneCode: string;
}

export interface OrderItem {
  bookId: number;
  quantity: number;
  unitPrice: number;
  title: string;
  coverColor: string;
  format: string;
  authorName: string;
  authorId: number;
  deliveryDate: string | null;
}

export interface Order {
  id: number;
  status: 'CONFIRMED' | 'CANCELLED';
  total: number;
  placedAt: string;
  canCancel: boolean;
  items: OrderItem[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  points: number;
}

const TOKEN_KEY = 'bw_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: user simply stays logged out after refresh */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong');
  return data as T;
}
