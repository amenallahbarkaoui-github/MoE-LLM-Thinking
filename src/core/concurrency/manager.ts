export class ConcurrencyManager {
  private concurrencyLimit: number;
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(concurrencyLimit = 3) {
    this.concurrencyLimit = concurrencyLimit;
  }

  private acquire(): Promise<void> {
    if (this.running < this.concurrencyLimit) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    this.running--;
    if (this.queue.length > 0) {
      this.running++;
      const next = this.queue.shift()!;
      next();
    }
  }

  async executeBatch<T>(
    tasks: Array<() => Promise<T>>,
    onTaskComplete?: (index: number, result: T) => void,
    onTaskError?: (index: number, error: Error) => void
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const results: Array<{ success: boolean; result?: T; error?: Error }> = new Array(tasks.length);

    const wrappedTasks = tasks.map((task, index) => async () => {
      await this.acquire();
      try {
        const result = await task();
        results[index] = { success: true, result };
        onTaskComplete?.(index, result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        results[index] = { success: false, error };
        onTaskError?.(index, error);
      } finally {
        this.release();
      }
    });

    await Promise.all(wrappedTasks.map((t) => t()));
    return results;
  }
}
