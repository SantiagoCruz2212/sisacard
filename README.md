# SisaCard

Juegos en el navegador para jugar entre compañeros de oficina (misma red). Perfil con usuario + contraseña de 4 números, estadísticas por juego y **tabla de clasificación por puntos**.

Juegos: **Impostor** (palabra secreta, 3–12 jugadores), **UNO** (2–10) y **Blackjack Royale** (2–8).

## Blackjack Royale

Blackjack sin crupier y en modo battle royale. Todas las manos son públicas.

- Cada ronda cada jugador recibe 2 cartas y, en su turno, **pide carta** o **se planta** (20 s por turno; si se acaba el tiempo se planta). El as vale 1 u 11 y llegar a 21 planta solo.
- **Quien se pasa de 21 queda eliminado al instante** y el ciclo se reinicia: vuelve a la ronda 1, los totales quedan en cero y se reparte de nuevo.
- Cada **2 rondas** se suman las dos manos (máximo 42) y **sale quien quedó más lejos de 42**. Si hay empate en el último lugar salen todos los empatados; si empatan todos, no sale nadie. Después el ciclo también se reinicia.
- Gana el último en pie. Quien abandona queda eliminado. Posiciones y puntos como en los demás juegos (los eliminados a la vez comparten posición).
- Reglas en `backend/games-core/src/domain/blackjack/blackjack-game.ts`; sus pruebas usan barajas escritas a mano.

## Personaje, mesa, espectadores y campana

- **Mi personaje** (`/character`): cada usuario arma su personaje de polígonos (low-poly): pelo (6 estilos) y su color, piel, ojos (estilo y color), boca, ropa (estilo y color). Se guarda en `games.db`; quien no ha creado uno recibe uno distinto por defecto.
- **Mesa:** en la sala todos se ven sentados alrededor de una mesa; se marca con 🔔 a quien le toca, con 👑 al anfitrión, y se muestra el número de cartas (UNO) o quién fue eliminado (Impostor).
- **Espectadores:** quien entra a una sala con la partida en curso entra como espectador (botón **Mirar** en el lobby). Ve la mesa y el chat, pero no puede actuar ni ve información oculta (manos de UNO, palabra del Impostor). En la siguiente ronda pasa a jugar.
- **Ocultar información:** el botón 👁/🙈 de la sala (o la tecla **H**) oculta tus cartas de UNO (se ven boca abajo y no se pueden jugar a ciegas) y tu palabra y rol en Impostor. Es solo de tu pantalla, se recuerda entre partidas y la tecla no actúa mientras escribes en el chat.
- **Disparo y humo:** cuando alguien muere o pierde suena un disparo y sale una nube de humo sobre su personaje (queda un hilo tenue mientras siga fuera). En Impostor: al ser eliminado por votación y, al terminar, para el equipo perdedor. En UNO: quien queda en último lugar. No se dispara por quienes ya estaban fuera al entrar o al mirar. Comparte el botón de sonido con la campana.
- **Campana:** suena cuando te toca (dar pista o adivinar en Impostor, jugar en UNO). Se sintetiza en el navegador y se puede silenciar con el botón 🔔 de la sala. El navegador solo deja sonar después del primer clic en la página.

## Votación de juegos

En el lobby, cualquiera pulsa **Iniciar votación**. Durante 30 segundos todos los que están en el lobby votan (se puede cambiar el voto; los votos son públicos). Cuando votan todos, la votación cierra antes de tiempo.

- Gana el juego más votado; si hay empate se sortea entre los empatados; sin votos no se crea sala.
- El servidor crea la sala del juego ganador y mete en ella a quienes votaron por él. El anfitrión es quien inició la votación (si no, el primer votante del ganador). Los demás ven el resultado y pueden unirse con un botón.
- Quien está dentro de una sala no puede iniciar ni votar, y no cuenta para el cierre anticipado.

## Puntos y clasificación

Al terminar una partida cada jugador recibe puntos según su posición: el 1.º se lleva 10 y baja linealmente hasta el último (siempre ≥ 1). Con 4 jugadores: 10, 8, 5, 3. Los empatados comparten posición.

- **UNO:** el orden en que se quedan sin cartas es el ranking; la partida sigue hasta que queda un solo jugador. Sin apilar +2/+4 y sin desafío al +4. Si te quedas con 1 carta sin pulsar ¡UNO! antes de jugarla, robas 2.
- **Impostor:** el equipo ganador queda 1.º y el perdedor en la posición siguiente (con empate dentro del equipo).
- La clasificación (`/leaderboard`) es general o por juego. La regla vive en `backend/games-core/src/domain/scoring.ts`.

## Cómo correrlo

```powershell
npm install
npm run dev          # gateway + auth + games + frontend
```

- Tú: http://localhost:5173
- Compañeros (misma red): `http://TU_IP:5173` (la IP aparece en la línea `Network:` que imprime Vite, o con `ipconfig`).
- Una sola vez, como administrador, abre el puerto en el firewall de Windows y deja la red como "Privada":

```powershell
New-NetFirewallRule -DisplayName "SisaCard dev" -Direction Inbound -LocalPort 5173,3001 -Protocol TCP -Action Allow
```

Modo "producción" en un solo puerto (el gateway sirve el frontend compilado):

```powershell
npm run build
npm start            # http://TU_IP:3001
```

Jugar sin más gente: `node infra/bots.mjs 2` (Impostor), `node infra/bots.mjs 2 uno` o `node infra/bots.mjs 2 blackjack` crea una sala con 2 bots que se inicia sola cuando entras.

## Arquitectura

```
frontend/                 SPA (Vite + React + TS). Feature-based, ver "Frontend".
backend/
  contracts/              JWT + contrato de identidad gateway→servicios (único código compartido)
  api-gateway/   :3001    Única entrada. Enruta, limita peticiones, valida JWT, inyecta identidad
  auth-service/  :3101    Identidad: registro, login, JWT          → auth.db
  games-core/    :3102    Salas, Impostor, chat y estadísticas     → games.db  (HTTP + WebSocket)
infra/                    smoke.mjs (prueba E2E), bots.mjs
```

Sigue el *Plan de Construcción de Microservicios*: un servicio = una base de datos, sin FK entre bases
(`games.db` guarda `user_id` como referencia lógica), IDs UUID, timestamps ISO, gateway como puerta de entrada,
`*-core` de dominio por encima de servicios transversales. El gateway valida el JWT y manda la identidad en
cabeceras (`x-user-id`, `x-username`) firmadas con un secreto compartido; los servicios no aceptan nada sin él.

### Backend: hexagonal (por servicio)

```
src/
  domain/          Reglas de negocio puras (Room, ImpostorGame, User). Sin Express, Socket.IO ni SQLite.
  application/     Casos de uso + puertos (interfaces: RoomRepository, StatsRepository, EventBus, RealtimeNotifier…)
  infrastructure/  Adaptadores: Socket.IO, HTTP, SQLite, memoria, reloj del sistema
  main.ts          Composition root: único sitio donde se eligen implementaciones
```

- El dominio no usa `setTimeout`/`Date`: recibe un puerto `Scheduler`, por eso `ImpostorGame` se prueba sin esperar (`npm test`).
- Cambiar SQLite → PostgreSQL, o el bus en proceso → RabbitMQ, es escribir otro adaptador; el dominio no se toca.
- Eventos de dominio (`game.finished`) circulan por un `EventBus` en proceso y alimentan las estadísticas.

### Frontend: guía de arquitectura web

`app/` (providers, router, guards, composición) · `features/` (`auth`, `lobby`, `room`, `impostor`, `profile`,
cada uno con `apis/ components/ hooks/ models/ views/`) · `shared/` (ui, hooks, lib, config, models).
Un feature **nunca** importa a otro; `eslint-plugin-boundaries` lo hace cumplir (`npm run lint -w @sisacard/frontend`).
React Query para estado de servidor, Zustand para sesión/tiempo real, RHF + Zod para formularios, i18n es/en con claves tipadas, Tailwind v4 con tokens en `@theme`.

## Pruebas

```powershell
npm test             # dominio de Impostor + esquemas y componentes del frontend
npm run typecheck
```

Prueba E2E contra el gateway (3 bots juegan una partida completa de Impostor y otra de UNO; valida seguridad del gateway, puntos, clasificación y estadísticas):

```powershell
$env:GAMES_FAST=1; npm start     # en una terminal
node infra/smoke.mjs                # en otra
```

## Variables de entorno (producción)

`JWT_SECRET` y `GATEWAY_SECRET` (los valores por defecto son solo de desarrollo), `PORT`, `AUTH_PORT`, `GAMES_PORT`, `DATA_DIR`.

## Para agregar un juego nuevo

1. `backend/games-core/src/domain/<juego>/` implementando `GameMatch` (ver `domain/game.ts`): `start/action/view/playerLeft/isFinished` y entregar las posiciones al terminar.
2. Registrarlo en `domain/games.ts`. Las salas, el chat, los puntos y la clasificación funcionan solos.
3. `frontend/src/features/<juego>/` con su view; se compone en `app/routes/room-route.tsx`, y se agrega a `lobby/components/game-list.tsx` y a i18n.
