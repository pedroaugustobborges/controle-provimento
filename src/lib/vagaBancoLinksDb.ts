/**
 * Supabase persistence helpers for vaga ↔ PROC. SELETIVO links.
 *
 * The table `vaga_banco_links` has a unique constraint on (vaga_id, ps_key),
 * so every upsert either inserts or updates the status in-place.
 */

import { supabase } from '@/lib/supabase';

export interface VagaBancoLink {
  id: string;
  vaga_id: string;
  ps_key: string;
  status: 'confirmed' | 'desvinculado';
  created_at: string;
  updated_at: string;
}

/** Fetch all links. Returns an empty array on error. */
export async function fetchAllVagaBancoLinks(): Promise<VagaBancoLink[]> {
  const { data, error } = await (supabase as any)
    .from('vaga_banco_links')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[vagaBancoLinksDb] fetchAll error:', error);
    return [];
  }
  return (data ?? []) as VagaBancoLink[];
}

/** Fetch links for a single vaga. Returns an empty array on error. */
export async function fetchLinksForVaga(vagaId: string): Promise<VagaBancoLink[]> {
  const { data, error } = await (supabase as any)
    .from('vaga_banco_links')
    .select('*')
    .eq('vaga_id', vagaId);

  if (error) {
    console.error('[vagaBancoLinksDb] fetchLinksForVaga error:', error);
    return [];
  }
  return (data ?? []) as VagaBancoLink[];
}

/**
 * Upsert a link with the given status.
 * Conflict on (vaga_id, ps_key) → update status + updated_at.
 */
export async function upsertVagaBancoLink(
  vagaId: string,
  psKey: string,
  status: 'confirmed' | 'desvinculado',
  userId?: string | null,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('vaga_banco_links')
    .upsert(
      {
        vaga_id: vagaId,
        ps_key: psKey,
        status,
        ...(userId ? { created_by: userId } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vaga_id,ps_key' },
    );

  if (error) {
    console.error('[vagaBancoLinksDb] upsert error:', error);
    throw error;
  }
}

/**
 * Build a Map<vagaId, { confirmed: Set<psKey>, desvinculado: Set<psKey> }>
 * from a flat array of links.
 */
export function buildLinksMap(
  links: VagaBancoLink[],
): Map<string, { confirmed: Set<string>; desvinculado: Set<string> }> {
  const map = new Map<string, { confirmed: Set<string>; desvinculado: Set<string> }>();
  for (const link of links) {
    if (!map.has(link.vaga_id)) {
      map.set(link.vaga_id, { confirmed: new Set(), desvinculado: new Set() });
    }
    const entry = map.get(link.vaga_id)!;
    if (link.status === 'confirmed') {
      entry.confirmed.add(link.ps_key);
      entry.desvinculado.delete(link.ps_key);
    } else {
      entry.desvinculado.add(link.ps_key);
      entry.confirmed.delete(link.ps_key);
    }
  }
  return map;
}
