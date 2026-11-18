import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ACCESSORY_STYLES,
  BEARD_STYLES,
  CLOTHES_STYLES,
  DEFAULT_HUMAN,
  EYE_STYLES,
  GLASSES_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  MOUTH_STYLES,
  VEHICLES,
  randomAvatar,
  randomHuman,
} from '@/shared/models/avatar';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';

const polygons = (ui: React.ReactElement) => {
  const { container, unmount } = render(ui);
  const count = container.querySelectorAll('polygon').length;
  unmount();
  return count;
};

describe('LowPolyAvatar', () => {
  it.each([
    ['pelo', HAIR_STYLES, 'hair'],
    ['ojos', EYE_STYLES, 'eyes'],
    ['boca', MOUTH_STYLES, 'mouth'],
    ['ropa', CLOTHES_STYLES, 'clothes'],
    ['sombrero', HAT_STYLES, 'hat'],
    ['lentes', GLASSES_STYLES, 'glasses'],
    ['accesorio', ACCESSORY_STYLES, 'accessory'],
  ] as const)('dibuja todos los estilos de %s', (_name, styles, key) => {
    for (const style of styles) {
      expect(polygons(<LowPolyAvatar avatar={{ ...DEFAULT_HUMAN, [key]: style }} />)).toBeGreaterThan(10);
    }
  });

  it('dibuja todas las barbas en hombres y en mujeres', () => {
    for (const sex of ['male', 'female'] as const)
      for (const beard of BEARD_STYLES)
        expect(polygons(<LowPolyAvatar avatar={{ ...DEFAULT_HUMAN, sex, beard }} />)).toBeGreaterThan(10);
  });

  it('cambiar el color de piel cambia el relleno de la cabeza', () => {
    const fill = (skin: number) =>
      render(<LowPolyAvatar avatar={{ ...DEFAULT_HUMAN, skin }} />).container.querySelector('polygon[points^="50,14"]')?.getAttribute('fill');
    expect(fill(0)).not.toBe(fill(7));
  });

  it('las barbas, sombreros y accesorios agregan piezas al dibujo', () => {
    const base = polygons(<LowPolyAvatar avatar={DEFAULT_HUMAN} />);
    expect(polygons(<LowPolyAvatar avatar={{ ...DEFAULT_HUMAN, beard: 'beard' }} />)).toBeGreaterThan(base);
    expect(polygons(<LowPolyAvatar avatar={{ ...DEFAULT_HUMAN, hat: 'crown' }} />)).toBeGreaterThan(base);
    expect(polygons(<LowPolyAvatar avatar={{ ...DEFAULT_HUMAN, accessory: 'scarf' }} />)).toBeGreaterThan(base);
  });

  it('"no binario" se dibuja como vehículo, sin cara ni ropa', () => {
    for (const vehicle of VEHICLES) {
      const { container, unmount } = render(<LowPolyAvatar avatar={{ sex: 'nonbinary', vehicle }} label={vehicle} />);
      expect(container.querySelectorAll('polygon').length).toBeGreaterThan(15);
      expect(container.querySelector('polygon[points^="50,14"]')).toBeNull(); // no hay cabeza humana
      expect(container.querySelector(`svg[aria-label="${vehicle}"]`)).not.toBeNull();
      unmount();
    }
  });

  it('el helicóptero y la moto se dibujan distinto', () => {
    const html = (vehicle: 'apache' | 'motorcycle') => render(<LowPolyAvatar avatar={{ sex: 'nonbinary', vehicle }} />).container.innerHTML;
    expect(html('apache')).not.toBe(html('motorcycle'));
  });

  it('un personaje aleatorio siempre es dibujable', () => {
    for (let i = 0; i < 40; i++) {
      const { container, unmount } = render(<LowPolyAvatar avatar={i % 2 ? randomAvatar() : randomHuman('female')} />);
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });

  it('una mujer aleatoria nunca trae barba', () => {
    for (let i = 0; i < 50; i++) expect(randomHuman('female').beard).toBe('none');
  });
});
