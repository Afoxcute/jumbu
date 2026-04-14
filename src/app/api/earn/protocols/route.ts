import { NextResponse } from "next/server";
import { fetchEarnProtocols } from "@/lib/lifi/earn-client";

export async function GET() {
  try {
    const data = await fetchEarnProtocols();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Earn protocols request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
