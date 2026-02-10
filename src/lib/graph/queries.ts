import { gql } from "graphql-request";
import { graphClient } from "./client";
import type { StakersQueryResponse } from "./types";
import type { StakerResult } from "../types";

const STAKERS_QUERY = gql`
  query GetStakers(
    $minAmount: BigInt!
    $from: BigInt!
    $to: BigInt!
    $first: Int!
    $skip: Int!
  ) {
    stakingEvents(
      where: {
        type: "stake"
        amount_gte: $minAmount
        timestamp_gte: $from
        timestamp_lte: $to
      }
      orderBy: amount
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      staker {
        id
        totalDeposited
        depositCount
        firstStakedAt
        lastStakedAt
      }
      amount
      layer2
      timestamp
      txHash
    }
  }
`;

export async function fetchStakers(
  minAmount: string,
  from: number,
  to: number,
  first = 1000,
  skip = 0
): Promise<StakerResult[]> {
  const data = await graphClient.request<StakersQueryResponse>(STAKERS_QUERY, {
    minAmount,
    from: from.toString(),
    to: to.toString(),
    first,
    skip,
  });

  // Aggregate by address (deduplicate multiple events from same staker)
  const stakerMap = new Map<string, StakerResult>();

  for (const event of data.stakingEvents) {
    const existing = stakerMap.get(event.staker.id);
    if (!existing) {
      stakerMap.set(event.staker.id, {
        address: event.staker.id,
        totalStaked: event.staker.totalDeposited,
        depositCount: event.staker.depositCount,
        firstStakedAt: parseInt(event.staker.firstStakedAt, 10),
        lastStakedAt: parseInt(event.staker.lastStakedAt, 10),
      });
    }
  }

  return Array.from(stakerMap.values());
}
