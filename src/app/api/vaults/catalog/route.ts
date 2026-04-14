import { NextResponse } from "next/server";
import { getEnrichedVaultCatalog } from "@/lib/vaults/enrich-with-earn";

/** Public vault list with live APY/TVL from LI.FI Earn where matched. */
export async function GET() {
  try {
    const catalog = await getEnrichedVaultCatalog();
    return NextResponse.json(catalog);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load vault catalog";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
