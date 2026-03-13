const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 250;

function shouldLogSlowOperation(durationMs: number, thresholdMs: number): boolean {
  return process.env.NODE_ENV !== "production" || durationMs >= thresholdMs;
}

export async function measureAsync<T>(
  operationName: string,
  run: () => Promise<T>,
  options?: { thresholdMs?: number; meta?: Record<string, unknown> },
): Promise<T> {
  const start = Date.now();
  try {
    return await run();
  } finally {
    const durationMs = Date.now() - start;
    const thresholdMs = options?.thresholdMs ?? DEFAULT_SLOW_QUERY_THRESHOLD_MS;

    if (shouldLogSlowOperation(durationMs, thresholdMs)) {
      console.info("[perf]", operationName, {
        durationMs,
        ...(options?.meta ?? {}),
      });
    }
  }
}
