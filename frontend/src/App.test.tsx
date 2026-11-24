import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthProvider } from './auth';
import { CartProvider } from './cart';
import { emptyAddress, formatCard, luhn, shortDate, validExpiry, validateAddress } from './format';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('routing', () => {
  it('sends a guest from /cart to the login page', async () => {
    renderAt('/cart');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
  });

  it('shows the navbar links and a not-found page', () => {
    renderAt('/nope');
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    expect(screen.getByText('Book Worm')).toBeTruthy();
    expect(screen.getAllByText('My Orders').length).toBeGreaterThan(0);
    expect(screen.getByText('Page not found')).toBeTruthy();
  });

  it('shows a friendly error when the server is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderAt('/');
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Cannot reach the server/).length).toBeGreaterThan(0);
  });
});

describe('format helpers', () => {
  it('formats dates like the wireframe', () => {
    expect(shortDate('2025-07-21')).toBe('Mon, 21 Jul');
  });
  it('validates cards and expiry', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4111 1111 1111 1112')).toBe(false);
    expect(formatCard('4111111111111111')).toBe('4111-1111-1111-1111');
    const now = new Date('2026-06-15');
    expect(validExpiry('06/2026', now)).toBe(true);
    expect(validExpiry('05/2026', now)).toBe(false);
    expect(validExpiry('13/2030', now)).toBe(false);
  });
  it('validates every address rule', () => {
    expect(Object.keys(validateAddress(emptyAddress))).toEqual(expect.arrayContaining(['firstName', 'email', 'pin', 'phone', 'city', 'state', 'line1']));
    const good = { ...emptyAddress, firstName: 'A', lastName: 'B', email: 'a@b.co', line1: '1 St', city: 'X', state: 'Y', pin: '123456', phone: '1234567890' };
    expect(validateAddress(good)).toEqual({});
    expect(validateAddress({ ...good, pin: '123' }).pin).toBeTruthy();
    expect(validateAddress({ ...good, phone: '12345' }).phone).toBeTruthy();
  });
});
