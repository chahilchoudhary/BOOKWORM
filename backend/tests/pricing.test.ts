import { describe, expect, it } from 'vitest';
import { canCancel, computeQuote, deliveryDate, luhn, mockPay, type CouponRow } from '../src/pricing.js';

const flat: CouponRow = { code: 'F', type: 'flat', value: 100, min_order: 300, expires_at: null };
const pct: CouponRow = { code: 'P', type: 'percent', value: 10, min_order: 0, expires_at: null };

describe('computeQuote', () => {
  it('adds 12% tax and charges delivery under ₹300', () => {
    const q = computeQuote(200, null, 0, 0);
    expect(q).toMatchObject({ tax: 24, delivery: 40, total: 264 });
  });
  it('free delivery from ₹300', () => {
    expect(computeQuote(300, null, 0, 0).delivery).toBe(0);
  });
  it('flat coupon', () => {
    const q = computeQuote(508, flat, 0, 0);
    expect(q.discount).toBe(100);
    expect(q.total).toBe(408 + 49); // tax round(408*0.12)=49
  });
  it('percent coupon', () => {
    expect(computeQuote(500, pct, 0, 0).discount).toBe(50);
  });
  it('rejects coupon under minimum order', () => {
    const q = computeQuote(200, flat, 0, 0);
    expect(q.discount).toBe(0);
    expect(q.couponError).toMatch(/Minimum/);
  });
  it('rejects expired coupon', () => {
    const q = computeQuote(500, { ...flat, expires_at: '2020-01-01' }, 0, 0);
    expect(q.couponError).toMatch(/expired/);
  });
  it('caps points at 20% of the amount and at the balance', () => {
    expect(computeQuote(1000, null, 999, 999).pointsUsed).toBe(200);
    expect(computeQuote(1000, null, 999, 50).pointsUsed).toBe(50);
  });
  it('empty cart is all zeros', () => {
    expect(computeQuote(0, null, 0, 0).total).toBe(0);
  });
});

describe('helpers', () => {
  it('eBooks have no delivery date, others are +5 days', () => {
    expect(deliveryDate('eBook')).toBeNull();
    expect(deliveryDate('Paperback', new Date('2025-07-16T00:00:00Z'))).toBe('2025-07-21');
  });
  it('cancel window is 48 hours', () => {
    const placed = '2025-01-01T00:00:00Z';
    expect(canCancel('CONFIRMED', placed, new Date('2025-01-02T23:59:00Z'))).toBe(true);
    expect(canCancel('CONFIRMED', placed, new Date('2025-01-03T00:01:00Z'))).toBe(false);
    expect(canCancel('CANCELLED', placed, new Date('2025-01-01T01:00:00Z'))).toBe(false);
  });
  it('luhn and mock gateway', () => {
    expect(luhn('4111111111111111')).toBe(true);
    expect(luhn('4111111111111112')).toBe(false);
    expect(mockPay('credit_card', { cardNumber: '4111 1111 1111 1111' }).ok).toBe(true);
    expect(mockPay('credit_card', { cardNumber: '4000 0000 0000 0002' })).toMatchObject({ ok: false });
    expect(mockPay('upi', { upiId: 'bad' }).ok).toBe(false);
  });
});
