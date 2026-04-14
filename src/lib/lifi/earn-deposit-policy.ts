import type { EarnNormalizedVault } from "@/lib/lifi/earn-types";

/**
 * Whether to use the Earn + Composer deposit path (`GET li.quest/v1/quote` with `toToken` = vault).
 *
 * From the Earn docs: `isTransactional: false` means Composer cannot execute deposits for that vault;
 * in that case we fall back to manual swap + ERC-4626 `deposit`. When Earn data is unavailable, we
 * still attempt Composer first (same as discovering a vault off-chain and quoting it).
 *
 * @see https://docs.li.fi/earn/quickstart (discover vault → deposit via Composer)
 * @see https://docs.li.fi/composer/recipes/vault-deposits
 */
export function shouldTryEarnComposerDeposit(earn: EarnNormalizedVault | null): boolean {
  return earn?.isTransactional !== false;
}
