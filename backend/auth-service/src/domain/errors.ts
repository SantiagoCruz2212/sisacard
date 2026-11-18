export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Usuario o contraseña incorrectos', 401);
  }
}

export class TooManyAttemptsError extends DomainError {
  constructor() {
    super('Demasiados intentos, espera unos segundos', 429);
  }
}
