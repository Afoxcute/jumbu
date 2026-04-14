import { encodeFunctionData, erc20Abi } from "viem";
import { BASE_TOKENS } from "@/lib/constants";
import {
  EARN_DEPOSIT_SUPPORTED_TOKEN_LABEL,
  isSupportedEarnDepositTokenAddress,
} from "@/lib/lifi/earn-deposit-tokens";
import { fetchLiQuestQuote } from "@/lib/lifi/quest-quote";
import type { VaultTxCall } from "@/lib/vaults/types";

type TxReq = { to?: string; data?: string; value?: string };
type Est = { toAmountMin?: string; toAmount?: string; approvalAddress?: string };

/**
 * Composer vault deposit: `toToken` = vault contract address (Earn / Composer vault recipe).
 * Same-chain or cross-asset: LI.FI routes swap + deposit as needed.
 *
 * @see https://docs.li.fi/earn/quickstart — step 4, deposit via Composer
 * @see https://docs.li.fi/composer/recipes/vault-deposits
 */
export async function tryComposerVaultDeposit(params: {
  fromChain: number;
  toChain: number;
  walletAddress: `0x${string}`;
  vaultAddress: `0x${string}`;
  fromToken: `0x${string}`;
  amount: string;
}): Promise<
  | { ok: true; calls: VaultTxCall[]; toAmountMin?: string; toAmount?: string }
  | { ok: false; error: string }
> {
  if (!isSupportedEarnDepositTokenAddress(params.fromToken)) {
    return {
      ok: false,
      error: `Earn deposit supports only ${EARN_DEPOSIT_SUPPORTED_TOKEN_LABEL} source tokens`,
    };
  }

  const sp = new URLSearchParams({
    fromChain: String(params.fromChain),
    toChain: String(params.toChain),
    fromToken: params.fromToken,
    toToken: params.vaultAddress,
    fromAmount: params.amount,
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
      "Composer quote failed";
    return { ok: false, error: msg };
  }

  const tr = q.transactionRequest as TxReq | undefined;
  if (!tr?.to || !tr.data) {
    return { ok: false, error: "Composer quote missing transactionRequest" };
  }

  const est = q.estimate as Est | undefined;
  const approvalAddress = (est?.approvalAddress ?? q.approvalAddress) as `0x${string}` | undefined;

  const calls: VaultTxCall[] = [];
  const isNativeEth = params.fromToken.toLowerCase() === BASE_TOKENS.ETH.toLowerCase();

  if (approvalAddress && !isNativeEth) {
    calls.push({
      to: params.fromToken,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [approvalAddress, BigInt(params.amount)],
      }),
    });
  }

  calls.push({
    to: tr.to as `0x${string}`,
    data: tr.data as `0x${string}`,
    value: tr.value,
  });

  return {
    ok: true,
    calls,
    toAmountMin: est?.toAmountMin,
    toAmount: est?.toAmount,
  };
}
