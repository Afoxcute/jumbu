import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { verifyAuth } from "@/lib/auth";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";

const erc4626PreviewAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "previewDeposit",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ name: "shares", type: "uint256" }],
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
  const vaultAssetToken = sp.get("vaultAssetToken") as `0x${string}` | null;
  const fromToken = sp.get("fromToken") as `0x${string}` | null;
  const amount = sp.get("amount");
  const walletAddress = sp.get("walletAddress") as `0x${string}` | null;
  if (!vaultAddress || !vaultAssetToken || !fromToken || !amount || !walletAddress) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  let depositAmount = amount;
  if (fromToken.toLowerCase() !== vaultAssetToken.toLowerCase()) {
    const params = new URLSearchParams({
      fromChain: String(DEFAULT_CHAIN_ID),
      toChain: String(DEFAULT_CHAIN_ID),
      fromToken,
      toToken: vaultAssetToken,
      fromAmount: amount,
      fromAddress: walletAddress,
      toAddress: walletAddress,
      slippage: "0.01",
    });
    const headers: HeadersInit = {};
    if (process.env.LIFI_API_KEY) headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;
    const quoteRes = await fetch(`https://li.quest/v1/quote?${params}`, {
      headers,
      cache: "no-store",
    });
    const quote = await quoteRes.json();
    if (!quoteRes.ok) {
      return NextResponse.json(
        { error: quote.message || quote.error || "Failed to preview route" },
        { status: 502 },
      );
    }
    depositAmount = quote.estimate?.toAmountMin || quote.estimate?.toAmount;
  }

  const shares = await client.readContract({
    address: vaultAddress,
    abi: erc4626PreviewAbi,
    functionName: "previewDeposit",
    args: [BigInt(depositAmount)],
  });

  return NextResponse.json({ shares: shares.toString() });
}
