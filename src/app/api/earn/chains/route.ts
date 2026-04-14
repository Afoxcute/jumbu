import { NextResponse } from "next/server";
import { fetchEarnChains } from "@/lib/lifi/earn-client";

export async function GET() {
  try {
    const data = await fetchEarnChains();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Earn chains request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
