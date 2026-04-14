import { unstable_cache } from "next/cache";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
import { fetchEarnVaults } from "@/lib/lifi/earn-client";
import type { EarnNormalizedVault } from "@/lib/lifi/earn-types";
import { VAULT_CATALOG } from "@/lib/vaults/catalog";
import type { VaultEarnMeta, VaultStatsItem } from "@/lib/vaults/types";

function formatUsdShort(usd: string): string {
  const n = Number(usd);
  if (!Number.isFinite(n)) return usd;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
}

/** Prefer 7d APY; values from Earn are decimals (e.g. 0.0538 → 5.38%). */
function pickApyDecimal(v: EarnNormalizedVault): number | null {
  const a = v.analytics;
  if (!a) return null;
  const d = a.apy7d ?? a.apy30d ?? a.apy1d ?? a.apy?.total ?? null;
  return d != null && Number.isFinite(d) ? d : null;
}

function toEarnMeta(v: EarnNormalizedVault): VaultEarnMeta {
  return {
    slug: v.slug,
    protocolName: v.protocol?.name,
    protocolLogoUri: v.protocol?.logoUri,
    isTransactional: !!v.isTransactional,
    isRedeemable: !!v.isRedeemable,
    vaultName: v.name,
    tags: v.tags,
  };
}

const loadEarnVaultsForBase = unstable_cache(
  async (): Promise<EarnNormalizedVault[]> => {
    try {
      const { data } = await fetchEarnVaults({
        chainId: DEFAULT_CHAIN_ID,
        sortBy: "apy",
        limit: 800,
      });
      return data ?? [];
    } catch {
      return [];
    }
  },
  ["lifi-earn-vaults", "base", String(DEFAULT_CHAIN_ID)],
  { revalidate: 300 },
);

export async function getEnrichedVaultCatalog(): Promise<VaultStatsItem[]> {
  const earnVaults = await loadEarnVaultsForBase();
  const byAddress = new Map(earnVaults.map((v) => [v.address.toLowerCase(), v]));

  return VAULT_CATALOG.map((row) => {
    const hit = byAddress.get(row.contracts.vaultAddress.toLowerCase());
    if (!hit) return row;

    const apyDec = pickApyDecimal(hit);
    const pct =
      apyDec != null ? (apyDec * 100).toFixed(2) : row.yield?.["7d"];
    const usd = hit.analytics?.tvl?.usd;

    return {
      ...row,
      name: row.name,
      yield: pct != null ? { "7d": pct } : row.yield,
      tvl: usd ? { formatted: formatUsdShort(usd) } : row.tvl,
      earn: toEarnMeta(hit),
    };
  });
}
