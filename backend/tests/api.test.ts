import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';

const app = createApp();
let token = '';
const auth = () => ({ Authorization: `Bearer ${token}` });

const address = {
  firstName: 'A', lastName: 'B', email: 'a@b.co', line1: '1 Road', city: 'Pune',
  state: 'MH', pin: '411001', country: 'India', phone: '9876543210',
};

beforeAll(async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'new@bookworm.test', password: 'Password123!' });
  token = res.body.token;
});

describe('auth', () => {
  it('rejects bad password and duplicate/weak registration', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'new@bookworm.test', password: 'nope' })).status).toBe(401);
    expect((await request(app).post('/api/auth/register').send({ name: 'x', email: 'new@bookworm.test', password: 'Password123!' })).status).toBe(409);
    expect((await request(app).post('/api/auth/register').send({ name: 'x', email: 'z@z.co', password: 'short' })).status).toBe(400);
  });
  it('/me needs a token and never leaks the hash', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const res = await request(app).get('/api/auth/me').set(auth());
    expect(res.body.user.email).toBe('new@bookworm.test');
    expect(JSON.stringify(res.body)).not.toMatch(/password/);
  });
});

describe('catalogue', () => {
  it('lists, filters, sorts and paginates', async () => {
    const all = await request(app).get('/api/books?pageSize=5');
    expect(all.body.items).toHaveLength(5);
    expect(all.body.total).toBeGreaterThanOrEqual(20);
    const cat = await request(app).get('/api/books?category=Mystery');
    expect(cat.body.items.every((b: { category: string }) => b.category === 'Mystery')).toBe(true);
    const cheap = await request(app).get('/api/books?sort=priceAsc&pageSize=3');
    expect(cheap.body.items[0].price).toBeLessThanOrEqual(cheap.body.items[1].price);
    expect((await request(app).get('/api/books?q=minimalism')).body.items[0].title).toBe('Joy of Minimalism');
    expect((await request(app).get('/api/books?pageSize=500')).status).toBe(400);
  });
  it('shelves have 3 books each; detail and related work; 404 for unknown', async () => {
    const s = await request(app).get('/api/books/shelves');
    expect(s.body.recommended).toHaveLength(3);
    const d = await request(app).get('/api/books/7');
    expect(d.body.book.title).toBe('Joy of Minimalism');
    const rel = await request(app).get('/api/books/7/related');
    expect(rel.body.items).toHaveLength(3);
    expect(rel.body.items.some((b: { id: number }) => b.id === 7)).toBe(false);
    expect((await request(app).get('/api/books/9999')).status).toBe(404);
  });
  it('reviews: validation and one per user', async () => {
    expect((await request(app).post('/api/books/3/reviews').send({ rating: 5, body: 'x' })).status).toBe(401);
    expect((await request(app).post('/api/books/3/reviews').set(auth()).send({ rating: 5, body: 'x'.repeat(101) })).status).toBe(400);
    expect((await request(app).post('/api/books/3/reviews').set(auth()).send({ rating: 5, body: 'Great' })).status).toBe(201);
    expect((await request(app).post('/api/books/3/reviews').set(auth()).send({ rating: 4, body: 'Again' })).status).toBe(409);
  });
});

describe('cart -> checkout -> cancel', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/cart')).status).toBe(401);
  });

  it('full purchase flow with server-side totals', async () => {
    await request(app).put('/api/cart/items/7').set(auth()).send({ quantity: 1 }); // 149
    const cart = await request(app).put('/api/cart/items/3').set(auth()).send({ quantity: 1 }); // 359
    expect(cart.body.quote.subtotal).toBe(508);
    expect((await request(app).put('/api/cart/items/3').set(auth()).send({ quantity: 11 })).status).toBe(400);

    const quote = await request(app).post('/api/cart/quote').set(auth()).send({ couponCode: 'welcome100' });
    expect(quote.body.quote.discount).toBe(100);
    expect((await request(app).post('/api/cart/quote').set(auth()).send({ couponCode: 'NOPE' })).body.quote.couponError).toBe('Invalid coupon code');

    const stockBefore = (db.prepare('SELECT stock FROM books WHERE id = 7').get() as { stock: number }).stock;

    // declined card: cart stays, nothing created
    const declined = await request(app).post('/api/orders').set(auth()).send({ address, payment: { method: 'credit_card', cardNumber: '4000 0000 0000 0002' } });
    expect(declined.status).toBe(402);
    expect((await request(app).get('/api/cart').set(auth())).body.items).toHaveLength(2);

    // success
    const ok = await request(app).post('/api/orders').set(auth()).send({ address, couponCode: 'WELCOME100', payment: { method: 'credit_card', cardNumber: '4111 1111 1111 1111' } });
    expect(ok.status).toBe(201);
    expect(ok.body.order.total).toBe(quote.body.quote.total);
    expect(ok.body.order.canCancel).toBe(true);
    expect((await request(app).get('/api/cart').set(auth())).body.items).toHaveLength(0);
    expect((db.prepare('SELECT stock FROM books WHERE id = 7').get() as { stock: number }).stock).toBe(stockBefore - 1);

    // cancel restores stock, then can't cancel twice
    const id = ok.body.order.id;
    expect((await request(app).post(`/api/orders/${id}/cancel`).set(auth())).body.order.status).toBe('CANCELLED');
    expect((db.prepare('SELECT stock FROM books WHERE id = 7').get() as { stock: number }).stock).toBe(stockBefore);
    expect((await request(app).post(`/api/orders/${id}/cancel`).set(auth())).status).toBe(409);

    // buy it again refills the cart
    const again = await request(app).post(`/api/orders/${id}/buy-again`).set(auth());
    expect(again.body.items).toHaveLength(2);
  });

  it('cannot cancel after 48h, and cannot see another user\'s order', async () => {
    const demo = (await request(app).post('/api/auth/login').send({ email: 'demo@bookworm.test', password: 'Password123!' })).body.token as string;
    const orders = await request(app).get('/api/orders').set({ Authorization: `Bearer ${demo}` });
    const old = orders.body.items.find((o: { canCancel: boolean }) => !o.canCancel);
    expect(old).toBeTruthy(); // the 10-day-old seeded order
    expect((await request(app).post(`/api/orders/${old.id}/cancel`).set({ Authorization: `Bearer ${demo}` })).status).toBe(409);
    expect((await request(app).get(`/api/orders/${old.id}`).set(auth())).status).toBe(404);
  });

  it('empty cart cannot check out', async () => {
    await request(app).delete('/api/cart/items/7').set(auth());
    await request(app).delete('/api/cart/items/3').set(auth());
    const res = await request(app).post('/api/orders').set(auth()).send({ address, payment: { method: 'wallet' } });
    expect(res.status).toBe(400);
  });
});
