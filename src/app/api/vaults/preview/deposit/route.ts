import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { verifyAuth } from "@/lib/auth";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "@/lib/constants";
import { shouldTryEarnComposerDeposit } from "@/lib/lifi/earn-deposit-policy";
import {
  EARN_DEPOSIT_SUPPORTED_TOKEN_LABEL,
  isSupportedEarnDepositTokenAddress,
} from "@/lib/lifi/earn-deposit-tokens";
import { fetchEarnVaultSafe } from "@/lib/lifi/earn-client";
import { fetchLiQuestQuote } from "@/lib/lifi/quest-quote";

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
  const sourceChain = Number(sp.get("fromChain") || DEFAULT_CHAIN_ID);
  const targetChain = Number(sp.get("toChain") || DEFAULT_CHAIN_ID);
  if (!vaultAddress || !vaultAssetToken || !fromToken || !amount || !walletAddress) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  if (
    !SUPPORTED_CHAIN_IDS.includes(sourceChain as (typeof SUPPORTED_CHAIN_IDS)[number]) ||
    !SUPPORTED_CHAIN_IDS.includes(targetChain as (typeof SUPPORTED_CHAIN_IDS)[number])
  ) {
    return NextResponse.json({ error: "Unsupported source or target chain" }, { status: 400 });
  }

  const earnMeta = await fetchEarnVaultSafe(targetChain, vaultAddress);
  if (shouldTryEarnComposerDeposit(earnMeta)) {
    if (!isSupportedEarnDepositTokenAddress(fromToken)) {
      return NextResponse.json(
        {
          error: `Earn deposit supports only ${EARN_DEPOSIT_SUPPORTED_TOKEN_LABEL} source tokens`,
        },
        { status: 400 },
      );
    }

    const params = new URLSearchParams({
      fromChain: String(sourceChain),
      toChain: String(targetChain),
      fromToken,
      toToken: vaultAddress,
      fromAmount: amount,
      fromAddress: walletAddress,
      toAddress: walletAddress,
      slippage: "0.01",
    });
    const { ok, quote } = await fetchLiQuestQuote(params);
    const q = quote as {
      transactionRequest?: unknown;
      estimate?: { toAmountMin?: string; toAmount?: string };
      message?: string;
      error?: string;
    };
    if (ok && q.transactionRequest) {
      const out = q.estimate?.toAmountMin || q.estimate?.toAmount || amount;
      return NextResponse.json({ shares: String(out) });
    }
  }

  if (sourceChain !== DEFAULT_CHAIN_ID || targetChain !== DEFAULT_CHAIN_ID) {
    return NextResponse.json(
      { error: "Cross-chain preview requires Earn Composer route availability" },
      { status: 502 },
    );
  }

  let depositAmount = amount;
  if (fromToken.toLowerCase() !== vaultAssetToken.toLowerCase()) {
    const params = new URLSearchParams({
      fromChain: String(sourceChain),
      toChain: String(targetChain),
      fromToken,
      toToken: vaultAssetToken,
      fromAmount: amount,
      fromAddress: walletAddress,
      toAddress: walletAddress,
      slippage: "0.01",
    });
    const { ok, quote } = await fetchLiQuestQuote(params);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            (typeof quote.message === "string" && quote.message) ||
            (typeof quote.error === "string" && quote.error) ||
            "Failed to preview route",
        },
        { status: 502 },
      );
    }
    depositAmount =
      quote.estimate?.toAmountMin || quote.estimate?.toAmount || "";
    if (!depositAmount) {
      return NextResponse.json(
        { error: "LI.FI quote did not return an output amount" },
        { status: 502 },
      );
    }
  }

  const shares = await client.readContract({
    address: vaultAddress,
    abi: erc4626PreviewAbi,
    functionName: "previewDeposit",
    args: [BigInt(depositAmount)],
  });

  return NextResponse.json({ shares: shares.toString() });
}
