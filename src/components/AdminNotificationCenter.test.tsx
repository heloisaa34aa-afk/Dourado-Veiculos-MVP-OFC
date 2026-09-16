import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminNotificationCenter } from './AdminNotificationCenter';

vi.mock('../services/adminNotification.service', () => ({
  adminNotificationService: {
    listRecent: vi.fn().mockResolvedValue([{
      id: 'notice-1', eventType: 'quote', title: 'Nova simulação de financiamento',
      message: 'Ruben solicitou condições para Fiat Strada.', customerName: 'Ruben',
      customerPhone: '71999999999', vehicleTitle: 'Fiat Strada', targetSection: 'quotes',
      createdAt: '2026-09-16T12:00:00Z',
    }]),
    subscribe: vi.fn(() => () => undefined),
  },
}));

class NotificationMock {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(async () => {
    NotificationMock.permission = 'granted';
    return 'granted' as NotificationPermission;
  });
}

describe('AdminNotificationCenter', () => {
  beforeEach(() => {
    localStorage.clear();
    NotificationMock.permission = 'default';
    Object.defineProperty(globalThis, 'Notification', { configurable: true, value: NotificationMock });
  });
  afterEach(cleanup);

  it('detalha a notificação e abre a área administrativa correspondente', async () => {
    const onOpen = vi.fn();
    render(<AdminNotificationCenter onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Notificações administrativas/i }));
    expect(await screen.findByText('Nova simulação de financiamento')).toBeInTheDocument();
    expect(screen.getByText('Ruben solicitou condições para Fiat Strada.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Nova simulação de financiamento'));
    expect(onOpen).toHaveBeenCalledWith('quotes');
  });

  it('permite ativar alertas do navegador', async () => {
    render(<AdminNotificationCenter onOpen={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Notificações administrativas/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ativar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ativadas' })).toBeInTheDocument());
    expect(localStorage.getItem('dourado-admin-browser-notifications')).toBe('true');
  });
});
