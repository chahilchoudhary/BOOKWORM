import type { Address } from './api';

export const inr = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon, 21 Jul" from an ISO date (yyyy-mm-dd or full timestamp). */
export function shortDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
}

export const deliveryLabel = (iso: string | null): string =>
  iso ? `Delivery by ${shortDate(iso)}` : 'Available instantly';

export function luhn(input: string): boolean {
  const n = input.replace(/\D/g, '');
  if (n.length < 12) return false;
  let sum = 0;
  let dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let digit = Number(n[i]);
    if (dbl) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** "4111111111111111" -> "4111-1111-1111-1111" */
export const formatCard = (v: string): string =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1-');

/** MM/YYYY that is not in the past. */
export function validExpiry(v: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export const emptyAddress: Address = {
  firstName: '',
  lastName: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pin: '',
  country: 'India',
  phone: '',
  phoneCode: '+91',
};

/** Returns {field: message} for every invalid field (empty object = valid). */
export function validateAddress(a: Address): Partial<Record<keyof Address, string>> {
  const e: Partial<Record<keyof Address, string>> = {};
  if (!a.firstName.trim()) e.firstName = 'First name is required';
  if (!a.lastName.trim()) e.lastName = 'Last name is required';
  if (!/^\S+@\S+\.\S+$/.test(a.email)) e.email = 'Enter a valid email';
  if (!a.line1.trim()) e.line1 = 'Address is required';
  if (!a.city.trim()) e.city = 'City is required';
  if (!a.state.trim()) e.state = 'State is required';
  if (!/^\d{6}$/.test(a.pin)) e.pin = 'Pin must be 6 digits';
  if (!/^\d{10}$/.test(a.phone)) e.phone = 'Phone must be 10 digits';
  if (!a.country.trim()) e.country = 'Country is required';
  return e;
}
