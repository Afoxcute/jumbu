# jumbu

**Onchain savings made easy.**

jumbu is a mobile savings app that lets anyone earn yield on their money without understanding crypto. Powered by LI.FI routing and vault adapters, it replaces the complexity of DeFi with a single AI chat interface. Just tell jumbu what you're saving for, and it handles everything.

**[Repository](https://github.com/Afoxcute/jumbu)** · **[Demo Video](https://www.youtube.com/watch?v=lt3f9EXybj8&t=3s)**

---

## How it works

1. **Sign up with email or Google.** No wallet, no seed phrases. A gasless smart account (ERC-4337) is created behind the scenes. All transactions are gas-sponsored — users never pay gas fees.
2. **Fund your account** via MoonPay (card, Apple Pay, Google Pay) or receive tokens from an external wallet.
3. **Talk to the AI.** Say "I want to save for a trip to Japan" and the AI checks rates, recommends the best vault, sets a savings goal, and presents a one-tap deposit confirmation.
4. **Earn automatically.** LI.FI routes deposits into vault assets and jumbu handles the vault transaction flow. Zero management fees, zero performance fees.
5. **Withdraw anytime.** No lock-ups, no penalties.

## Features

- **AI savings advisor** — Conversational chat with voice input. The AI can check rates, deposit, withdraw, set goals, and narrate your activity in plain English.
- **Gasless transactions** — All on-chain transactions are gas-sponsored via Pimlico. Users never need ETH for gas.
- **Savings goals** — Set targets like "Japan trip: $5,000" and track progress visually on each position card.
- **Cross-asset deposits** — Deposit USDC into any vault (yoBTC, yoEUR, etc). The YO SDK handles token swaps automatically.
- **Send and receive** — Transfer tokens directly from the app with address validation and token selection.
- **MoonPay on-ramp** — Buy crypto with a card without leaving the app.
- **Activity narration** — AI summarizes your recent transactions in 2-3 sentences.
- **Real mainnet transactions** — All deposits and withdrawals happen on Base mainnet. No testnet, no mocks.
- **PWA support** — Installable as a home screen app with offline fallback.

## LI.FI + vault integration

jumbu uses LI.FI quotes/routes for swap and bridge execution, then submits ERC-4626 vault actions through Privy smart wallets.

**Supported vaults:**

| Vault | Friendly name | Underlying asset |
|-------|---------------|-----------------|
| yoUSD | Dollar Savings | USDC |
| yoETH | Ether Savings | WETH |
| yoBTC | Bitcoin Savings | cbBTC |
| yoEUR | Euro Savings | EURC |

**Execution flow:**

- LI.FI quote API is used for route discovery and transaction request generation.
- Server tx-plan endpoints compose route calls with ERC-4626 `deposit` / `redeem` calls.
- UI and chat execute plans via Privy's `useSmartWallets().client.sendTransaction()`.

All transactions are executed through Privy's `useSmartWallets().client.sendTransaction()` as batched UserOperations (ERC-4337).

## AI chat

The AI assistant uses DeepSeek Chat (`deepseek-chat`) via the Vercel AI SDK with 10 tools:

| Tool | Type | Description |
|------|------|-------------|
| `get_vault_rates` | Server | Current interest rates for all savings accounts |
| `get_wallet_balance` | Server | User's wallet balance |
| `get_user_positions` | Server | Current savings positions |
| `get_swap_quote` | Server | Token swap quotes via LI.FI API |
| `create_goal` | Server | Set a savings goal |
| `get_goals` | Server | Retrieve savings goals |
| `deposit` | Client | Save into a vault (requires user confirmation) |
| `withdraw` | Client | Withdraw from a vault (requires user confirmation) |
| `swap` | Client | Swap tokens (requires user confirmation) |
| `swap_and_deposit` | Client | Swap + deposit in one step (requires user confirmation) |

Client-side tools render as confirmation cards in the chat — the AI never moves funds autonomously.

Voice input is powered by Groq Whisper (`whisper-large-v3-turbo`).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS v4, Framer Motion |
| AI | Vercel AI SDK v6, DeepSeek Chat, Groq Whisper |
| Auth | Privy (ERC-4337 smart accounts) |
| Gas sponsorship | Pimlico |
| Routing | LI.FI API / SDK |
| Database | Neon Postgres, Drizzle ORM |
| On-ramp | MoonPay (via Privy) |
| Swaps | LI.FI |
| Hosting | Vercel |

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (fonts, metadata, providers)
│   ├── sw.ts                       # Service worker (PWA)
│   ├── api/
│   │   ├── chat/route.ts           # AI chat endpoint
│   │   ├── activity/route.ts       # Activity CRUD
│   │   ├── activity/narrate/route.ts  # AI activity narration
│   │   ├── goals/route.ts          # Savings goals CRUD
│   │   ├── swap-quote/route.ts     # 0x swap quote proxy
│   │   └── voice/transcribe/route.ts  # Groq Whisper transcription
│   └── app/
│       ├── layout.tsx              # Auth guard + chat bar
│       └── page.tsx                # Dashboard
├── components/
│   ├── chat/                       # AI chat UI (6 components)
│   ├── dashboard/                  # Dashboard screens + sheets (14 components)
│   ├── landing/                    # Landing page sections (6 components)
│   └── ui/                         # Shared UI components
├── contexts/                       # Chat + goals context providers
├── hooks/                          # 8 custom hooks
├── lib/
│   ├── ai/                         # System prompt, tools, window messages
│   ├── db/                         # Drizzle client + schema (goals, activities)
│   ├── constants.ts                # Vault config, token addresses, chain IDs
│   └── format.ts                   # USD, APY, shares formatters
└── providers/
    └── index.tsx                   # Provider stack (Privy → SmartWallets → Query → wagmi)
```

## Getting started

### Prerequisites

- Node.js 20+
- [Bun](https://bun.sh) (package manager)
- A [Privy](https://privy.io) app with smart wallets enabled
- A [Neon](https://neon.tech) Postgres database

### Setup

```bash
git clone https://github.com/Afoxcute/jumbu.git
cd jumbu
bun install
```

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID |
| `PRIVY_APP_SECRET` | Privy app secret |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Alchemy RPC key for Base |
| `DATABASE_URL` | Neon Postgres connection string |
| `DEEPSEEK_API_KEY` | DeepSeek API key for chat |
| `GROQ_API_KEY` | Groq API key for voice transcription |
| `LIFI_API_KEY` | LI.FI API key for routing and quotes |

Run database migrations:

```bash
bunx drizzle-kit push
```

Start the dev server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Runtime QA (dev)

- **Desktop**: The full-screen “mobile only” overlay runs in **production** only. In `next dev`, you can exercise `/app` on desktop without `NEXT_PUBLIC_DISABLE_DESKTOP_BLOCKER`. For production desktop testing, set `NEXT_PUBLIC_DISABLE_DESKTOP_BLOCKER=1` in `.env.local`.
- **Privy + Solana**: This app is **EVM-only** (`walletChainType: "ethereum-only"`). If the browser console shows *Solana wallet login enabled but no connectors*, turn **off** Solana wallet login in the [Privy dashboard](https://dashboard.privy.io/) for this app. Importing `@privy-io/react-auth/solana` here would require extra Solana packages (for example `@solana-program/memo`) even though the product does not use Solana.
- **Privy + Add funds (MoonPay)**: The **Add** button calls `fundWallet`. That requires **Account funding** (card / on-ramp, etc.) to be enabled for your app in the [Privy dashboard](https://dashboard.privy.io/). If it is not enabled, the app opens **Receive** instead so the user can copy the address and send USDC from another wallet.
- **Signed-in flows** (swap, swap+deposit, deposit, withdraw, chat tool approvals): require a real Privy session and funded smart wallet on Base; confirm in browser devtools that `/api/swap-quote`, `/api/vaults/tx-plan/*`, and `/api/vaults/preview/*` return 200 when exercising each path.

## Provider stack

The provider nesting order is critical:

```
PrivyProvider
  └── SmartWalletsProvider
        └── QueryClientProvider
              └── WagmiProvider        ← from @privy-io/wagmi (NOT wagmi)
```

## Database schema

**goals** — one savings goal per vault per user

| Column | Type |
|--------|------|
| id | uuid (PK) |
| userId | text |
| vaultId | text |
| name | text |
| targetAmount | numeric(28,18) |
| currency | text |
| createdAt | timestamp |

**activities** — on-chain transaction history

| Column | Type |
|--------|------|
| id | uuid (PK) |
| userId | text |
| type | text (deposit/withdraw/swap) |
| amount | text |
| tokenSymbol | text |
| vaultId | text (nullable) |
| txHash | text (nullable) |
| createdAt | timestamp |

## Hackathon

Built for [Hack with YO: Designing Smart DeFi Savings](https://dorahacks.io/hackathon/yo/detail) on DoraHacks.

## License

MIT

---

Built by [s0nderlabs](https://github.com/s0nderlabs)
