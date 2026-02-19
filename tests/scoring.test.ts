import { describe, it, expect } from "vitest";
import { computeAirdropScores } from "@/lib/airdrop/scoring";
import type { StakerResult, AirdropSimulationConfig } from "@/lib/types";

const RAY = BigInt("1000000000000000000000000000"); // 1e27

function wton(n: number): string {
  return (BigInt(n) * RAY).toString();
}

function makeStaker(overrides: Partial<StakerResult> & { address: string }): StakerResult {
  return {
    totalStaked: "0",
    totalWithdrawn: "0",
    depositCount: 1,
    withdrawCount: 0,
    lastStakedAt: 1700000000,
    firstStakedAt: 1600000000,
    events: [],
    lifetimeDeposited: "0",
    lifetimeWithdrawn: "0",
    currentStake: wton(1000),
    seigniorage: wton(100),
    ...overrides,
  };
}

function defaultConfig(overrides?: Partial<AirdropSimulationConfig>): AirdropSimulationConfig {
  return {
    totalTokens: 1_000_000,
    tokenSymbol: "TEST",
    weights: { stakingAmount: 33, stakingDuration: 33, seigniorage: 34 },
    snapshotTimestamp: 1700000000,
    ...overrides,
  };
}

describe("computeAirdropScores", () => {
  it("returns empty result for no stakers", () => {
    const result = computeAirdropScores([], defaultConfig());
    expect(result.stakerScores).toHaveLength(0);
    expect(result.summary.eligibleStakers).toBe(0);
    expect(result.summary.totalDistributed).toBe(0);
  });

  it("gives single staker 100% of tokens", () => {
    const stakers = [makeStaker({ address: "0xAAA" })];
    const result = computeAirdropScores(stakers, defaultConfig());
    expect(result.stakerScores).toHaveLength(1);
    expect(result.stakerScores[0].allocation).toBeCloseTo(1_000_000, 0);
    expect(result.stakerScores[0].allocationPct).toBeCloseTo(100, 0);
  });

  it("gives equal stakers equal allocation", () => {
    const stakers = [
      makeStaker({ address: "0xAAA" }),
      makeStaker({ address: "0xBBB" }),
      makeStaker({ address: "0xCCC" }),
    ];
    const result = computeAirdropScores(stakers, defaultConfig());
    expect(result.stakerScores).toHaveLength(3);

    const allocations = result.stakerScores.map((s) => s.allocation);
    // Each should get ~333,333 tokens
    for (const a of allocations) {
      expect(a).toBeCloseTo(1_000_000 / 3, 0);
    }
  });

  it("total allocations sum to totalTokens", () => {
    const stakers = [
      makeStaker({ address: "0xAAA", currentStake: wton(500) }),
      makeStaker({ address: "0xBBB", currentStake: wton(2000) }),
      makeStaker({ address: "0xCCC", currentStake: wton(100), seigniorage: wton(50) }),
    ];
    const result = computeAirdropScores(stakers, defaultConfig());
    const totalAlloc = result.stakerScores.reduce((sum, s) => sum + s.allocation, 0);
    expect(totalAlloc).toBeCloseTo(1_000_000, 0);
  });

  it("excludes stakers with zero currentStake AND zero seigniorage", () => {
    const stakers = [
      makeStaker({ address: "0xAAA" }),
      makeStaker({ address: "0xBBB", currentStake: "0", seigniorage: "0" }),
    ];
    const result = computeAirdropScores(stakers, defaultConfig());
    expect(result.stakerScores).toHaveLength(1);
    expect(result.stakerScores[0].address).toBe("0xAAA");
  });

  it("weight=0 means that criterion does not affect allocation", () => {
    // Two stakers: same duration & seigniorage, different staking amount
    const stakerA = makeStaker({
      address: "0xAAA",
      currentStake: wton(100),
      seigniorage: wton(50),
    });
    const stakerB = makeStaker({
      address: "0xBBB",
      currentStake: wton(10000),
      seigniorage: wton(50),
    });

    // stakingAmount weight = 0 → staking amount should not matter
    const config = defaultConfig({
      weights: { stakingAmount: 0, stakingDuration: 50, seigniorage: 50 },
    });

    const result = computeAirdropScores([stakerA, stakerB], config);
    const allocA = result.stakerScores.find((s) => s.address === "0xAAA")!.allocation;
    const allocB = result.stakerScores.find((s) => s.address === "0xBBB")!.allocation;

    // They have identical duration and seigniorage, so allocations should be equal
    expect(allocA).toBeCloseTo(allocB, 0);
  });

  it("higher staking amount gets more allocation when that criterion is weighted", () => {
    const small = makeStaker({
      address: "0xSMALL",
      currentStake: wton(100),
      seigniorage: wton(10),
    });
    const big = makeStaker({
      address: "0xBIG",
      currentStake: wton(10000),
      seigniorage: wton(10),
    });

    const config = defaultConfig({
      weights: { stakingAmount: 100, stakingDuration: 0, seigniorage: 0 },
    });

    const result = computeAirdropScores([small, big], config);
    const allocSmall = result.stakerScores.find((s) => s.address === "0xSMALL")!.allocation;
    const allocBig = result.stakerScores.find((s) => s.address === "0xBIG")!.allocation;

    expect(allocBig).toBeGreaterThan(allocSmall);
  });

  it("longer staking duration gets more allocation", () => {
    const recent = makeStaker({
      address: "0xRECENT",
      firstStakedAt: 1690000000, // ~116 days before snapshot
    });
    const veteran = makeStaker({
      address: "0xVETERAN",
      firstStakedAt: 1600000000, // ~1157 days before snapshot
    });

    const config = defaultConfig({
      weights: { stakingAmount: 0, stakingDuration: 100, seigniorage: 0 },
    });

    const result = computeAirdropScores([recent, veteran], config);
    const allocRecent = result.stakerScores.find((s) => s.address === "0xRECENT")!.allocation;
    const allocVeteran = result.stakerScores.find((s) => s.address === "0xVETERAN")!.allocation;

    expect(allocVeteran).toBeGreaterThan(allocRecent);
  });

  it("top10PctConcentration is calculated correctly", () => {
    const stakers = Array.from({ length: 10 }, (_, i) =>
      makeStaker({
        address: `0x${i.toString(16).padStart(40, "0")}`,
        currentStake: (BigInt((i + 1) * 100) * RAY).toString(),
        seigniorage: (BigInt((i + 1) * 10) * RAY).toString(),
      })
    );

    const result = computeAirdropScores(stakers, defaultConfig());
    // Top 10% = 1 staker, should have the largest share
    expect(result.summary.top10PctConcentration).toBeGreaterThan(0);
    expect(result.summary.top10PctConcentration).toBeLessThanOrEqual(100);
  });

  it("preserves config in result", () => {
    const config = defaultConfig({ totalTokens: 500_000, tokenSymbol: "TKN" });
    const result = computeAirdropScores([makeStaker({ address: "0xAAA" })], config);
    expect(result.config.totalTokens).toBe(500_000);
    expect(result.config.tokenSymbol).toBe("TKN");
  });
});
