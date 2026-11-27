export type PortErrorKind =
  | "not_found"
  | "conflict"
  | "unavailable"
  | "unknown";

/** A failure translated by an adapter. Never carries SQL or provider text
 * beyond a diagnostic code used for server logs. */
export class PortError extends Error {
  constructor(
    public readonly kind: PortErrorKind,
    message: string,
    public readonly causeCode?: string,
  ) {
    super(message);
    this.name = "PortError";
  }
}
