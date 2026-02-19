export interface GraphStaker {
  id: string;
  totalDeposited: string;
  totalWithdrawn: string;
  depositCount: number;
  withdrawalCount: number;
  lastStakedAt: string;
  firstStakedAt: string;
}

export interface GraphStakingEventWithStaker {
  id: string;
  type: string;
  staker: GraphStaker;
  amount: string;
  layer2: string;
  timestamp: string;
  txHash: string;
}

export interface StakersQueryResponse {
  stakingEvents: GraphStakingEventWithStaker[];
}
