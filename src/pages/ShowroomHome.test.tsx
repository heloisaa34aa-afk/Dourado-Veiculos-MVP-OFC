import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ShowroomHome from './ShowroomHome';

vi.mock('../components/PublicPromotion', () => ({ PublicPromotion: () => null }));
vi.mock('../components/VehicleMatchQuiz', () => ({ VehicleMatchQuiz: () => null }));

function LocationProbe() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }

describe('ShowroomHome discovery navigation', () => {
  afterEach(cleanup);

  it('leva a busca da Home para o estoque com parâmetros compartilháveis', async () => {
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="*" element={<><ShowroomHome cars={[]} loading={false} carsError={null} banners={[]} onSelectCar={vi.fn()} onSubmitLead={vi.fn()} /><LocationProbe /></>} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Busque por modelo, versão ou combustível'), { target: { value: 'Corolla' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar no estoque/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/estoque?q=Corolla'));
  });

  it('leva o CTA principal ao catálogo dedicado', async () => {
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="*" element={<><ShowroomHome cars={[]} loading={false} carsError={null} banners={[]} onSelectCar={vi.fn()} onSubmitLead={vi.fn()} /><LocationProbe /></>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Ver carros disponíveis/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/estoque'));
  });
});
