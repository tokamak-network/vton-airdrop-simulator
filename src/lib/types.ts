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
