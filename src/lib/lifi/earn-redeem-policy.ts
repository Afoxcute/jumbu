import type { EarnNormalizedVault } from "@/lib/lifi/earn-types";

/**
 * Whether to use the Earn + Composer redeem path (`GET li.quest/v1/quote` with `fromToken` = vault).
 *
 * From the Earn docs: `isRedeemable: false` means Composer cannot execute withdraw for that vault.
 * When Earn metadata is missing, we optimistically attempt Composer first and fall back to ERC-4626.
 *
 * @see https://docs.li.fi/earn/how-it-works
 */
export function shouldTryEarnComposerRedeem(earn: EarnNormalizedVault | null): boolean {
  return earn?.isRedeemable !== false;
}
