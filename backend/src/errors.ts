export class HuskError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HuskError';
  }
}

export class NotFoundError extends HuskError {
  constructor(message = 'not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends HuskError {
  constructor(message = 'unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class UnavailableError extends HuskError {
  constructor(code: string, message: string) {
    super(code, message, 503);
  }
}
