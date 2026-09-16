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
    fireEvent.change(screen.getByPlaceholderText('Modelo, versão ou combustível'), { target: { value: 'Corolla' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar no estoque/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/estoque?q=Corolla'));
  });

  it('leva o CTA principal ao catálogo dedicado', async () => {
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="*" element={<><ShowroomHome cars={[]} loading={false} carsError={null} banners={[]} onSelectCar={vi.fn()} onSubmitLead={vi.fn()} /><LocationProbe /></>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Ver carros disponíveis/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/estoque'));
  });

  it('mantém o destaque em fotos sem carregar opção 360 na página inicial', () => {
    const car = {
      id: 'car-1', brand: 'Fiat', model: 'Strada', version: 'Turbo', price: 100000,
      year: '2023', km: 1000, gearbox: 'Automático', fuel: 'Flex', color: 'Branco',
      plateEnd: '1', description: '', images: ['one.jpg', 'two.jpg'], features: [],
      category: 'Picape', isFeatured: true, views: 0, whatsappClicks: 0, createdAt: '2026-01-01',
    } as any;
    render(<MemoryRouter><ShowroomHome cars={[car]} loading={false} carsError={null} banners={[]} onSelectCar={vi.fn()} onSubmitLead={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByRole('img', { name: 'Fiat Strada' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /360/i })).not.toBeInTheDocument();
  });
});
