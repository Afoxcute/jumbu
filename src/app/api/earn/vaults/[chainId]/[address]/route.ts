import { NextRequest, NextResponse } from "next/server";
import { fetchEarnVault } from "@/lib/lifi/earn-client";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId, address } = await ctx.params;
  const cid = Number(chainId);
  if (!Number.isFinite(cid) || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid chainId or address" }, { status: 400 });
  }
  try {
    const vault = await fetchEarnVault(cid, address);
    return NextResponse.json(vault);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Earn vault lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
