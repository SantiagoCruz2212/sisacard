import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PokerTable } from '@/features/room/components/poker-table';

describe('PokerTable', () => {
  it('está hecha de polígonos (madera, riel, paño y fichas)', () => {
    const { container } = render(<PokerTable />);
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(90);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('el paño usa el color del tema, no un color fijo', () => {
    const { container } = render(<PokerTable />);
    const fills = [...container.querySelectorAll('polygon')].map((p) => p.getAttribute('style') ?? '');
    expect(fills.some((f) => f.includes('--color-table)'))).toBe(true);
    expect(fills.some((f) => f.includes('--color-table-edge'))).toBe(true);
  });
});
