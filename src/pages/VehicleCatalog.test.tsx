import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { Car } from '../types';
import VehicleCatalog from './VehicleCatalog';

const cars: Car[] = [
  { id: 'pulse', brand: 'Fiat', model: 'Pulse', version: 'Drive', price: 90000, year: '2023/2024', km: 22000, gearbox: 'Automático', fuel: 'Flex', color: 'Cinza', plateEnd: '5', description: '', images: [], features: [], category: 'SUV', views: 0, whatsappClicks: 0, createdAt: '2026-08-10T10:00:00Z' },
  { id: 'argo', brand: 'Fiat', model: 'Argo', version: 'Trekking', price: 70000, year: '2022', km: 60000, gearbox: 'Manual', fuel: 'Flex', color: 'Branco', plateEnd: '2', description: '', images: [], features: [], category: 'Hatch', views: 0, whatsappClicks: 0, createdAt: '2026-08-11T10:00:00Z' },
];

function LocationProbe() { return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>; }

function CatalogHarness({ initial = '/estoque' }: { initial?: string }) {
  return <MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="*" element={<HarnessRoutes />} />
  </Routes></MemoryRouter>;
}

function HarnessRoutes() {
  const navigate = useNavigate();
  return <><Routes><Route path="/estoque" element={<VehicleCatalog cars={cars} loading={false} error={null} onSelectCar={selected => navigate(`/veiculo/${selected.id}`)} />} /><Route path="/veiculo/:id" element={<h1>Detalhe aberto</h1>} /></Routes><LocationProbe /></>;
}

describe('VehicleCatalog', () => {
  afterEach(cleanup);

  it('restaura filtros pela URL', () => {
    render(<CatalogHarness initial="/estoque?q=pulse&categoria=SUV" />);
    expect(screen.getByDisplayValue('pulse')).toBeInTheDocument();
    expect(screen.getByText('Pulse')).toBeInTheDocument();
    expect(screen.queryByText('Argo')).not.toBeInTheDocument();
  });

  it('atualiza a URL ao filtrar e mantém o resultado coerente', async () => {
    render(<CatalogHarness />);
    fireEvent.change(screen.getByLabelText('Buscar veículos'), { target: { value: 'Argo' } });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/estoque?q=Argo'));
    expect(screen.getByText('Argo')).toBeInTheDocument();
    expect(screen.queryByText('Pulse')).not.toBeInTheDocument();
  });

  it('navega do estoque para o detalhe do veículo', async () => {
    render(<CatalogHarness />);
    fireEvent.click(screen.getByText('Pulse'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/veiculo/pulse'));
    expect(screen.getByText('Detalhe aberto')).toBeInTheDocument();
  });

  it('abre os filtros no fluxo mobile', () => {
    render(<CatalogHarness />);
    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    expect(screen.getByRole('dialog', { name: 'Filtros do estoque' })).toBeInTheDocument();
  });

  it('mostra um estado vazio útil quando não há resultados', () => {
    render(<MemoryRouter initialEntries={['/estoque']}><VehicleCatalog cars={[]} loading={false} error={null} onSelectCar={() => {}} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Nenhum veículo encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver estoque completo' })).toBeInTheDocument();
  });
});
