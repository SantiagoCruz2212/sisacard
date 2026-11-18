import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CLOTHES_STYLES, EYE_STYLES, HAIR_STYLES, MOUTH_STYLES, randomAvatar, type Avatar } from '@/shared/models/avatar';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';

const base: Avatar = { hair: 'short', hairColor: 0, skin: 0, eyes: 'normal', eyeColor: 0, mouth: 'smile', clothes: 'tshirt', clothesColor: 0 };

describe('LowPolyAvatar', () => {
  it.each([
    ['pelo', HAIR_STYLES, 'hair'],
    ['ojos', EYE_STYLES, 'eyes'],
    ['boca', MOUTH_STYLES, 'mouth'],
    ['ropa', CLOTHES_STYLES, 'clothes'],
  ] as const)('dibuja todos los estilos de %s', (_name, styles, key) => {
    for (const style of styles) {
      const { container, unmount } = render(<LowPolyAvatar avatar={{ ...base, [key]: style }} />);
      expect(container.querySelectorAll('polygon').length).toBeGreaterThan(10);
      unmount();
    }
  });

  it('cambiar el color de piel cambia el relleno de la cabeza', () => {
    const fill = (skin: number) =>
      render(<LowPolyAvatar avatar={{ ...base, skin }} />).container.querySelector('polygon[points^="50,14"]')?.getAttribute('fill');
    expect(fill(0)).not.toBe(fill(5));
  });

  it('un personaje aleatorio siempre es dibujable', () => {
    for (let i = 0; i < 25; i++) {
      const { container, unmount } = render(<LowPolyAvatar avatar={randomAvatar()} />);
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });
});
