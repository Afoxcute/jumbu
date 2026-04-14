import { unstable_cache } from "next/cache";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
import { fetchEarnVaults } from "@/lib/lifi/earn-client";
import type { EarnNormalizedVault } from "@/lib/lifi/earn-types";
import { VAULT_CATALOG } from "@/lib/vaults/catalog";
import type { VaultEarnMeta, VaultStatsItem } from "@/lib/vaults/types";

const EARN_BROWSE_CHAIN_IDS = [8453, 1, 42161, 10, 137, 56];
const SUPPORTED_VAULT_ASSETS = new Set(["USDC", "WETH", "ETH"]);

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

function chainName(chainId: number, network?: string): string {
  const byId: Record<number, string> = {
    1: "Ethereum",
    10: "Optimism",
    56: "BSC",
    137: "Polygon",
    8453: "Base",
    42161: "Arbitrum",
  };
  return byId[chainId] || network || `Chain ${chainId}`;
}

function pickUnderlyingToken(v: EarnNormalizedVault): { symbol: string; address: `0x${string}`; decimals: number } | null {
  const t = v.underlyingTokens?.find((x) =>
    SUPPORTED_VAULT_ASSETS.has((x.symbol || "").toUpperCase()),
  );
  if (!t?.address || !t.symbol || typeof t.decimals !== "number") return null;
  return {
    symbol: t.symbol.toUpperCase(),
    address: t.address as `0x${string}`,
    decimals: t.decimals,
  };
}

const loadEarnVaultsForBrowse = unstable_cache(
  async (): Promise<EarnNormalizedVault[]> => {
    try {
      const chunks = await Promise.all(
        EARN_BROWSE_CHAIN_IDS.map(async (chainId) => {
          try {
            const { data } = await fetchEarnVaults({
              chainId,
              sortBy: "apy",
              limit: 500,
            });
            return data ?? [];
          } catch {
            return [];
          }
        }),
      );
      return chunks.flat();
    } catch {
      return [];
    }
  },
  ["lifi-earn-vaults-browse", EARN_BROWSE_CHAIN_IDS.join(",")],
  { revalidate: 300 },
);

export async function getEnrichedVaultCatalog(): Promise<VaultStatsItem[]> {
  const earnVaults = await loadEarnVaultsForBrowse();
  const byAddressChain = new Map(
    earnVaults.map((v) => [`${v.chainId}:${v.address.toLowerCase()}`, v]),
  );

  const curated = VAULT_CATALOG.map((row) => {
    const hit = byAddressChain.get(
      `${row.chain.id}:${row.contracts.vaultAddress.toLowerCase()}`,
    );
    if (!hit) return row;

    const apyDec = pickApyDecimal(hit);
    const pct = apyDec != null ? (apyDec * 100).toFixed(2) : row.yield?.["7d"];
    const usd = hit.analytics?.tvl?.usd;

    return {
      ...row,
      yield: pct != null ? { "7d": pct } : row.yield,
      tvl: usd ? { formatted: formatUsdShort(usd) } : row.tvl,
      earn: toEarnMeta(hit),
    };
  });

  const curatedKeys = new Set(
    curated.map((v) => `${v.chain.id}:${v.contracts.vaultAddress.toLowerCase()}`),
  );

  const discovered: VaultStatsItem[] = earnVaults
    .filter((v) => v.isTransactional)
    .map((v) => {
      const asset = pickUnderlyingToken(v);
      if (!asset) return null;
      const apyDec = pickApyDecimal(v);
      return {
        id: v.slug || `${v.chainId}-${v.address}`,
        name: v.name || `${asset.symbol} Earn`,
        chain: { id: v.chainId, name: chainName(v.chainId, v.network) },
        asset,
        contracts: { vaultAddress: v.address as `0x${string}` },
        yield: apyDec != null ? { "7d": (apyDec * 100).toFixed(2) } : undefined,
        tvl: v.analytics?.tvl?.usd
          ? { formatted: formatUsdShort(v.analytics.tvl.usd) }
          : undefined,
        earn: toEarnMeta(v),
      } as VaultStatsItem;
    })
    .filter((v): v is VaultStatsItem => !!v)
    .filter(
      (v) =>
        !curatedKeys.has(`${v.chain.id}:${v.contracts.vaultAddress.toLowerCase()}`),
    );

  return [...curated, ...discovered];
}
