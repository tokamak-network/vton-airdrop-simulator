# Airdrop Simulator

Tool for querying and analyzing Tokamak Network staker data to simulate airdrop distributions.

- Look up stakers by date range and minimum stake amount
- View staking statistics and distribution summaries
- Export results as CSV
- Powered by on-chain data via The Graph subgraph (with mock data fallback)

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Data Fetching | GraphQL (graphql-request), TanStack Query |
| Blockchain | The Graph (subgraph), viem |
| Testing | Vitest, Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
git clone https://github.com/anthropics/airdrop-simulator.git
cd airdrop-simulator
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUBGRAPH_URL` | The Graph endpoint for the Tokamak airdrop subgraph |
| `ETHEREUM_RPC_URL` | Ethereum JSON-RPC URL (Alchemy, Infura, etc.) |

> The app falls back to mock data when no subgraph URL is configured.

### Running

```bash
pnpm dev        # Start development server
pnpm build      # Production build
pnpm start      # Start production server
pnpm test       # Run tests
pnpm test:watch # Run tests in watch mode
pnpm lint       # Lint
```

## Project Structure

```
src/
├── app/            # Next.js App Router pages and API routes
│   └── api/        # REST API endpoints
├── components/     # React components (UI primitives + feature components)
└── lib/            # Shared utilities, types, GraphQL queries, mock data
subgraph/
├── abis/           # Contract ABIs
├── schema.graphql  # GraphQL schema for indexed entities
└── src/mappings/   # AssemblyScript event handlers
```

## Subgraph

### Overview

The subgraph indexes Tokamak Network contracts on Ethereum mainnet using [The Graph](https://thegraph.com/). Event handlers are written in AssemblyScript.

### Indexed Contracts

| Contract | Address | Start Block | Events |
| --- | --- | --- | --- |
| TON (ERC20) | `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5` | 10,000,000 | `Transfer` |
| TOS (ERC20) | `0x409c4D8cd5d2924b9bc5509230d16a61289c8153` | 10,000,000 | `Transfer` |
| DepositManager V1 | `0x56E465f654393fa48f007Ed7346105c7195CEe43` | 10,837,675 | `Deposited`, `WithdrawalRequested`, `WithdrawalProcessed` |
| DepositManager V2 | `0x0b58ca72b12f01fc05f8f252e226f3e2089bd00e` | 18,416,838 | `Deposited`, `WithdrawalRequested`, `WithdrawalProcessed` |
| DAOCommittee | `0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb` | 10,000,000 | `AgendaVoteCasted` |

### Schema Entities

- **Protocol** — Aggregate protocol-level statistics
- **Account** — User accounts with balances and transaction history
- **Staker** — Staker-specific deposit/withdrawal tracking
- **StakingEvent** — Immutable record of staking events (deposit, withdrawal request, withdrawal processed)
- **Transfer** — Immutable record of token transfers
- **GovernanceAction** — Immutable record of DAO governance votes

### Deployment

```bash
cd subgraph
graph codegen
graph build
graph deploy --studio tokamak-airdrop
```

## API Reference

### `GET /api/stakers`

Query stakers within a date range and minimum stake amount.

**Query Parameters**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | `string` | Yes | Start date (ISO 8601, e.g. `2024-01-01`) |
| `to` | `string` | Yes | End date (ISO 8601, e.g. `2024-12-31`) |
| `minAmount` | `string` | Yes | Minimum staked amount in WTON |

**Response**

```json
{
  "stakers": [
    {
      "id": "0x...",
      "totalStaked": "1000000000000000000000000000",
      "totalWithdrawn": "0",
      "depositCount": 3
    }
  ],
  "totalCount": 42,
  "summary": {
    "uniqueStakers": 42,
    "totalStakedAmount": "..."
  }
}
```

Returns mock data when `NEXT_PUBLIC_SUBGRAPH_URL` is not configured.

## License

MIT
