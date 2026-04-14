import { encodeFunctionData, erc20Abi } from "viem";
import { fetchLiQuestQuote } from "@/lib/lifi/quest-quote";
import type { VaultTxCall } from "@/lib/vaults/types";

type TxReq = { to?: string; data?: string; value?: string };
type Est = { toAmountMin?: string; toAmount?: string; approvalAddress?: string };

/**
 * Composer vault withdraw: `fromToken` = vault contract address.
 *
 * @see https://docs.li.fi/earn/how-it-works — `isRedeemable`
 * @see https://docs.li.fi/composer/overview
 */
export async function tryComposerVaultRedeem(params: {
  fromChain: number;
  toChain: number;
  walletAddress: `0x${string}`;
  vaultAddress: `0x${string}`;
  toToken: `0x${string}`;
  shares: string;
}): Promise<
  | { ok: true; calls: VaultTxCall[]; toAmountMin?: string; toAmount?: string }
  | { ok: false; error: string }
> {
  const sp = new URLSearchParams({
    fromChain: String(params.fromChain),
    toChain: String(params.toChain),
    fromToken: params.vaultAddress,
    toToken: params.toToken,
    fromAmount: params.shares,
    fromAddress: params.walletAddress,
    toAddress: params.walletAddress,
    slippage: "0.01",
  });

  const { ok, quote } = await fetchLiQuestQuote(sp);
  const q = quote as Record<string, unknown>;
  if (!ok) {
    const msg =
      (typeof q.message === "string" && q.message) ||
      (typeof q.error === "string" && q.error) ||
      "Composer redeem quote failed";
    return { ok: false, error: msg };
  }

  const tr = q.transactionRequest as TxReq | undefined;
  if (!tr?.to || !tr.data) {
    return { ok: false, error: "Composer redeem quote missing transactionRequest" };
  }

  const est = q.estimate as Est | undefined;
  const approvalAddress = (est?.approvalAddress ?? q.approvalAddress) as
    | `0x${string}`
    | undefined;
  if (!approvalAddress) {
    return { ok: false, error: "Composer redeem quote missing approvalAddress" };
  }

  const calls: VaultTxCall[] = [
    {
      to: params.vaultAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [approvalAddress, BigInt(params.shares)],
      }),
    },
    {
      to: tr.to as `0x${string}`,
      data: tr.data as `0x${string}`,
      value: tr.value,
    },
  ];

  return {
    ok: true,
    calls,
    toAmountMin: est?.toAmountMin,
    toAmount: est?.toAmount,
  };
}
