/**
 * Resolve Partner ID / Campaign ID / Link ID for domain assignment rows.
 * Assignment rows only store a single `domain` key per network; we enrich
 * Yahoo/YHS from the latest matching revenue row when available.
 */

import { prisma } from "@/lib/prisma";

export type FeedIdEnrichment = {
  yhsByDomain: Map<string, number | null>;
  advertivByDomain: Map<string, { pubId: string | null; campaignId: string | null }>;
};

function norm(d: string): string {
  return d.toLowerCase().trim();
}

/**
 * Load latest-known partner/campaign metadata per assignment key (domain string).
 */
export async function fetchFeedIdEnrichment(
  pairs: { network: string; domain: string }[],
): Promise<FeedIdEnrichment> {
  const yhsDomains = [
    ...new Set(
      pairs.filter((p) => p.network === "yhs").map((p) => norm(p.domain)),
    ),
  ];
  const advDomains = [
    ...new Set(
      pairs.filter((p) => p.network === "advertiv").map((p) => norm(p.domain)),
    ),
  ];

  const yhsByDomain = new Map<string, number | null>();
  const advertivByDomain = new Map<
    string,
    { pubId: string | null; campaignId: string | null }
  >();

  const [yhsRows, advRows] = await Promise.all([
    yhsDomains.length > 0
      ? prisma.bidder_YHS.findMany({
          where: { domain: { in: yhsDomains } },
          select: { domain: true, partnerId: true },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    advDomains.length > 0
      ? prisma.bidder_Advertiv.findMany({
          where: { domain: { in: advDomains } },
          select: { domain: true, pubId: true, campaignId: true },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
  ]);

  for (const r of yhsRows) {
    const d = r.domain ? norm(r.domain) : "";
    if (!d || yhsByDomain.has(d)) continue;
    yhsByDomain.set(d, r.partnerId ?? null);
  }

  for (const r of advRows) {
    const d = r.domain ? norm(r.domain) : "";
    if (!d || advertivByDomain.has(d)) continue;
    advertivByDomain.set(d, {
      pubId: r.pubId ?? null,
      campaignId: r.campaignId ?? null,
    });
  }

  return { yhsByDomain, advertivByDomain };
}

export function formatFeedIdValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "N/A";
  if (typeof v === "string" && v.trim() === "") return "N/A";
  return String(v);
}

export function getAssignmentFeedIds(
  network: string,
  domain: string,
  enrichment: FeedIdEnrichment,
): { partnerId: string; campaignId: string; linkId: string } {
  const key = norm(domain);
  const na = { partnerId: "N/A", campaignId: "N/A", linkId: "N/A" };

  if (network === "yandex") {
    return na;
  }

  if (network === "yhs") {
    const pid = enrichment.yhsByDomain.get(key);
    return {
      partnerId: formatFeedIdValue(pid),
      campaignId: "N/A",
      linkId: formatFeedIdValue(domain),
    };
  }

  if (network === "advertiv") {
    const adv = enrichment.advertivByDomain.get(key);
    return {
      partnerId: formatFeedIdValue(adv?.pubId),
      campaignId: formatFeedIdValue(adv?.campaignId),
      linkId: "N/A",
    };
  }

  return na;
}
