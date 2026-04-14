import { NextRequest, NextResponse } from "next/server";
import { fetchEarnPortfolioPositions } from "@/lib/lifi/earn-client";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ address: string }> },
) {
  const { address } = await ctx.params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  try {
    const data = await fetchEarnPortfolioPositions(address);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Earn portfolio request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
