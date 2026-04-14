"use client";

import { useState, useCallback } from "react";
import type { Address, Hex } from "viem";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";

type Step = "idle" | "processing" | "success" | "error";

function parseErrorMessage(err: unknown): string {
  if (!err) return "Unknown transaction error";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    const anyErr = err as {
      message?: string;
      shortMessage?: string;
      details?: string;
      cause?: { message?: string };
      code?: string | number;
    };
    const message =
      anyErr.shortMessage ||
      anyErr.message ||
      anyErr.details ||
      anyErr.cause?.message ||
      "Unknown transaction error";
    const code =
      anyErr.code !== undefined ? ` [code: ${String(anyErr.code)}]` : "";
    return `${message}${code}`;
  } catch {
    return "Unknown transaction error";
  }
}

export function useVaultDeposit({
  vault,
  vaultAssetToken,
  onConfirmed,
  onError,
}: {
  vault: Address;
  vaultAssetToken: Address;
  onConfirmed?: (hash: Hex) => void;
  onError?: (err: Error) => void;
}) {
  const { client } = useSmartWallets();
  const { user } = usePrivy();
  const [step, setStep] = useState<Step>("idle");
  const [hash, setHash] = useState<Hex | undefined>();

  const walletAddress = (user?.smartWallet?.address ??
    user?.wallet?.address) as Address | undefined;

  const deposit = useCallback(
    async ({
      token,
      amount,
      fromChain,
      toChain,
    }: {
      token: Address;
      amount: bigint;
      fromChain?: number;
      toChain?: number;
    }) => {
      if (!client) {
        onError?.(new Error("Privy smart wallet client unavailable"));
        setStep("error");
        return;
      }
      if (!walletAddress) {
        onError?.(new Error("Wallet address unavailable"));
        setStep("error");
        return;
      }
      setStep("processing");
      try {
        const planRes = await fetch("/api/vaults/tx-plan/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vault,
            vaultAssetToken,
            fromToken: token,
            amount: amount.toString(),
            fromChain,
            toChain,
          }),
        });
        const plan = await planRes.json();
        if (!planRes.ok || !Array.isArray(plan.calls)) {
          throw new Error(
            plan.error ||
              `Failed to build deposit transaction (HTTP ${planRes.status})`,
          );
        }
        if (plan.calls.length === 0) {
          throw new Error("Transaction plan is empty");
        }

        const txHash = await client.sendTransaction({
          calls: plan.calls.map((tx: { to: string; data: string; value?: string }) => ({
            to: tx.to as Address,
            data: tx.data as Hex,
            value: tx.value ? BigInt(tx.value) : undefined,
          })),
        });
        setHash(txHash);
        setStep("success");
        onConfirmed?.(txHash);
      } catch (err: unknown) {
        setStep("error");
        onError?.(new Error(parseErrorMessage(err)));
      }
    },
    [client, walletAddress, vault, vaultAssetToken, onConfirmed, onError],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setHash(undefined);
  }, []);

  return {
    deposit,
    step,
    isLoading: step === "processing",
    isSuccess: step === "success",
    hash,
    reset,
  };
}

export function useVaultRedeem({
  vault,
  vaultAssetToken,
  onConfirmed,
  onError,
}: {
  vault: Address;
  vaultAssetToken: Address;
  onConfirmed?: (hash: Hex) => void;
  onError?: (err: Error) => void;
}) {
  const { client } = useSmartWallets();
  const { user } = usePrivy();
  const [step, setStep] = useState<Step>("idle");
  const [hash, setHash] = useState<Hex | undefined>();

  const walletAddress = (user?.smartWallet?.address ??
    user?.wallet?.address) as Address | undefined;

  const redeem = useCallback(
    async ({
      shares,
      fromChain,
      toChain,
    }: {
      shares: bigint;
      fromChain?: number;
      toChain?: number;
    }) => {
      if (!client) {
        onError?.(new Error("Privy smart wallet client unavailable"));
        setStep("error");
        return;
      }
      if (!walletAddress) {
        onError?.(new Error("Wallet address unavailable"));
        setStep("error");
        return;
      }
      setStep("processing");
      try {
        const planRes = await fetch("/api/vaults/tx-plan/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vault,
            vaultAssetToken,
            shares: shares.toString(),
            fromChain,
            toChain,
          }),
        });
        const plan = await planRes.json();
        if (!planRes.ok || !Array.isArray(plan.calls)) {
          throw new Error(plan.error || "Failed to build redeem transaction");
        }

        const txHash = await client.sendTransaction({
          calls: plan.calls.map((tx: { to: string; data: string; value?: string }) => ({
            to: tx.to as Address,
            data: tx.data as Hex,
            value: tx.value ? BigInt(tx.value) : undefined,
          })),
        });
        setHash(txHash);
        setStep("success");
        onConfirmed?.(txHash);
      } catch (err: any) {
        setStep("error");
        onError?.(
          err instanceof Error
            ? err
            : new Error(err?.message || "Transaction failed"),
        );
      }
    },
    [client, walletAddress, vault, vaultAssetToken, onConfirmed, onError],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setHash(undefined);
  }, []);

  return {
    redeem,
    step,
    isLoading: step === "processing",
    isSuccess: step === "success",
    hash,
    instant: true,
    reset,
  };
}
