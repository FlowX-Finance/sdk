export function nowInMilliseconds(): number {
  return Date.now();
}

// Alias for nowInMillisecond
export function now(): number {
  return nowInMilliseconds();
}

export function toSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}
