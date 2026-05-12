/**
 * Resolve Partner ID / Campaign ID / Sub ID / Link ID for domain assignment rows.
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
 * Sub IDs / link IDs are sometimes stored with different leading-zero padding.
 * e.g. assignment "0362" vs revenue row "362" — include both for DB matching.
 */
export function expandAssignmentKeys(raw: string[]): string[] {
  const out = new Set<string>();
  for (const r of raw) {
    const n = norm(r);
    if (!n) continue;
    out.add(n);
    if (/^\d+$/.test(n)) {
      out.add(String(Number(n)));
    }
  }
  return [...out];
}

function uniqExpanded(domains: string[]): string[] {
  return [...new Set(domains.flatMap((d) => expandAssignmentKeys([d])))];
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

  const yhsKeys = uniqExpanded(yhsDomains);
  const advKeys = uniqExpanded(advDomains);

  const yhsByDomain = new Map<string, number | null>();
  const advertivByDomain = new Map<
    string,
    { pubId: string | null; campaignId: string | null }
  >();

  const [yhsRows, advRows] = await Promise.all([
    yhsKeys.length > 0
      ? prisma.bidder_YHS.findMany({
          where: { domain: { in: yhsKeys } },
          select: { domain: true, partnerId: true },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    advKeys.length > 0
      ? prisma.bidder_Advertiv.findMany({
          where: {
            OR: [{ domain: { in: advKeys } }, { subId: { in: advKeys } }],
          },
          select: { domain: true, subId: true, pubId: true, campaignId: true },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const registerYhs = (domain: string | null, partnerId: number | null) => {
    if (!domain) return;
    for (const k of expandAssignmentKeys([domain])) {
      if (!yhsByDomain.has(k)) {
        yhsByDomain.set(k, partnerId);
      }
    }
  };

  const registerAdv = (
    domain: string | null,
    subId: string | null,
    meta: { pubId: string | null; campaignId: string | null },
  ) => {
    const keys = expandAssignmentKeys(
      [domain, subId].filter((x): x is string => Boolean(x)),
    );
    for (const k of keys) {
      if (!advertivByDomain.has(k)) {
        advertivByDomain.set(k, meta);
      }
    }
  };

  for (const r of yhsRows) {
    registerYhs(r.domain, r.partnerId ?? null);
  }

  for (const r of advRows) {
    registerAdv(r.domain, r.subId, {
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

export type AssignmentFeedIds = {
  partnerId: string;
  campaignId: string;
  subId: string;
  linkId: string;
};

function lookupAdvertiv(
  enrichment: FeedIdEnrichment,
  domain: string,
): { pubId: string | null; campaignId: string | null } | undefined {
  for (const k of expandAssignmentKeys([domain])) {
    const v = enrichment.advertivByDomain.get(k);
    if (v) return v;
  }
  return undefined;
}

function lookupYhsPartner(
  enrichment: FeedIdEnrichment,
  domain: string,
): number | null | undefined {
  for (const k of expandAssignmentKeys([domain])) {
    if (enrichment.yhsByDomain.has(k)) {
      return enrichment.yhsByDomain.get(k);
    }
  }
  return undefined;
}

export function getAssignmentFeedIds(
  network: string,
  domain: string,
  enrichment: FeedIdEnrichment,
): AssignmentFeedIds {
  const key = norm(domain);
  const na = {
    partnerId: "N/A",
    campaignId: "N/A",
    subId: "N/A",
    linkId: "N/A",
  };

  if (network === "yandex") {
    return na;
  }

  if (network === "yhs") {
    const pid = lookupYhsPartner(enrichment, domain);
    return {
      partnerId: formatFeedIdValue(pid),
      campaignId: "N/A",
      subId: "N/A",
      linkId: formatFeedIdValue(domain),
    };
  }

  if (network === "advertiv") {
    const adv = lookupAdvertiv(enrichment, domain);
    const sub = formatFeedIdValue(domain);
    return {
      partnerId: formatFeedIdValue(adv?.pubId),
      campaignId: formatFeedIdValue(adv?.campaignId),
      subId: sub,
      // Advertiv has no separate "link id" in the API; same key as sub_id for display.
      linkId: sub,
    };
  }

  return na;
}
