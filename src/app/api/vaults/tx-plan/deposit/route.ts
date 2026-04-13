import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, erc20Abi } from "viem";
import { verifyAuth } from "@/lib/auth";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";

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

    const headers: HeadersInit = {};
    if (process.env.LIFI_API_KEY) headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;
    const quoteRes = await fetch(`https://li.quest/v1/quote?${params}`, {
      headers,
      cache: "no-store",
    });
    const quote = await quoteRes.json();
    if (!quoteRes.ok || !quote.transactionRequest) {
      return NextResponse.json(
        { error: quote.message || quote.error || "Failed to build LI.FI route" },
        { status: 502 },
      );
    }

    calls.push({
      to: quote.transactionRequest.to as `0x${string}`,
      data: quote.transactionRequest.data as `0x${string}`,
      value: quote.transactionRequest.value,
    });
    depositAmount = quote.estimate?.toAmountMin || quote.estimate?.toAmount;
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
