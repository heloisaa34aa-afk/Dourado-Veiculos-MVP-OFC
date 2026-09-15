import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Header from './Header';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe('Header admin access', () => {
  afterEach(cleanup);

  it('keeps the administrative panel reachable on mobile layouts', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Header userProfile={{ id: 'admin', email: 'admin@example.com', role: 'admin' }} onLogout={vi.fn()} />
        <LocationProbe />
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: 'Abrir painel administrativo' });
    expect(button).not.toHaveClass('hidden');
    fireEvent.click(button);
    expect(screen.getByTestId('location')).toHaveTextContent('/admin');
  });

  it('offers the installed shortcut only to authenticated administrators', () => {
    const { rerender } = render(
      <MemoryRouter>
        <Header userProfile={null} onLogout={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Instalar painel Dourado Admin' })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <Header userProfile={{ id: 'admin', email: 'admin@example.com', role: 'admin' }} onLogout={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Instalar painel Dourado Admin' })).toBeInTheDocument();
  });
});
