/**
 * Offline retry queue — persists pending writes in localStorage and replays
 * them with exponential backoff when connectivity returns.
 */
const STORAGE_KEY = 'portal-unidade:retry-queue';
const MAX_ATTEMPTS = 5;

export interface QueuedAction {
  id: string; // uuid
  action: string; // e.g. 'updateConvocacao'
  payload: any;
  recordId: string;
  timestamp: number;
  attempts: number;
  lastError?: string;
}

type Handler = (payload: any) => Promise<void>;

class RetryQueue {
  private handlers = new Map<string, Handler>();
  private processing = false;
  private listenersInstalled = false;
  private listeners: Array<(items: QueuedAction[]) => void> = [];

  registerHandler(action: string, handler: Handler) {
    this.handlers.set(action, handler);
  }

  private read(): QueuedAction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
    } catch {
      return [];
    }
  }

  private write(items: QueuedAction[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      this.listeners.forEach((l) => l(items));
    } catch (err) {
      console.warn('[retryQueue] write failed:', err);
    }
  }

  list(): QueuedAction[] {
    return this.read();
  }

  subscribe(listener: (items: QueuedAction[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.read());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  enqueue(item: Omit<QueuedAction, 'id' | 'timestamp' | 'attempts'>): QueuedAction {
    const queued: QueuedAction = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      attempts: 0,
    };
    const items = this.read();
    items.push(queued);
    this.write(items);
    // Try to flush immediately
    void this.flush();
    return queued;
  }

  remove(id: string) {
    const items = this.read().filter((i) => i.id !== id);
    this.write(items);
  }

  async flush(): Promise<void> {
    if (this.processing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    this.processing = true;
    try {
      let items = this.read();
      for (const item of [...items]) {
        const handler = this.handlers.get(item.action);
        if (!handler) continue;
        try {
          await handler(item.payload);
          items = items.filter((i) => i.id !== item.id);
          this.write(items);
        } catch (err: any) {
          item.attempts += 1;
          item.lastError = err?.message || String(err);
          if (item.attempts >= MAX_ATTEMPTS) {
            console.error('[retryQueue] giving up after max attempts:', item);
            // Keep in queue but flagged — UI can surface it
          }
          items = items.map((i) => (i.id === item.id ? item : i));
          this.write(items);
          // backoff: stop processing more on first failure to avoid hammering
          await new Promise((r) => setTimeout(r, Math.min(2000 * item.attempts, 10000)));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  installNetworkListeners() {
    if (this.listenersInstalled || typeof window === 'undefined') return;
    this.listenersInstalled = true;
    window.addEventListener('online', () => {
      console.info('[retryQueue] back online, flushing...');
      void this.flush();
    });
    // Periodic flush as a safety net
    setInterval(() => void this.flush(), 30000);
  }
}

export const retryQueue = new RetryQueue();
