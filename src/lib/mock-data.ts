import type { StakerResult, StakingEvent } from "./types";

// DepositManager V1 deployment: block 10837675, Sep 11 2020
const GENESIS_TIMESTAMP = 1599782400; // 2020-09-11 00:00 UTC

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

    const lastStaked = from + (seed % (to - from));
    const depCount = (seed % 20) + 1;
    // Withdraw count: ~30% of deposits, at least 0
    const wdCount = Math.max(0, Math.floor(depCount * 0.3) + (seed % 3 === 0 ? 1 : 0));
    const totalDepositRay = BigInt(stakedWton) * RAY;
    // Withdrawals are ~20-40% of total deposited
    const wdPercent = 20 + (seed % 21); // 20~40
    const totalWithdrawRay = wdCount > 0
      ? (totalDepositRay * BigInt(wdPercent)) / BigInt(100)
      : BigInt(0);

    // firstStakedAt: random between genesis and `from`
    const firstSeed = hashSeed(i + 3000);
    const genesisToFrom = Math.max(from - GENESIS_TIMESTAMP, 1);
    const firstStakedAt = GENESIS_TIMESTAMP + (firstSeed % genesisToFrom);

    // Mock seigniorage data: currentStake = deposits - withdrawals + seigniorage bonus
    const netDeposit = totalDepositRay - totalWithdrawRay;
    const seigniorageSeed = hashSeed(i + 4000);
    const seignioragePct = 5 + (seigniorageSeed % 26); // 5~30% of net deposit
    const seigniorageRay = (netDeposit * BigInt(seignioragePct)) / BigInt(100);
    const currentStakeRay = netDeposit + seigniorageRay;

    // Generate deposit events
    const events: StakingEvent[] = [];
    let remaining = totalDepositRay;
    for (let j = 0; j < depCount; j++) {
      const isLast = j === depCount - 1;
      const evtAmount = isLast
        ? remaining
        : remaining / BigInt(depCount - j);
      remaining -= evtAmount;
      const evtSeed = hashSeed(i * 1000 + j);
      const evtTs = from + (evtSeed % (to - from));
      events.push({
        txHash: `0x${(i * 1000 + j).toString(16).padStart(64, "0")}`,
        type: "deposit",
        amount: evtAmount.toString(),
        layer2: `0x${((evtSeed % 10) + 1).toString(16).padStart(40, "b")}`,
        timestamp: Math.min(evtTs, to),
      });
    }

    // Generate withdraw events
    let wdRemaining = totalWithdrawRay;
    for (let j = 0; j < wdCount; j++) {
      const isLast = j === wdCount - 1;
      const evtAmount = isLast
        ? wdRemaining
        : wdRemaining / BigInt(wdCount - j);
      wdRemaining -= evtAmount;
      const evtSeed = hashSeed(i * 2000 + j);
      const evtTs = from + (evtSeed % (to - from));
      events.push({
        txHash: `0x${(i * 2000 + j).toString(16).padStart(64, "f")}`,
        type: "withdraw",
        amount: evtAmount.toString(),
        layer2: `0x${((evtSeed % 10) + 1).toString(16).padStart(40, "b")}`,
        timestamp: Math.min(evtTs, to),
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    stakers.push({
      address: `0x${(i + 1).toString(16).padStart(40, "a")}`,
      totalStaked: totalDepositRay.toString(),
      totalWithdrawn: totalWithdrawRay.toString(),
      depositCount: depCount,
      withdrawCount: wdCount,
      lastStakedAt: Math.min(lastStaked, to),
      firstStakedAt,
      events,
      lifetimeDeposited: totalDepositRay.toString(),
      lifetimeWithdrawn: totalWithdrawRay.toString(),
      currentStake: currentStakeRay.toString(),
      seigniorage: seigniorageRay.toString(),
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
