import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { verifyAuth } from "@/lib/auth";

const erc4626PreviewAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "previewRedeem",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
] as const;

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const client = createPublicClient({
  chain: base,
  transport: http(
    alchemyKey
      ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : undefined,
  ),
});

export async function GET(req: NextRequest) {
  try {
    await verifyAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const vaultAddress = sp.get("vaultAddress") as `0x${string}` | null;
  const shares = sp.get("shares");
  if (!vaultAddress || !shares) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const assets = await client.readContract({
    address: vaultAddress,
    abi: erc4626PreviewAbi,
    functionName: "previewRedeem",
    args: [BigInt(shares)],
  });

  return NextResponse.json({ assets: assets.toString() });
}
