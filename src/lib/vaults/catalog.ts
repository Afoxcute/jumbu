import { DEFAULT_CHAIN_ID, TOKEN_ADDRESSES, VAULTS } from "@/lib/constants";
import type { VaultStatsItem } from "@/lib/vaults/types";

export const VAULT_CATALOG: VaultStatsItem[] = [
  {
    id: "yoUSD",
    name: "Dollar Savings",
    chain: { id: DEFAULT_CHAIN_ID, name: "Base" },
    asset: {
      symbol: "USDC",
      address: TOKEN_ADDRESSES.USDC as `0x${string}`,
      decimals: 6,
    },
    contracts: { vaultAddress: VAULTS.yoUSD.base },
    yield: { "7d": "5.20" },
  },
  {
    id: "yoETH",
    name: "Ether Savings",
    chain: { id: DEFAULT_CHAIN_ID, name: "Base" },
    asset: {
      symbol: "WETH",
      address: TOKEN_ADDRESSES.WETH as `0x${string}`,
      decimals: 18,
    },
    contracts: { vaultAddress: VAULTS.yoETH.base },
    yield: { "7d": "4.40" },
  },
];
