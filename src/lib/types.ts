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
}

export interface StakerLookupResponse {
  stakers: StakerResult[];
  totalCount: number;
  summary: {
    uniqueStakers: number;
    totalStakedAmount: string;
  };
}
