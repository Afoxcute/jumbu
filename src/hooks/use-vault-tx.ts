"use client";

import { useState, useCallback } from "react";
import type { Address, Hex } from "viem";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";

type Step = "idle" | "processing" | "success" | "error";

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
    }: {
      token: Address;
      amount: bigint;
      chainId?: number;
    }) => {
      if (!client || !walletAddress) return;
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
          }),
        });
        const plan = await planRes.json();
        if (!planRes.ok || !Array.isArray(plan.calls)) {
          throw new Error(plan.error || "Failed to build deposit transaction");
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
  onConfirmed,
  onError,
}: {
  vault: Address;
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
    async (shares: bigint) => {
      if (!client || !walletAddress) return;
      setStep("processing");
      try {
        const planRes = await fetch("/api/vaults/tx-plan/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            vaultAddress: vault,
            shares: shares.toString(),
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
    [client, walletAddress, vault, onConfirmed, onError],
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
