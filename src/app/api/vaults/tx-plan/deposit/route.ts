import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, erc20Abi } from "viem";
import { verifyAuth } from "@/lib/auth";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
import { tryComposerVaultDeposit } from "@/lib/lifi/composer-deposit";
import { shouldTryEarnComposerDeposit } from "@/lib/lifi/earn-deposit-policy";
import {
  EARN_DEPOSIT_SUPPORTED_TOKEN_LABEL,
  isSupportedEarnDepositTokenAddress,
} from "@/lib/lifi/earn-deposit-tokens";
import { fetchEarnVaultSafe } from "@/lib/lifi/earn-client";
import { fetchLiQuestQuote } from "@/lib/lifi/quest-quote";

const erc4626DepositAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "deposit",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
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
    fromToken?: `0x${string}`;
    amount?: string;
  };

  const { walletAddress, vaultAddress, vaultAssetToken, fromToken, amount } = body;
  if (!walletAddress || !vaultAddress || !vaultAssetToken || !fromToken || !amount) {
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

    const composer = await tryComposerVaultDeposit({
      chainId: DEFAULT_CHAIN_ID,
      walletAddress,
      vaultAddress,
      fromToken,
      amount,
    });
    if (composer.ok) {
      return NextResponse.json({ calls: composer.calls });
    }
  }

  const calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: string }> = [];
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
    if (!ok || !quote.transactionRequest) {
      return NextResponse.json(
        {
          error:
            (typeof quote.message === "string" && quote.message) ||
            (typeof quote.error === "string" && quote.error) ||
            "Failed to build LI.FI route",
        },
        { status: 502 },
      );
    }

    const approvalAddress = (quote.estimate?.approvalAddress ||
      quote.approvalAddress) as `0x${string}` | undefined;
    if (!approvalAddress) {
      return NextResponse.json(
        { error: "LI.FI quote missing approval address for this route" },
        { status: 502 },
      );
    }
    calls.push({
      to: fromToken,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [approvalAddress, BigInt(amount)],
      }),
    });

    calls.push({
      to: quote.transactionRequest.to as `0x${string}`,
      data: quote.transactionRequest.data as `0x${string}`,
      value: quote.transactionRequest.value,
    });
    depositAmount =
      quote.estimate?.toAmountMin || quote.estimate?.toAmount || "";
    if (!depositAmount) {
      return NextResponse.json(
        { error: "LI.FI quote did not return an output amount" },
        { status: 502 },
      );
    }
  }

  calls.push({
    to: vaultAssetToken,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [vaultAddress, BigInt(depositAmount)],
    }),
  });

  calls.push({
    to: vaultAddress,
    data: encodeFunctionData({
      abi: erc4626DepositAbi,
      functionName: "deposit",
      args: [BigInt(depositAmount), walletAddress],
    }),
  });

  return NextResponse.json({ calls });
}
