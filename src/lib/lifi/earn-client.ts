import { LIFI_EARN_API_BASE, lifiApiHeaders } from "@/lib/lifi/config";
import type {
  EarnChainsResponse,
  EarnNormalizedVault,
  EarnPortfolioPositionsResponse,
  EarnProtocolsResponse,
  EarnVaultsListResponse,
} from "@/lib/lifi/earn-types";

async function earnJson<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
  const q = searchParams?.toString();
  const url = `${LIFI_EARN_API_BASE}${path}${q ? `?${q}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...lifiApiHeaders(),
    },
    cache: "no-store",
  });
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    const msg =
      typeof (body as { message?: string }).message === "string"
        ? (body as { message: string }).message
        : `Earn API ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function fetchEarnVaults(params: {
  chainId: number;
  sortBy?: "apy" | "tvl" | "name";
  limit?: number;
  cursor?: string;
}): Promise<EarnVaultsListResponse> {
  const sp = new URLSearchParams({ chainId: String(params.chainId) });
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", params.cursor);
  return earnJson<EarnVaultsListResponse>("/earn/vaults", sp);
}

export async function fetchEarnVault(chainId: number, vaultAddress: string): Promise<EarnNormalizedVault> {
  const path = `/earn/vaults/${chainId}/${vaultAddress}`;
  return earnJson<EarnNormalizedVault>(path);
}

export async function fetchEarnVaultSafe(
  chainId: number,
  vaultAddress: string,
): Promise<EarnNormalizedVault | null> {
  try {
    return await fetchEarnVault(chainId, vaultAddress);
  } catch {
    return null;
  }
}

export async function fetchEarnChains(): Promise<EarnChainsResponse> {
  return earnJson<EarnChainsResponse>("/earn/chains");
}

export async function fetchEarnProtocols(): Promise<EarnProtocolsResponse> {
  return earnJson<EarnProtocolsResponse>("/earn/protocols");
}

export async function fetchEarnPortfolioPositions(
  walletAddress: string,
): Promise<EarnPortfolioPositionsResponse> {
  return earnJson<EarnPortfolioPositionsResponse>(`/earn/portfolio/${walletAddress}/positions`);
}
