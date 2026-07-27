export interface CachedObject<T> {
  data: T;
  isError: boolean;
  timestamp: number;
}

class ObjectsCacheStore {
  private ttlMs = 15 * 60 * 1000;
  private readonly values = new Map<string, CachedObject<unknown>>();

  setTtl(value: string): void {
    this.ttlMs = parseDuration(value, 15 * 60 * 1000);
  }

  add<T>(key: string, data: T, isError = false): CachedObject<T> {
    const entry = { data, isError, timestamp: Date.now() };
    this.values.set(key, entry);
    return entry;
  }

  get<T>(key: string): CachedObject<T> | undefined {
    const entry = this.values.get(key) as CachedObject<T> | undefined;
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.values.delete(key);
      return undefined;
    }
    return entry;
  }

  delete(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

export function parseDuration(value: string, fallbackMs: number): number {
  const match = /^\s*(\d+)\s*(ms|s|m|h)?\s*$/.exec(value);
  if (!match) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? "ms";
  if (unit === "h") return amount * 60 * 60 * 1000;
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "s") return amount * 1000;
  return amount;
}

export default new ObjectsCacheStore();
