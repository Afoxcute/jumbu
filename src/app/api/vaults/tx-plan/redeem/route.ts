import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { verifyAuth } from "@/lib/auth";

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
    shares?: string;
  };
  const { walletAddress, vaultAddress, shares } = body;
  if (!walletAddress || !vaultAddress || !shares) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
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
