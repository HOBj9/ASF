type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
    this.inflight.delete(key);
  }

  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = loader()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }
}
