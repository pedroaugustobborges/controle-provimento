/**
 * Draft persistence in localStorage — protects unsaved edits across reloads.
 * Key format: portal-unidade:draft:{userId}:{recordId}
 */
const PREFIX = 'portal-unidade:draft';

export interface DraftEntry<T = any> {
  data: T;
  timestamp: number; // ms epoch
  serverUpdatedAt?: string | null; // ISO from server when draft created
}

function key(userId: string, recordId: string): string {
  return `${PREFIX}:${userId}:${recordId}`;
}

export const draftStore = {
  save<T>(userId: string, recordId: string, data: T, serverUpdatedAt?: string | null): void {
    try {
      const entry: DraftEntry<T> = {
        data,
        timestamp: Date.now(),
        serverUpdatedAt: serverUpdatedAt ?? null,
      };
      localStorage.setItem(key(userId, recordId), JSON.stringify(entry));
    } catch (err) {
      console.warn('[draftStore] save failed:', err);
    }
  },

  load<T>(userId: string, recordId: string): DraftEntry<T> | null {
    try {
      const raw = localStorage.getItem(key(userId, recordId));
      if (!raw) return null;
      return JSON.parse(raw) as DraftEntry<T>;
    } catch {
      return null;
    }
  },

  clear(userId: string, recordId: string): void {
    try {
      localStorage.removeItem(key(userId, recordId));
    } catch {
      // ignore
    }
  },

  /**
   * Returns true when local draft is newer than the server snapshot.
   */
  isLocalNewer(userId: string, recordId: string, serverUpdatedAt?: string | null): boolean {
    const draft = draftStore.load(userId, recordId);
    if (!draft) return false;
    if (!serverUpdatedAt) return true;
    const serverMs = new Date(serverUpdatedAt).getTime();
    return draft.timestamp > serverMs;
  },

  listAllForUser(userId: string): Array<{ recordId: string; entry: DraftEntry }> {
    const out: Array<{ recordId: string; entry: DraftEntry }> = [];
    const userPrefix = `${PREFIX}:${userId}:`;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(userPrefix)) continue;
        const recordId = k.slice(userPrefix.length);
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          out.push({ recordId, entry: JSON.parse(raw) });
        } catch {
          // skip corrupt entries
        }
      }
    } catch {
      // ignore
    }
    return out;
  },
};
