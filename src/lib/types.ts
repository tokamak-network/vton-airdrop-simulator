// ── Staker Lookup ──

export interface StakerFilter {
  from: number; // unix timestamp
  to: number; // unix timestamp
  minAmount: string; // WTON amount in RAY (27 decimals)
  first?: number;
  skip?: number;
}

export interface StakerResult {
  address: string;
  totalStaked: string; // WTON in RAY
  depositCount: number;
  firstStakedAt: number;
  lastStakedAt: number;
}

export interface StakerLookupResponse {
  stakers: StakerResult[];
  totalCount: number;
  summary: {
    uniqueStakers: number;
    totalStakedAmount: string;
  };
}
