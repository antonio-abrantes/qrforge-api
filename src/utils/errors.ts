export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
