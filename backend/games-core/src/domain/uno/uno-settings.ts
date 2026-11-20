/** Reglas de la casa del UNO. Las elige el anfitrión en la sala de espera. */
export interface UnoSettings {
  /** Suma las cartas de UNO Infinity (en Flip, a los dos lados). */
  infinity: boolean;
  /** Baraja de dos caras de UNO Flip. */
  flip: boolean;
  /** Responder un +N con otro +N (igual o mayor) y pasar la cuenta al siguiente. */
  stacking: boolean;
  /** Desafiar un comodín de robo jugado teniendo el color en juego. */
  challenge: boolean;
  /** El 7 cambia tu mano con alguien; el 0 pasa todas las manos en el sentido del juego. */
  sevenZero: boolean;
  /** Jugar una carta idéntica a la de la mesa fuera de turno. */
  jumpIn: boolean;
  /** Olvidar el UNO no cuesta solo: otro jugador tiene que atraparte. */
  catchUno: boolean;
}

export const defaultUnoSettings = (): UnoSettings => ({
  infinity: false,
  flip: false,
  stacking: false,
  challenge: false,
  sevenZero: false,
  jumpIn: false,
  catchUno: false,
});

const FLAGS = ['infinity', 'flip', 'stacking', 'challenge', 'sevenZero', 'jumpIn', 'catchUno'] as const;

/** Normaliza lo que manda el cliente: lo desconocido se ignora y lo que falta queda por defecto. */
export function parseUnoSettings(raw: unknown): UnoSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const settings = defaultUnoSettings();
  for (const flag of FLAGS) settings[flag] = input[flag] === true;
  // Formato anterior: una sola baraja ('classic' | 'infinity' | 'flip').
  if (input.deck === 'infinity') settings.infinity = true;
  if (input.deck === 'flip') settings.flip = true;
  return settings;
}
