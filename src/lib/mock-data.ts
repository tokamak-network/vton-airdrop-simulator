import type { StakerResult } from "./types";

/**
 * Generate mock staker data for development/testing
 * when the subgraph is not yet deployed.
 * WTON uses 27 decimals (RAY unit).
 */
export function generateMockStakers(
  from: number,
  to: number,
  minAmountWton: number,
  count = 80
): StakerResult[] {
  const stakers: StakerResult[] = [];
  const RAY = BigInt("1000000000000000000000000000"); // 1e27

  for (let i = 0; i < count; i++) {
    const seed = hashSeed(i + 1000);
    const stakedWton = (seed % 5000) + 100; // 100 ~ 5100 WTON
    if (stakedWton < minAmountWton) continue;

    const firstStaked = from + (seed % (to - from));
    const lastStaked = firstStaked + (seed % Math.max(1, to - firstStaked));

    stakers.push({
      address: `0x${(i + 1).toString(16).padStart(40, "a")}`,
      totalStaked: (BigInt(stakedWton) * RAY).toString(),
      depositCount: (seed % 20) + 1,
      firstStakedAt: Math.min(firstStaked, to),
      lastStakedAt: Math.min(lastStaked, to),
    });
  }

  return stakers;
}

function hashSeed(i: number): number {
  let h = i * 2654435761;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return Math.abs(h);
}
