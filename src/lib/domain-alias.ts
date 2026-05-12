/**
 * Domain display labels for Yahoo (Advertiv) and YHS feeds.
 * Raw assignment keys stay in storage; UI uses prefixed labels.
 */

const NA = "N/A";

function segment(value: string | null | undefined): string {
  if (value === null || value === undefined) return NA;
  const t = String(value).trim();
  if (t === "" || t === NA) return NA;
  return t;
}

/** Yahoo feed: YH_Feed_<SubId>_<CampaignId>. When campaign is unknown, repeat SubId in that slot (no N/A). */
export function formatYahooFeedDomainLabel(
  subId: string | null | undefined,
  campaignId?: string | null,
): string | null {
  if (!subId?.trim()) return null;
  const s = segment(subId);
  const c = segment(campaignId);
  const campaignSlot = c === NA ? s : c;
  return `YH_Feed_${s}_${campaignSlot}`;
}

/** YHS feed: YHS_Feed_<LinkId> */
export function formatYhsFeedDomainLabel(linkId: string | null | undefined): string | null {
  if (!linkId?.trim()) return null;
  return `YHS_Feed_${segment(linkId)}`;
}

export type MaskAdvertivDomainOptions = {
  campaignId?: string | null;
};

/**
 * Map stored domain key to display label for Yahoo/YHS; other networks pass through.
 * @deprecated Third argument (`aliasMap`) is ignored; kept for call-site compatibility.
 */
export function maskAdvertivDomain(
  network: string | null | undefined,
  domain: string | null | undefined,
  _aliasMap?: Map<string, string>,
  options?: MaskAdvertivDomainOptions,
): string | null {
  if (!domain) return null;
  if (network === "advertiv") {
    return formatYahooFeedDomainLabel(domain, options?.campaignId);
  }
  if (network === "yhs") {
    return formatYhsFeedDomainLabel(domain);
  }
  return domain;
}
