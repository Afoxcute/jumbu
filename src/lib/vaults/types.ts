export interface VaultAsset {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
}

/** Enrichment from LI.FI Earn Data API (https://earn.li.fi) */
export interface VaultEarnMeta {
  slug: string;
  protocolName?: string;
  protocolLogoUri?: string;
  isTransactional: boolean;
  isRedeemable: boolean;
  vaultName?: string;
  tags?: string[];
}

export interface VaultStatsItem {
  id: string;
  name: string;
  chain: { id: number; name: string };
  asset: VaultAsset;
  contracts: { vaultAddress: `0x${string}` };
  yield?: { "7d"?: string };
  merklRewardYield?: string;
  tvl?: { formatted?: string };
  earn?: VaultEarnMeta;
}

export interface UserVaultPosition {
  shares: bigint;
  assets: bigint;
}

export interface TypedPosition {
  vault: VaultStatsItem;
  position: UserVaultPosition;
}

export interface WalletAsset {
  symbol: string;
  balance: string;
  balanceUsd: string;
}

export interface WalletSnapshot {
  walletBalanceUsd: number;
  walletAssets: WalletAsset[];
  positions: TypedPosition[];
  prices: Record<string, number>;
}

export interface VaultTxCall {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string;
}

export interface VaultTxPlan {
  calls: VaultTxCall[];
}
