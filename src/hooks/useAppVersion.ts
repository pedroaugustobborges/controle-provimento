import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 60_000;
const SEEN_HASH_KEY = "lastSeenAppBuildHash";

interface VersionPayload {
  version: string;
  buildHash: string;
  builtAt?: string;
}

interface UseAppVersionResult {
  hasUpdate: boolean;
  newVersion: VersionPayload | null;
  acknowledge: () => void;
  reload: () => void;
}

async function fetchVersion(): Promise<VersionPayload | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionPayload;
    if (!data?.buildHash) return null;
    return data;
  } catch {
    return null;
  }
}

export function useAppVersion(): UseAppVersionResult {
  const initialHashRef = useRef<string | null>(null);
  const [newVersion, setNewVersion] = useState<VersionPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const v = await fetchVersion();
      if (!v || cancelled) return;

      if (initialHashRef.current === null) {
        initialHashRef.current = v.buildHash;
        return;
      }

      if (v.buildHash !== initialHashRef.current) {
        const lastSeen = typeof window !== "undefined" ? localStorage.getItem(SEEN_HASH_KEY) : null;
        if (lastSeen === v.buildHash) return; // já notificou desta versão
        setNewVersion(v);
      }
    }

    check();
    const id = window.setInterval(check, POLL_INTERVAL_MS);

    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const acknowledge = () => {
    if (newVersion) {
      try {
        localStorage.setItem(SEEN_HASH_KEY, newVersion.buildHash);
      } catch {
        /* ignore */
      }
      setNewVersion(null);
    }
  };

  const reload = () => {
    acknowledge();
    // Tenta limpar caches do Service Worker, se existir
    if ("caches" in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return { hasUpdate: !!newVersion, newVersion, acknowledge, reload };
}
