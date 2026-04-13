import type { PrivyClientConfig } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { base, mainnet, arbitrum } from "viem/chains";

/** Satisfies Privy when Solana login is enabled in the dashboard but the app stays EVM-only. */
const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "passkey"],
  appearance: {
    theme: "light",
    accentColor: "#8FAE82",
    walletChainType: "ethereum-only",
    walletList: ["metamask", "coinbase_wallet", "rainbow", "wallet_connect"],
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
    showWalletUIs: false,
  },
  externalWallets: {
    solana: { connectors: solanaConnectors },
  },
  defaultChain: base,
  supportedChains: [base, mainnet, arbitrum],
};
