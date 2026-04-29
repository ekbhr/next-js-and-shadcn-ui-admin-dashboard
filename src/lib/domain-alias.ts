/**
 * Domain alias helpers for display masking.
 *
 * For Advertiv/Yahoo and YHS, we mask raw ids as:
 * - advertiv -> YH_Feed_N
 * - yhs -> YHS_Feed_N
 * while keeping original values in storage and internal logic.
 */

export function buildAdvertivAliasMap(
  rows: Array<{ network?: string | null; domain?: string | null }>
): Map<string, string> {
  const aliasMap = new Map<string, string>();

  const advertivDomains = Array.from(
    new Set(
      rows
        .filter((row) => row.network === "advertiv" && row.domain)
        .map((row) => String(row.domain).trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const yhsDomains = Array.from(
    new Set(
      rows
        .filter((row) => row.network === "yhs" && row.domain)
        .map((row) => String(row.domain).trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  advertivDomains.forEach((domain, index) => {
    aliasMap.set(`advertiv:${domain}`, `YH_Feed_${index + 1}`);
  });

  yhsDomains.forEach((domain, index) => {
    aliasMap.set(`yhs:${domain}`, `YHS_Feed_${index + 1}`);
  });

  return aliasMap;
}

export function maskAdvertivDomain(
  network: string | null | undefined,
  domain: string | null | undefined,
  aliasMap: Map<string, string>
): string | null {
  if (!domain) return null;
  if (network !== "advertiv" && network !== "yhs") return domain;
  return aliasMap.get(`${network}:${domain}`) || domain;
}
