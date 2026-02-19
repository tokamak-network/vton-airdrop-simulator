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
        type_in: ["stake", "unstake"]
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
      type
      staker {
        id
        totalDeposited
        totalWithdrawn
        depositCount
        withdrawalCount
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
    const amount = BigInt(event.amount);
    const ts = parseInt(event.timestamp, 10);
    const evtType = event.type === "unstake" ? "withdraw" as const : "deposit" as const;
    const stakingEvent = {
      txHash: event.txHash,
      type: evtType,
      amount: event.amount,
      layer2: event.layer2,
      timestamp: ts,
    };
    if (existing) {
      if (evtType === "deposit") {
        existing.totalStaked = (BigInt(existing.totalStaked) + amount).toString();
        existing.depositCount += 1;
      } else {
        existing.totalWithdrawn = (BigInt(existing.totalWithdrawn) + amount).toString();
        existing.withdrawCount += 1;
      }
      existing.lastStakedAt = Math.max(existing.lastStakedAt, ts);
      existing.events.push(stakingEvent);
    } else {
      stakerMap.set(event.staker.id, {
        address: event.staker.id,
        totalStaked: evtType === "deposit" ? event.amount : "0",
        totalWithdrawn: evtType === "withdraw" ? event.amount : "0",
        depositCount: evtType === "deposit" ? 1 : 0,
        withdrawCount: evtType === "withdraw" ? 1 : 0,
        lastStakedAt: ts,
        events: [stakingEvent],
        lifetimeDeposited: event.staker.totalDeposited,
        lifetimeWithdrawn: event.staker.totalWithdrawn,
        currentStake: "0",
        seigniorage: "0",
      });
    }
  }

  return Array.from(stakerMap.values());
}
