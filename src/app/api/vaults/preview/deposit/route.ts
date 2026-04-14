import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { verifyAuth } from "@/lib/auth";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
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
  if (!vaultAddress || !vaultAssetToken || !fromToken || !amount || !walletAddress) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const earnMeta = await fetchEarnVaultSafe(DEFAULT_CHAIN_ID, vaultAddress);
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
      fromChain: String(DEFAULT_CHAIN_ID),
      toChain: String(DEFAULT_CHAIN_ID),
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
      if (fromToken.toLowerCase() !== vaultAssetToken.toLowerCase()) {
        const out = q.estimate?.toAmountMin || q.estimate?.toAmount;
        if (out) {
          return NextResponse.json({ shares: String(out) });
        }
      } else {
        const shares = await client.readContract({
          address: vaultAddress,
          abi: erc4626PreviewAbi,
          functionName: "previewDeposit",
          args: [BigInt(amount)],
        });
        return NextResponse.json({ shares: shares.toString() });
      }
    }
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
