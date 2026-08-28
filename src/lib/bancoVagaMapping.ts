/**
 * Bidirectional mapping between vaga units and banco_candidatos cities.
 *
 * ORDER MATTERS: more-specific prefixes (e.g. "AGIR RIO VERDE") must appear
 * before shorter ones that could shadow them (e.g. "AGIR"), so that the
 * priority-ordered loop assigns them to the correct city in both directions.
 */

export interface CityMapping {
  /** City value stored in banco_candidatos.unidade */
  bancoCity: string;
  /** Vaga unit name prefixes that belong to this city (case-insensitive startsWith) */
  vagaPrefixes: string[];
}

export const CITY_MAPPINGS: CityMapping[] = [
  // Jataí BEFORE Goiânia — "AGIR RIO VERDE" must be checked before plain "AGIR"
  {
    bancoCity: "Jataí - GO",
    vagaPrefixes: ["HEJ", "AGIR RIO VERDE"],
  },
  {
    bancoCity: "Goiânia - GO",
    vagaPrefixes: ["HUGOL", "HECAD", "CRER", "AGIR", "HDS", "HMI", "HMG"],
  },
  {
    bancoCity: "Dourados - MS",
    vagaPrefixes: ["CHRD"],
  },
  {
    bancoCity: "Manaus - AM",
    vagaPrefixes: ["CHS"],
  },
  {
    bancoCity: "Cáceres - MT",
    vagaPrefixes: ["HRC"],
  },
  {
    bancoCity: "Cidade de Goiás - GO",
    vagaPrefixes: ["POL GOIAS"],
  },
  {
    bancoCity: "Vitória - ES",
    vagaPrefixes: ["UPA SAO PEDRO", "UPA PRAIA DO SUA"],
  },
];

// ── Direction 1: vaga → banco_candidatos filter ──────────────────────────────

/**
 * Given a vaga, returns a predicate that keeps only the banco_candidatos rows
 * from the matching city.
 *
 * Used in: VagaDetalhePage "Banco de Talentos" tab.
 */
export function getBancoFilterForVaga(
  vaga: { unidade?: string; is_teia?: boolean }
): (b: unknown) => boolean {
  const vagaUpper = (vaga.unidade || "").trim().toUpperCase();
  const isTeia = vaga.is_teia || vagaUpper.includes("TEIA");

  if (isTeia) return (b) => !!(b as any).is_teia;

  // Walk mappings in priority order (Jataí before Goiânia handles AGIR edge-case)
  for (const { bancoCity, vagaPrefixes } of CITY_MAPPINGS) {
    if (vagaPrefixes.some((p) => vagaUpper.startsWith(p.toUpperCase()))) {
      return (b) => (b as any).unidade === bancoCity;
    }
  }

  // No rule matched → permissive fallback (show all)
  return () => true;
}

// ── Direction 2: banco city → vagas filter ───────────────────────────────────

/**
 * Given a banco group's city and is_teia flag, returns a predicate that keeps
 * only the vagas that belong to the same city.
 *
 * Used in: BancoTalentosPage "Vincular a Vaga" dialog.
 */
export function getVagaFilterForBanco(
  bancoUnidade: string,
  isTeia: boolean
): (v: unknown) => boolean {
  if (isTeia) {
    return (v) =>
      !!(v as any).is_teia ||
      ((v as any).unidade || "").toUpperCase().includes("TEIA");
  }

  const targetCity = bancoUnidade.trim();

  return (v) => {
    const vu = ((v as any).unidade || "").trim().toUpperCase();

    // Walk same priority-ordered list so AGIR RIO VERDE beats AGIR
    for (const { bancoCity, vagaPrefixes } of CITY_MAPPINGS) {
      if (vagaPrefixes.some((p) => vu.startsWith(p.toUpperCase()))) {
        return bancoCity === targetCity;
      }
    }

    // Vaga unit not in any mapping → show only for Goiânia (the implicit default)
    return targetCity === "Goiânia - GO";
  };
}
