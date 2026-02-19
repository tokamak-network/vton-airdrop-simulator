// ── Staker Lookup ──

export interface StakerFilter {
  from: number; // unix timestamp
  to: number; // unix timestamp
  minAmount: string; // WTON amount in RAY (27 decimals)
  first?: number;
  skip?: number;
}

export interface StakingEvent {
  txHash: string;
  type: "deposit" | "withdraw";
  amount: string; // WTON in RAY
  layer2: string;
  timestamp: number;
}

export interface StakerResult {
  address: string;
  totalStaked: string; // 기간 내 스테이킹 총량 (WTON in RAY)
  totalWithdrawn: string; // 기간 내 출금 총량 (WTON in RAY)
  depositCount: number; // 기간 내 입금 횟수
  withdrawCount: number; // 기간 내 출금 횟수
  lastStakedAt: number; // 기간 내 마지막 스테이킹 시점
  firstStakedAt: number; // 최초 스테이킹 시점 (unix timestamp)
  events: StakingEvent[];
  // 시뇨리지 관련 (온체인 조회)
  lifetimeDeposited: string; // 서브그래프 누적 입금 (WTON in RAY)
  lifetimeWithdrawn: string; // 서브그래프 누적 출금 (WTON in RAY)
  currentStake: string; // SeigManager.stakeOf 온체인 잔액 (WTON in RAY)
  seigniorage: string; // 계산된 시뇨리지 = currentStake + lifetimeWithdrawn - lifetimeDeposited
}

export interface StakerLookupResponse {
  stakers: StakerResult[];
  totalCount: number;
  summary: {
    uniqueStakers: number;
    totalStakedAmount: string;
    totalSeigniorage: string;
  };
}

// ── Airdrop Simulation ──

export interface CriteriaWeights {
  stakingAmount: number; // 0-100
  stakingDuration: number; // 0-100
  seigniorage: number; // 0-100, must satisfy sum = 100
}

export interface StakerScores {
  address: string;
  raw: { stakingAmount: number; stakingDuration: number; seigniorage: number };
  sqrt: { stakingAmount: number; stakingDuration: number; seigniorage: number };
  normalized: { stakingAmount: number; stakingDuration: number; seigniorage: number };
  compositeScore: number;
  allocation: number; // token amount allocated
  allocationPct: number; // percentage of total
}

export interface AirdropSimulationConfig {
  totalTokens: number;
  tokenSymbol: string;
  weights: CriteriaWeights;
  snapshotTimestamp: number; // unix timestamp for duration calculation
}

export interface AirdropSimulationResult {
  config: AirdropSimulationConfig;
  stakerScores: StakerScores[];
  summary: {
    eligibleStakers: number;
    totalDistributed: number;
    top10PctConcentration: number; // % of tokens held by top 10% of stakers
    medianAllocation: number;
    maxAllocation: number;
    minAllocation: number;
  };
}
