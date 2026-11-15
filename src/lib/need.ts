/**
 * Gives the value, or stops with an error if the value is missing.
 * Use it where a missing value is a fault in the data of the project, not a state that the code can handle.
 */
export function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} is missing.`);
  return value;
}
