import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/shared/config/i18n';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import { PrivacyToggle } from '@/shared/ui/privacy-toggle';

describe('PrivacyToggle', () => {
  beforeAll(() => i18n.changeLanguage('es'));
  beforeEach(() => usePrivacyStore.setState({ hidden: false }));

  it('el botón alterna entre ocultar y mostrar', () => {
    render(<PrivacyToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(usePrivacyStore.getState().hidden).toBe(true);
    fireEvent.click(screen.getByRole('button'));
    expect(usePrivacyStore.getState().hidden).toBe(false);
  });

  it('la tecla H alterna, sin importar mayúsculas', () => {
    render(<PrivacyToggle />);
    fireEvent.keyDown(window, { key: 'h' });
    expect(usePrivacyStore.getState().hidden).toBe(true);
    fireEvent.keyDown(window, { key: 'H' });
    expect(usePrivacyStore.getState().hidden).toBe(false);
  });

  it('la tecla H no actúa mientras se escribe en un campo (p. ej. el chat)', () => {
    render(
      <>
        <PrivacyToggle />
        <input aria-label="chat" />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('chat'), { key: 'h' });
    expect(usePrivacyStore.getState().hidden).toBe(false);
  });

  it('Ctrl+H no se interpreta como el atajo', () => {
    render(<PrivacyToggle />);
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true });
    expect(usePrivacyStore.getState().hidden).toBe(false);
  });
});
