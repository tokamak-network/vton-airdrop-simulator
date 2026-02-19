import type {
  StakerResult,
  AirdropSimulationConfig,
  AirdropSimulationResult,
  StakerScores,
} from "../types";

const RAY = 1e27;

function rayToFloat(ray: string): number {
  const bi = BigInt(ray);
  // Use division + remainder to avoid floating point overflow
  const whole = Number(bi / BigInt(RAY));
  const frac = Number(bi % BigInt(RAY)) / RAY;
  return whole + frac;
}

export function computeAirdropScores(
  stakers: StakerResult[],
  config: AirdropSimulationConfig
): AirdropSimulationResult {
  const { totalTokens, weights, snapshotTimestamp } = config;
  const wA = weights.stakingAmount / 100;
  const wD = weights.stakingDuration / 100;
  const wS = weights.seigniorage / 100;

  // Filter: exclude stakers with zero stake AND zero seigniorage
  const eligible = stakers.filter((s) => {
    const stake = rayToFloat(s.currentStake);
    const seig = rayToFloat(s.seigniorage);
    return stake > 0 || seig > 0;
  });

  if (eligible.length === 0) {
    return {
      config,
      stakerScores: [],
      summary: {
        eligibleStakers: 0,
        totalDistributed: 0,
        top10PctConcentration: 0,
        medianAllocation: 0,
        maxAllocation: 0,
        minAllocation: 0,
      },
    };
  }

  // Extract raw values
  const rawValues = eligible.map((s) => ({
    address: s.address,
    stakingAmount: rayToFloat(s.currentStake),
    stakingDuration: Math.max(0, (snapshotTimestamp - s.firstStakedAt) / 86400), // days
    seigniorage: rayToFloat(s.seigniorage),
  }));

  // sqrt scaling
  const sqrtValues = rawValues.map((r) => ({
    stakingAmount: Math.sqrt(r.stakingAmount),
    stakingDuration: Math.sqrt(r.stakingDuration),
    seigniorage: Math.sqrt(r.seigniorage),
  }));

  // Find max for normalization
  const maxSqrt = {
    stakingAmount: Math.max(...sqrtValues.map((v) => v.stakingAmount), 1e-18),
    stakingDuration: Math.max(...sqrtValues.map((v) => v.stakingDuration), 1e-18),
    seigniorage: Math.max(...sqrtValues.map((v) => v.seigniorage), 1e-18),
  };

  // Normalize (0~1) and compute composite score
  const scored: StakerScores[] = rawValues.map((raw, i) => {
    const sq = sqrtValues[i];
    const normalized = {
      stakingAmount: sq.stakingAmount / maxSqrt.stakingAmount,
      stakingDuration: sq.stakingDuration / maxSqrt.stakingDuration,
      seigniorage: sq.seigniorage / maxSqrt.seigniorage,
    };
    const compositeScore =
      wA * normalized.stakingAmount +
      wD * normalized.stakingDuration +
      wS * normalized.seigniorage;

    return {
      address: raw.address,
      raw: { stakingAmount: raw.stakingAmount, stakingDuration: raw.stakingDuration, seigniorage: raw.seigniorage },
      sqrt: sq,
      normalized,
      compositeScore,
      allocation: 0,
      allocationPct: 0,
    };
  });

  // Proportional allocation
  const totalScore = scored.reduce((sum, s) => sum + s.compositeScore, 0);
  if (totalScore > 0) {
    for (const s of scored) {
      s.allocation = (s.compositeScore / totalScore) * totalTokens;
      s.allocationPct = (s.compositeScore / totalScore) * 100;
    }
  }

  // Sort by allocation descending
  scored.sort((a, b) => b.allocation - a.allocation);

  // Summary stats
  const allocations = scored.map((s) => s.allocation);
  const top10Count = Math.max(1, Math.ceil(scored.length * 0.1));
  const top10Sum = allocations.slice(0, top10Count).reduce((a, b) => a + b, 0);

  const sortedAllocations = [...allocations].sort((a, b) => a - b);
  const mid = Math.floor(sortedAllocations.length / 2);
  const median =
    sortedAllocations.length % 2 === 0
      ? (sortedAllocations[mid - 1] + sortedAllocations[mid]) / 2
      : sortedAllocations[mid];

  return {
    config,
    stakerScores: scored,
    summary: {
      eligibleStakers: scored.length,
      totalDistributed: allocations.reduce((a, b) => a + b, 0),
      top10PctConcentration: totalTokens > 0 ? (top10Sum / totalTokens) * 100 : 0,
      medianAllocation: median,
      maxAllocation: allocations[0] ?? 0,
      minAllocation: allocations[allocations.length - 1] ?? 0,
    },
  };
}
