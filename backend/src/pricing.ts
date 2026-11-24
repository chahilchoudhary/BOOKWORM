import { RULES } from './config/env.js';

export interface CouponRow {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  min_order: number;
  expires_at: string | null;
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

/** The ONE place prices are calculated. All amounts are whole rupees. */
export function computeQuote(
  subtotal: number,
  coupon: CouponRow | null | undefined,
  pointsRequested: number,
  pointsBalance: number,
  now = new Date(),
): Quote {
  let discount = 0;
  let couponError: string | undefined;

  if (coupon) {
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      couponError = 'Coupon has expired';
    } else if (subtotal < coupon.min_order) {
      couponError = `Minimum order ₹${coupon.min_order} required`;
    } else {
      discount =
        coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
      discount = Math.min(discount, subtotal);
    }
  }

  const afterDiscount = subtotal - discount;
  const maxPoints = Math.floor(afterDiscount * RULES.MAX_POINTS_SHARE);
  const pointsUsed = Math.max(0, Math.min(pointsRequested, pointsBalance, maxPoints));

  const taxable = afterDiscount - pointsUsed;
  const tax = Math.round(taxable * RULES.TAX_RATE);
  const delivery = subtotal === 0 || subtotal >= RULES.FREE_DELIVERY_FROM ? 0 : RULES.DELIVERY_FEE;

  return {
    subtotal,
    discount,
    pointsUsed,
    tax,
    delivery,
    total: taxable + tax + delivery,
    ...(couponError ? { couponError } : {}),
  };
}

/** Tentative delivery date (ISO yyyy-mm-dd). eBooks are instant -> null. */
export function deliveryDate(format: string, from = new Date()): string | null {
  if (format === 'eBook') return null;
  const d = new Date(from);
  d.setDate(d.getDate() + RULES.DELIVERY_DAYS);
  return d.toISOString().slice(0, 10);
}

/** True while an order may still be cancelled. */
export function canCancel(status: string, placedAt: string, now = new Date()): boolean {
  if (status !== 'CONFIRMED') return false;
  const ageMs = now.getTime() - new Date(placedAt).getTime();
  return ageMs <= RULES.CANCEL_WINDOW_HOURS * 3600 * 1000;
}

/** Fake payment gateway. Never stores card data. */
export function mockPay(
  method: string,
  d: { cardNumber?: string; upiId?: string },
): { ok: true } | { ok: false; message: string } {
  if (method === 'upi') {
    return /^[\w.-]+@\w+$/.test(d.upiId ?? '')
      ? { ok: true }
      : { ok: false, message: 'Invalid UPI ID' };
  }
  if (method === 'wallet') return { ok: true };
  if (method === 'credit_card' || method === 'debit_card') {
    const n = (d.cardNumber ?? '').replace(/\D/g, '');
    if (!luhn(n)) return { ok: false, message: 'Invalid card number' };
    if (n === '4000000000000002') return { ok: false, message: 'Card declined' };
    return { ok: true };
  }
  return { ok: false, message: 'Unknown payment method' };
}

export function luhn(n: string): boolean {
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
