"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { VaultStatsItem, WalletSnapshot } from "@/lib/vaults/types";
import { VAULT_CATALOG } from "@/lib/vaults/catalog";

export interface VaultService {
  getVaults: () => Promise<VaultStatsItem[]>;
  getSnapshot: (walletAddress?: string) => Promise<WalletSnapshot>;
}

async function getSnapshot(walletAddress?: string): Promise<WalletSnapshot> {
  if (!walletAddress) {
    return { walletBalanceUsd: 0, walletAssets: [], positions: [], prices: {} };
  }

  const params = new URLSearchParams({ walletAddress });
  const res = await fetch(`/api/vaults/snapshot?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch wallet snapshot");
  return res.json();
}

export const vaultService: VaultService = {
  getVaults: async () => {
    try {
      const res = await fetch("/api/vaults/catalog", { cache: "no-store" });
      if (!res.ok) return VAULT_CATALOG;
      return (await res.json()) as VaultStatsItem[];
    } catch {
      return VAULT_CATALOG;
    }
  },
  getSnapshot,
};

export function useVaultsCatalog() {
  return useQuery({
    queryKey: ["vault-catalog"],
    queryFn: vaultService.getVaults,
    staleTime: 120_000,
  });
}

export function useWalletSnapshot(walletAddress?: string) {
  return useQuery({
    queryKey: ["wallet-snapshot", walletAddress],
    queryFn: () => vaultService.getSnapshot(walletAddress),
    enabled: !!walletAddress,
    staleTime: 20_000,
  });
}

export function useLifiVaults() {
  const query = useVaultsCatalog();
  const vaults = useMemo(() => query.data ?? [], [query.data]);
  return { vaults, isLoading: query.isLoading };
}
