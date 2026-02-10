import {
  Deposited,
  WithdrawalRequested,
  WithdrawalProcessed,
} from "../../generated/DepositManagerV1/DepositManager";
import { StakingEvent } from "../../generated/schema";
import { getOrCreateAccount, getOrCreateStaker, getOrCreateProtocol, ONE } from "./helpers";

export function handleDeposited(event: Deposited): void {
  let account = getOrCreateAccount(event.params.depositor, event.block.timestamp);

  account.totalStaked = account.totalStaked.plus(event.params.amount);
  account.stakingEventCount = account.stakingEventCount.plus(ONE);
  account.save();

  let staker = getOrCreateStaker(event.params.depositor, event.block.timestamp);
  staker.totalDeposited = staker.totalDeposited.plus(event.params.amount);
  staker.depositCount = staker.depositCount + 1;
  staker.lastStakedAt = event.block.timestamp;
  staker.save();

  let stakingEvent = new StakingEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  stakingEvent.account = account.id;
  stakingEvent.staker = staker.id;
  stakingEvent.type = "stake";
  stakingEvent.amount = event.params.amount;
  stakingEvent.layer2 = event.params.layer2;
  stakingEvent.timestamp = event.block.timestamp;
  stakingEvent.blockNumber = event.block.number;
  stakingEvent.txHash = event.transaction.hash;
  stakingEvent.save();

  let protocol = getOrCreateProtocol();
  protocol.totalStaked = protocol.totalStaked.plus(event.params.amount);
  protocol.save();
}

export function handleWithdrawalRequested(event: WithdrawalRequested): void {
  let account = getOrCreateAccount(event.params.depositor, event.block.timestamp);

  account.totalStaked = account.totalStaked.minus(event.params.amount);
  account.stakingEventCount = account.stakingEventCount.plus(ONE);
  account.save();

  let staker = getOrCreateStaker(event.params.depositor, event.block.timestamp);
  staker.totalWithdrawn = staker.totalWithdrawn.plus(event.params.amount);
  staker.withdrawalCount = staker.withdrawalCount + 1;
  staker.save();

  let stakingEvent = new StakingEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  stakingEvent.account = account.id;
  stakingEvent.staker = staker.id;
  stakingEvent.type = "unstake";
  stakingEvent.amount = event.params.amount;
  stakingEvent.layer2 = event.params.layer2;
  stakingEvent.timestamp = event.block.timestamp;
  stakingEvent.blockNumber = event.block.number;
  stakingEvent.txHash = event.transaction.hash;
  stakingEvent.save();

  let protocol = getOrCreateProtocol();
  protocol.totalStaked = protocol.totalStaked.minus(event.params.amount);
  protocol.save();
}

export function handleWithdrawalProcessed(event: WithdrawalProcessed): void {
  let account = getOrCreateAccount(event.params.depositor, event.block.timestamp);

  account.stakingEventCount = account.stakingEventCount.plus(ONE);
  account.save();

  let staker = getOrCreateStaker(event.params.depositor, event.block.timestamp);
  staker.withdrawalCount = staker.withdrawalCount + 1;
  staker.save();

  let stakingEvent = new StakingEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  stakingEvent.account = account.id;
  stakingEvent.staker = staker.id;
  stakingEvent.type = "withdrawal";
  stakingEvent.amount = event.params.amount;
  stakingEvent.layer2 = event.params.layer2;
  stakingEvent.timestamp = event.block.timestamp;
  stakingEvent.blockNumber = event.block.number;
  stakingEvent.txHash = event.transaction.hash;
  stakingEvent.save();
}
