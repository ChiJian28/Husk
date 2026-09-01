export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isGeoBlocked(err: unknown) {
  return err instanceof ApiError && (err.code === "RESTRICTED" || err.status === 451);
}
