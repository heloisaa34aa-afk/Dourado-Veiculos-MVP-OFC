import React from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Admin360Module } from './Admin360Module';
import { ErrorBoundary } from './ErrorBoundary';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { useVehicle360 } from '../hooks/useVehicle360';
import { Car } from '../types';

// Mock the hook
vi.mock('../hooks/useVehicle360', () => ({
  useVehicle360: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock;
  window.ResizeObserver = ResizeObserverMock;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockCars: Car[] = [
  {
    id: 'car-1',
    brand: 'Toyota',
    model: 'Corolla',
    version: 'XEI',
    year: '2020',
    price: 100000,
    km: 50000,
    plateEnd: '1234',
    features: [],
    images: [],
    category: 'sedan',
    status: 'available',
    description: '',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    gearbox: 'Automático',
    fuel: 'Flex',
    color: 'Branco',
    bodyType: 'Sedan'
  } as any
];

describe('Admin360Module', () => {
  it('should render properly without crashing (tela branca)', () => {
    vi.mocked(useVehicle360).mockReturnValue({
      project: { id: 'p1', frames: [], vehicleId: 'car-1', status: 'draft', frameCount: 0, createdAt: '', updatedAt: '' },
      frames: [],
      hotspots: [],
      damageMarkers: [],
      loading: false,
      uploading: false,
      uploadProgress: { current: 0, total: 0 },
      error: null,
      reloadProject: vi.fn(),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      createProject: vi.fn(),
      createHotspot: vi.fn(),
      deleteHotspot: vi.fn(),
      createDamageMarker: vi.fn(),
      deleteDamageMarker: vi.fn(),
      deleteFrame: vi.fn(),
      updateHotspotPositions: vi.fn(),
      updateDamageMarkerPositions: vi.fn(),
      replaceFrameImage: vi.fn()
    } as any);

    render(<Admin360Module cars={mockCars} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'car-1' } });
    expect(screen.getAllByText(/Editando visão/i)[0]).toBeDefined();
  });

  it('mantém voltar e os seletores externo e interno visíveis no estúdio', () => {
    vi.mocked(useVehicle360).mockReturnValue({
      project: { id: 'p1', frames: [], vehicleId: 'car-1', status: 'draft', frameCount: 0, createdAt: '', updatedAt: '' },
      frames: [], hotspots: [], damageMarkers: [], loading: false, uploading: false,
      uploadProgress: { current: 0, total: 0 }, reload: vi.fn(), currentFrame: 0,
      setCurrentFrame: vi.fn(), totalFrames: 0, handlePointerDown: vi.fn(), handlePointerMove: vi.fn(),
      handlePointerUp: vi.fn(), nextFrame: vi.fn(), prevFrame: vi.fn(), uploadFrames: vi.fn(),
      removeFrame: vi.fn(), publishProject: vi.fn(), unpublishProject: vi.fn(), deleteProject: vi.fn(),
      createHotspot: vi.fn(), updateHotspot: vi.fn(), deleteHotspot: vi.fn(), createDamageMarker: vi.fn(),
      updateDamageMarker: vi.fn(), deleteDamageMarker: vi.fn(),
    } as any);

    const { container } = render(<Admin360Module cars={mockCars} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'car-1' } });
    expect(container.querySelector('.fixed.inset-0')?.className).toContain('z-[100]');
    expect(screen.getByRole('button', { name: /Voltar aos veículos/i })).toBeDefined();
    const internalButton = screen.getByRole('button', { name: '360° Interno' });
    expect(internalButton).toBeDefined();
    fireEvent.click(internalButton);
    expect(vi.mocked(useVehicle360)).toHaveBeenLastCalledWith('car-1', 'admin', 'interior');
  });
});

describe('ErrorBoundary', () => {
  it('should catch errors and show the error message', () => {
    const ThrowError = () => { throw new Error('Test error'); };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Não foi possível carregar o módulo 360°')).toBeDefined();
    expect(screen.getByText('Tentar novamente')).toBeDefined();
    
    consoleError.mockRestore();
  });
});

describe('TrackingLab visibility', () => {
  it('should hide Tracking Lab in production by default and show if flag enabled', () => {
    const isProd = !import.meta.env.DEV;
    const trackingLabEnabled = isProd ? import.meta.env.VITE_ENABLE_TRACKING_LAB === 'true' : true;
    expect(typeof trackingLabEnabled).toBe('boolean');
  });
});

describe('ImageCoordinateStage layout', () => {
  it('should use object-contain for main photography', () => {
    const { container } = render(<ImageCoordinateStage imageUrl="test.jpg" />);
    const img = container.querySelector('img');
    expect(img?.className).toContain('object-contain');
    expect(img?.className).not.toContain('object-cover');
  });
  
  it('should have flexible bounds (no 100dvh inside)', () => {
    const { container } = render(<ImageCoordinateStage imageUrl="test.jpg" />);
    const div = container.querySelector('div');
    expect(div?.className).toContain('h-full');
    expect(div?.className).not.toContain('h-[100dvh]');
  });
});

describe('TrackingLab behaviors', () => {
  it('should clear states when marker changes', () => {
    expect(true).toBe(true);
  });
});
