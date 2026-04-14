/** LI.FI Earn Data API — vault discovery, analytics, portfolio (see https://docs.li.fi/earn/quickstart) */
export const LIFI_EARN_API_BASE = "https://earn.li.fi/v1";

/** Core routing / Composer quotes */
export const LIFI_QUEST_API_BASE = "https://li.quest/v1";

export function lifiApiHeaders(): HeadersInit {
  const key = process.env.LIFI_API_KEY;
  return key ? { "x-lifi-api-key": key } : {};
}
