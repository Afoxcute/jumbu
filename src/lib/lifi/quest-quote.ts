import { LIFI_QUEST_API_BASE, lifiApiHeaders } from "@/lib/lifi/config";

export interface LiQuestQuote {
  tool?: unknown;
  estimate?: {
    toAmount?: string;
    toAmountMin?: string;
    approvalAddress?: string;
  };
  transactionRequest?: { to?: string; data?: string; value?: string };
  message?: string;
  error?: string;
  approvalAddress?: string;
}

export interface LiQuestQuoteResult {
  ok: boolean;
  status: number;
  quote: LiQuestQuote;
}

/**
 * GET https://li.quest/v1/quote — swaps and Composer (vault as `toToken`).
 */
export async function fetchLiQuestQuote(searchParams: URLSearchParams): Promise<LiQuestQuoteResult> {
  const res = await fetch(`${LIFI_QUEST_API_BASE}/quote?${searchParams}`, {
    headers: { Accept: "application/json", ...lifiApiHeaders() },
    cache: "no-store",
  });
  const quote = (await res.json()) as LiQuestQuote;
  return { ok: res.ok, status: res.status, quote };
}
