import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { BASE_TOKENS, DEFAULT_CHAIN_ID } from "@/lib/constants";

const ALLOWED_TOKENS = new Set(Object.values(BASE_TOKENS));

export async function GET(req: NextRequest) {
  try {
    await verifyAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const sellToken = sp.get("sellToken");
  const buyToken = sp.get("buyToken");
  const sellAmount = sp.get("sellAmount");
  const taker = sp.get("taker");
  const toChain = sp.get("toChain");

  if (!sellToken || !buyToken || !sellAmount || !taker) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!ALLOWED_TOKENS.has(sellToken as `0x${string}`) || !ALLOWED_TOKENS.has(buyToken as `0x${string}`)) {
    return NextResponse.json({ error: "Unsupported token address" }, { status: 400 });
  }

  const params = new URLSearchParams({
    fromChain: String(DEFAULT_CHAIN_ID),
    toChain: toChain || String(DEFAULT_CHAIN_ID),
    fromToken: sellToken,
    toToken: buyToken,
    fromAmount: sellAmount,
    fromAddress: taker,
    toAddress: taker,
    slippage: "0.01",
  });

  const headers: HeadersInit = {};
  if (process.env.LIFI_API_KEY) headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;

  const res = await fetch(`https://li.quest/v1/quote?${params}`, {
    headers,
    cache: "no-store",
  });
  const quote = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: quote.message || quote.error || "Failed to get LI.FI quote" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    tool: quote.tool,
    buyAmount: quote.estimate?.toAmount,
    minBuyAmount: quote.estimate?.toAmountMin,
    transaction: quote.transactionRequest,
  });
}
