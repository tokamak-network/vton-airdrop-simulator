# Airdrop Simulator

Simulate airdrop token distributions based on Tokamak Network on-chain staking data. Combines subgraph-indexed staking history with live on-chain seigniorage data to produce fair, configurable token allocations.

## Architecture

```
Browser / curl
     │
     ▼
GET /api/stakers ──────────────────────────────────────────────┐
     │                                                         │
     ├─► The Graph Subgraph ──► DepositManager V1/V2 events   │
     │     (historical deposits, withdrawals, timestamps)      │
     │                                                         │
     └─► Ethereum RPC Multicall ──► SeigManager.stakeOf()      │
           (live on-chain staked balances)                      │
                                                               ▼
                                                     Merge + Seigniorage Calc
                                                               │
                                                               ▼
GET /api/airdrop ──► Scoring Engine ──► Weighted Allocation ──► JSON Result
     (weights, totalTokens)
```

**Data flow:**

1. `/api/stakers` fetches historical staking events from the subgraph, then enriches each staker with live `stakeOf()` balances via multicall
2. Seigniorage is computed as: `currentStake + lifetimeWithdrawn - lifetimeDeposited`
3. `/api/airdrop` consumes staker data, applies the scoring algorithm, and returns per-staker token allocations

## Data Sources

### Subgraph

A [The Graph](https://thegraph.com/) subgraph indexes all Deposit and Withdrawal events from:

- **DepositManager V1** (`0x56E465f654393fa48f007Ed7346105c7195CEe43`) — genesis: 2020-09-11
- **DepositManager V2** (`0x0b55a0f463b6DEFb81C6063973763951712d0E5F`)

Indexed fields per staker: `totalStaked`, `totalWithdrawn`, `depositCount`, `withdrawCount`, `firstStakedAt`, `lastStakedAt`, `lifetimeDeposited`, `lifetimeWithdrawn`.

### On-Chain (Ethereum RPC)

- **SeigManager** proxy at `0x0b55a0f463b6DEFb81C6063973763951712d0E5F` — `stakeOf(address)` returns real-time WTON staked balance across all Layer 2 operators
- Uses `viem` multicall to batch all staker lookups into a single RPC round-trip

### Fallback Mode

If `NEXT_PUBLIC_SUBGRAPH_URL` is not configured, the API falls back to `generateMockStakers()` for local development without external dependencies.

## Scoring Algorithm

### Criteria (3 dimensions)

| Criterion | Source | Unit | Description |
|-----------|--------|------|-------------|
| **stakingAmount** | `SeigManager.stakeOf()` | WTON | Current on-chain staked balance |
| **stakingDuration** | `firstStakedAt` (subgraph) | Days | Time elapsed since first-ever deposit |
| **seigniorage** | Computed | WTON | Cumulative staking rewards earned |

### Pipeline

```
Raw Values ──► √ Sqrt Scaling ──► [0,1] Normalization ──► Weighted Sum ──► Proportional Allocation
```

1. **Eligibility filter**: Include stakers where `currentStake > 0 OR seigniorage > 0`
2. **Sqrt scaling**: `√(value)` — reduces concentration by compressing the range for whales
3. **Normalize to [0, 1]**: `normalized = √(value) / max(√(values))`
4. **Composite score**: `wA × normAmount + wD × normDuration + wS × normSeigniorage`
   - Weights (wA, wD, wS) must sum to 100
5. **Proportional allocation**: `allocation = (score / totalScore) × totalTokens`

The sqrt transform is key: a staker with 100× more stake gets only 10× more score from that criterion, promoting fairer distribution.

## Simulation Results

### Data Snapshot

| Parameter | Value |
|-----------|-------|
| Period | 2020-09-11 (DepositManager V1 genesis) → 2026-02-19 |
| Eligible stakers | 124 |
| Total staked | 28,016,168 WTON |
| Total seigniorage | 12,638,635 WTON |
| Avg staking duration | 1,545 days (~4.2 years) |
| Token pool | 1,000,000 TOKEN |

### Scenario Comparison

| Scenario | wA | wD | wS | Eligible | Top 10% Concentration | Median | Max | Min |
|---|---|---|---|---|---|---|---|---|
| **Equal Weights** | 34 | 33 | 33 | 124 | 17.99% | 7,617 | 22,269 | 3,129 |
| **Amount-Heavy** | 70 | 20 | 10 | 124 | 23.19% | 6,681 | 32,430 | 3,072 |
| **Duration-Heavy** | 10 | 80 | 10 | 124 | 12.81% | 8,499 | 11,239 | 3,170 |
| **Seigniorage-Heavy** | 10 | 10 | 80 | 124 | 25.79% | 6,640 | 38,999 | 2,535 |
| **Amount + Duration** | 50 | 50 | 0 | 124 | 15.56% | 7,941 | 16,875 | 3,308 |

### Analysis

**Most concentrated: Seigniorage-Heavy (25.79%)**
When seigniorage dominates (wS=80), the top 10% of stakers capture 25.79% of tokens — the highest concentration. This reflects the compounding nature of seigniorage: large, long-term stakers accumulate disproportionately more rewards. The max allocation (38,999) is 15.4× the min (2,535).

**Most egalitarian: Duration-Heavy (12.81%)**
Weighting duration at 80% produces the flattest distribution. The spread between max (11,239) and min (3,170) is only 3.5×. This makes sense: staking duration differences are bounded (all stakers joined within the same ~5-year window), while amounts and seigniorage span orders of magnitude.

**Amount-Heavy (23.19%)**
Emphasizing staking amount creates the second-highest concentration. Whales with large positions dominate despite sqrt compression. The max allocation (32,430) is 10.6× the min (3,072).

**Equal Weights (17.99%)**
The balanced scenario sits between the extremes, producing a moderate spread. This serves as a practical default that doesn't overly favor any one staker profile.

**Amount + Duration, no seigniorage (15.56%)**
Excluding seigniorage (wS=0) and splitting between amount and duration produces a relatively flat distribution. This is useful when the goal is to reward both commitment (duration) and capital (amount) without the compounding advantage of seigniorage.

**Key takeaway**: Duration-based weighting is the strongest equalizer. If the goal is broad distribution, wD should be the dominant weight. If the goal is rewarding network contribution, wS or wA should be emphasized.

## API Reference

### `GET /api/airdrop`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | date string | Yes | — | Start date (e.g. `2020-09-11`) |
| `to` | date string | Yes | — | End date (e.g. `2026-02-19`) |
| `totalTokens` | number | Yes | — | Total tokens to distribute |
| `minAmount` | number | No | `0` | Minimum staked WTON to include |
| `tokenSymbol` | string | No | `TOKEN` | Symbol for display |
| `wA` | integer | No | `33` | Staking amount weight (0-100) |
| `wD` | integer | No | `33` | Staking duration weight (0-100) |
| `wS` | integer | No | `34` | Seigniorage weight (0-100) |

Weights must sum to 100.

**Example:**

```bash
curl "http://localhost:3000/api/airdrop?from=2020-09-11&to=2026-02-19&totalTokens=1000000&wA=34&wD=33&wS=33"
```

**Response shape:**

```json
{
  "config": { "totalTokens": 1000000, "tokenSymbol": "TOKEN", "weights": { ... }, "snapshotTimestamp": ... },
  "stakerScores": [
    {
      "address": "0x...",
      "raw": { "stakingAmount": 1234.56, "stakingDuration": 1500, "seigniorage": 567.89 },
      "normalized": { "stakingAmount": 0.85, "stakingDuration": 0.92, "seigniorage": 0.71 },
      "compositeScore": 0.826,
      "allocation": 12345.67,
      "allocationPct": 1.23
    }
  ],
  "summary": {
    "eligibleStakers": 124,
    "totalDistributed": 1000000,
    "top10PctConcentration": 17.99,
    "medianAllocation": 7617.34,
    "maxAllocation": 22268.94,
    "minAllocation": 3129.33
  }
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/<SUBGRAPH>/<VERSION>
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
```

Without these, the API uses mock data.

### Development

```bash
pnpm dev
```

### Tests

```bash
pnpm test
```

Runs the scoring engine unit tests (10 test cases covering edge cases, weight behavior, and allocation correctness).

## Subgraph

Built with [The Graph](https://thegraph.com/) to index DepositManager V1/V2 staking events.

See `subgraph/` directory for schema and mapping handlers.
