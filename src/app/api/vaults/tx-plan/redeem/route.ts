import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { verifyAuth } from "@/lib/auth";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "@/lib/constants";
import { fetchEarnVaultSafe } from "@/lib/lifi/earn-client";
import { shouldTryEarnComposerRedeem } from "@/lib/lifi/earn-redeem-policy";
import { tryComposerVaultRedeem } from "@/lib/lifi/composer-redeem";

const erc4626RedeemAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "redeem",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    await verifyAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    walletAddress?: `0x${string}`;
    vaultAddress?: `0x${string}`;
    vaultAssetToken?: `0x${string}`;
    shares?: string;
    fromChain?: number;
    toChain?: number;
  };
  const { walletAddress, vaultAddress, vaultAssetToken, shares, fromChain, toChain } = body;
  if (!walletAddress || !vaultAddress || !vaultAssetToken || !shares) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  const sourceChain = Number(fromChain || DEFAULT_CHAIN_ID);
  const targetChain = Number(toChain || DEFAULT_CHAIN_ID);
  if (
    !SUPPORTED_CHAIN_IDS.includes(sourceChain as (typeof SUPPORTED_CHAIN_IDS)[number]) ||
    !SUPPORTED_CHAIN_IDS.includes(targetChain as (typeof SUPPORTED_CHAIN_IDS)[number])
  ) {
    return NextResponse.json({ error: "Unsupported source or target chain" }, { status: 400 });
  }

  const earnMeta = await fetchEarnVaultSafe(sourceChain, vaultAddress);
  if (shouldTryEarnComposerRedeem(earnMeta)) {
    const composer = await tryComposerVaultRedeem({
      fromChain: sourceChain,
      toChain: targetChain,
      walletAddress,
      vaultAddress,
      toToken: vaultAssetToken,
      shares,
    });
    if (composer.ok) {
      return NextResponse.json({ calls: composer.calls });
    }
  }

  if (sourceChain !== DEFAULT_CHAIN_ID || targetChain !== DEFAULT_CHAIN_ID) {
    return NextResponse.json(
      { error: "Cross-chain withdrawals require Earn Composer route availability" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    calls: [
      {
        to: vaultAddress,
        data: encodeFunctionData({
          abi: erc4626RedeemAbi,
          functionName: "redeem",
          args: [BigInt(shares), walletAddress, walletAddress],
        }),
      },
    ],
  });
}
