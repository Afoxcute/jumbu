import { BASE_TOKENS } from "@/lib/constants";

const EARN_DEPOSIT_SYMBOLS = ["USDC", "ETH"] as const;

const EARN_DEPOSIT_TOKEN_ADDRESSES = new Set(
  [BASE_TOKENS.USDC, BASE_TOKENS.ETH].map((a) =>
    a.toLowerCase(),
  ),
);

export function isSupportedEarnDepositTokenAddress(token: `0x${string}`): boolean {
  return EARN_DEPOSIT_TOKEN_ADDRESSES.has(token.toLowerCase());
}

export function isSupportedEarnDepositTokenSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return s === "USDC" || s === "ETH";
}

export const EARN_DEPOSIT_SUPPORTED_TOKEN_LABEL = EARN_DEPOSIT_SYMBOLS.join(
  " & ",
);
