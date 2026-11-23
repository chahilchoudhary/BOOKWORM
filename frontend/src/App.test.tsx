import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the Book Worm placeholder heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Book Worm' })).toBeTruthy();
  });
});
