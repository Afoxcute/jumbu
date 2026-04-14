/** Subset of LI.FI NormalizedVault + list wrapper (Earn Data API). */

export interface EarnVaultUnderlyingToken {
  address: string;
  symbol: string;
  decimals: number;
  weight?: number;
}

export interface EarnVaultProtocol {
  name?: string;
  logoUri?: string;
  url?: string;
}

export interface EarnVaultAnalytics {
  apy?: {
    base?: number | null;
    reward?: number | null;
    total?: number | null;
  } | null;
  apy1d?: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvl?: {
    usd?: string;
    native?: string;
  } | null;
  updatedAt?: string;
}

export interface EarnNormalizedVault {
  address: string;
  network?: string;
  chainId: number;
  slug: string;
  name?: string;
  description?: string;
  protocol?: EarnVaultProtocol;
  underlyingTokens?: EarnVaultUnderlyingToken[];
  tags?: string[];
  analytics?: EarnVaultAnalytics | null;
  isTransactional: boolean;
  isRedeemable: boolean;
  syncedAt?: string;
}

export interface EarnVaultsListResponse {
  data: EarnNormalizedVault[];
  nextCursor?: string | null;
  total?: number;
}

export interface EarnPortfolioPositionsResponse {
  positions?: EarnPortfolioPosition[];
}

export interface EarnPortfolioPosition {
  chainId: number;
  protocolName?: string;
  asset?: {
    address?: string;
    name?: string;
    symbol?: string;
    decimals?: number;
  };
  balanceUsd?: string;
  balanceNative?: string;
}

export interface EarnChainInfo {
  chainId: number;
  name?: string;
  key?: string;
}

export interface EarnChainsResponse {
  chains?: EarnChainInfo[];
}

export interface EarnProtocolInfo {
  id?: string;
  name?: string;
  slug?: string;
}

export interface EarnProtocolsResponse {
  protocols?: EarnProtocolInfo[];
}
