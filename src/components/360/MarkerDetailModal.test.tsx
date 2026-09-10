import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkerDetailModal } from './MarkerDetailModal';

describe('MarkerDetailModal', () => {
  it('renders an enlarged contained preview instead of a full-screen image', () => {
    const { container } = render(
      <MarkerDetailModal 
        isOpen={true} 
        onClose={() => {}} 
        type="poi" 
        title="Test Modal" 
        images={[{ url: 'img1.jpg', order: 0 }]} 
      />
    );
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByRole('dialog').className).toContain('max-w-4xl');
    expect(screen.getByRole('dialog').className).not.toContain('h-full');
    expect(screen.getByRole('button', { name: 'Fechar detalhes' })).toBeDefined();
  });
});
