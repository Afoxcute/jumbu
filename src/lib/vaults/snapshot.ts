import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { base } from "viem/chains";
import { SYMBOL_TO_COINGECKO, TOKEN_ADDRESSES } from "@/lib/constants";
import { VAULT_CATALOG } from "@/lib/vaults/catalog";
import type { WalletSnapshot } from "@/lib/vaults/types";

const erc4626Abi = [
  {
    type: "function",
    stateMutability: "view",
    name: "previewRedeem",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "convertToAssets",
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

export async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(symbols.map((s) => s.toLowerCase())));
  const ids = unique
    .map((sym) => SYMBOL_TO_COINGECKO[sym])
    .filter(Boolean)
    .join(",");
  if (!ids) return {};

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { cache: "no-store" },
  );
  if (!res.ok) return {};
  const json = (await res.json()) as Record<string, { usd?: number }>;

  const prices: Record<string, number> = {};
  for (const sym of unique) {
    const id = SYMBOL_TO_COINGECKO[sym];
    const usd = id ? json[id]?.usd : undefined;
    if (usd) prices[sym] = usd;
  }
  return prices;
}

export async function getWalletSnapshot(walletAddress: `0x${string}`): Promise<WalletSnapshot> {
  const symbols = Array.from(
    new Set(VAULT_CATALOG.map((v) => v.asset.symbol).concat(["USDC", "USDT"])),
  );
  const prices = await getPrices(symbols);

  const walletAssets = await Promise.all(
    symbols.map(async (symbol) => {
      const token = TOKEN_ADDRESSES[symbol];
      if (!token) return null;
      const decimals =
        symbol === "USDC" || symbol === "USDT" || symbol === "EURC" ? 6 : symbol === "cbBTC" ? 8 : 18;
      const raw = await client.readContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      });
      const balance = formatUnits(raw, decimals);
      const usd = (parseFloat(balance) * (prices[symbol.toLowerCase()] ?? 1)).toFixed(2);
      return { symbol, balance, balanceUsd: usd, decimals };
    }),
  );

  const positions = await Promise.all(
    VAULT_CATALOG.map(async (vault) => {
      const shares = await client.readContract({
        address: vault.contracts.vaultAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      });
      if (shares <= 0n) return null;

      let assets = 0n;
      try {
        assets = await client.readContract({
          address: vault.contracts.vaultAddress,
          abi: erc4626Abi,
          functionName: "previewRedeem",
          args: [shares],
        });
      } catch {
        assets = await client.readContract({
          address: vault.contracts.vaultAddress,
          abi: erc4626Abi,
          functionName: "convertToAssets",
          args: [shares],
        });
      }

      return { vault, position: { shares, assets } };
    }),
  );

  const compactAssets = walletAssets.filter(
    (asset): asset is { symbol: string; balance: string; balanceUsd: string; decimals: number } =>
      asset !== null,
  );
  const compactPositions = positions.filter(
    (position): position is { vault: (typeof VAULT_CATALOG)[number]; position: { shares: bigint; assets: bigint } } =>
      position !== null,
  );
  const walletBalanceUsd = compactAssets.reduce(
    (sum, a) => sum + parseFloat(a.balanceUsd),
    0,
  );

  return {
    walletBalanceUsd,
    walletAssets: compactAssets,
    positions: compactPositions,
    prices,
  };
}
