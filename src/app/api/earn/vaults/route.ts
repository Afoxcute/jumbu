import { NextRequest, NextResponse } from "next/server";
import { fetchEarnVaults } from "@/lib/lifi/earn-client";

/** Proxy: list Earn vaults (pass-through query). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const chainId = sp.get("chainId");
  if (!chainId || Number.isNaN(Number(chainId))) {
    return NextResponse.json({ error: "chainId is required" }, { status: 400 });
  }
  try {
    const data = await fetchEarnVaults({
      chainId: Number(chainId),
      sortBy: (sp.get("sortBy") as "apy" | "tvl" | "name") || "apy",
      limit: sp.get("limit") ? Number(sp.get("limit")) : 50,
      cursor: sp.get("cursor") || undefined,
    });
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Earn vaults request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
