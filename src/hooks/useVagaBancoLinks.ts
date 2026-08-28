/**
 * Shared hook for vaga ↔ PROC. SELETIVO links persisted in Supabase.
 *
 * Loads all links once on mount. Provides an upsert function that
 * updates the DB and immediately reflects the change in local state,
 * so the UI stays responsive without a refetch round-trip.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllVagaBancoLinks,
  upsertVagaBancoLink,
  buildLinksMap,
  VagaBancoLink,
} from '@/lib/vagaBancoLinksDb';

export interface LinksEntry {
  confirmed: Set<string>;
  desvinculado: Set<string>;
}

export interface UseVagaBancoLinksResult {
  /** vagaId → { confirmed, desvinculado } sets of ps_keys */
  linksMap: Map<string, LinksEntry>;
  isLoading: boolean;
  /**
   * Upsert a link. Updates DB and optimistically reflects in linksMap.
   * Throws if the DB write fails.
   */
  upsertLink: (
    vagaId: string,
    psKey: string,
    status: 'confirmed' | 'desvinculado',
    userId?: string | null,
  ) => Promise<void>;
  /** Force a fresh fetch from DB */
  refresh: () => Promise<void>;
}

export function useVagaBancoLinks(): UseVagaBancoLinksResult {
  const [links, setLinks] = useState<VagaBancoLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const rows = await fetchAllVagaBancoLinks();
    setLinks(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsertLink = useCallback(
    async (
      vagaId: string,
      psKey: string,
      status: 'confirmed' | 'desvinculado',
      userId?: string | null,
    ) => {
      // Optimistic update — reflect immediately in UI
      setLinks((prev) => {
        const idx = prev.findIndex(
          (l) => l.vaga_id === vagaId && l.ps_key === psKey,
        );
        const now = new Date().toISOString();
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], status, updated_at: now };
          return next;
        }
        return [
          ...prev,
          {
            id: `optimistic-${vagaId}-${psKey}`,
            vaga_id: vagaId,
            ps_key: psKey,
            status,
            created_at: now,
            updated_at: now,
          },
        ];
      });

      // Persist to DB (throws on error so callers can toast)
      await upsertVagaBancoLink(vagaId, psKey, status, userId);
    },
    [],
  );

  const linksMap = buildLinksMap(links);

  return { linksMap, isLoading, upsertLink, refresh: load };
}
