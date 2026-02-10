export interface GraphStaker {
  id: string;
  totalDeposited: string;
  depositCount: number;
  firstStakedAt: string;
  lastStakedAt: string;
}

export interface GraphStakingEventWithStaker {
  id: string;
  staker: GraphStaker;
  amount: string;
  layer2: string;
  timestamp: string;
  txHash: string;
}

export interface StakersQueryResponse {
  stakingEvents: GraphStakingEventWithStaker[];
}
