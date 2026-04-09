/**
 * Domain alias helpers for display masking.
 *
 * For Advertiv/Yahoo, we mask raw sub_id values as YH_Feed_N
 * while keeping original values in storage and internal logic.
 */

export function buildAdvertivAliasMap(
  rows: Array<{ network?: string | null; domain?: string | null }>
): Map<string, string> {
  const domains = Array.from(
    new Set(
      rows
        .filter((row) => row.network === "advertiv" && row.domain)
        .map((row) => String(row.domain).trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const aliasMap = new Map<string, string>();
  domains.forEach((domain, index) => {
    aliasMap.set(domain, `YH_Feed_${index + 1}`);
  });

  return aliasMap;
}

export function maskAdvertivDomain(
  network: string | null | undefined,
  domain: string | null | undefined,
  aliasMap: Map<string, string>
): string | null {
  if (!domain) return null;
  if (network !== "advertiv") return domain;
  return aliasMap.get(domain) || domain;
}
