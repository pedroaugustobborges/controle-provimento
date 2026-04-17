import { useEffect, useRef, useState, useCallback } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  /** When true, ignore the very first run (avoids saving freshly-loaded data) */
  skipInitial?: boolean;
}

/**
 * Auto-save hook with debounce. Returns status + manual flush.
 */
export function useAutoSave<T>({
  value,
  onSave,
  delay = 800,
  enabled = true,
  skipInitial = true,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(skipInitial);
  const latestValue = useRef(value);
  const savingRef = useRef(false);

  latestValue.current = value;

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setStatus('saving');
    setError(null);
    try {
      await onSave(latestValue.current);
      setStatus('saved');
      // brief "saved" indicator, then back to idle
      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 1500);
    } catch (err: any) {
      console.error('[useAutoSave] save failed:', err);
      setError(err?.message || 'Erro ao salvar');
      setStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    setStatus('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay]);

  return { status, error, flush };
}
