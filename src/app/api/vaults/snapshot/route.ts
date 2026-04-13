import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getWalletSnapshot } from "@/lib/vaults/snapshot";

export async function GET(req: NextRequest) {
  try {
    await verifyAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const walletAddress = req.nextUrl.searchParams.get("walletAddress") as
    | `0x${string}`
    | null;
  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  const snapshot = await getWalletSnapshot(walletAddress);
  return NextResponse.json(snapshot);
}
