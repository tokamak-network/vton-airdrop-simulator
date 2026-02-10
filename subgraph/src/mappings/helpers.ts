import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Account, Protocol, Staker } from "../../generated/schema";

export const ZERO = BigInt.fromI32(0);
export const ONE = BigInt.fromI32(1);

export function getOrCreateAccount(address: Address, timestamp: BigInt): Account {
  let id = address.toHexString();
  let account = Account.load(id);

  if (account == null) {
    account = new Account(id);
    account.transactionCount = ZERO;
    account.firstSeen = timestamp;
    account.lastSeen = timestamp;
    account.totalStaked = ZERO;
    account.stakingEventCount = ZERO;

    let protocol = getOrCreateProtocol();
    protocol.totalAccounts = protocol.totalAccounts.plus(ONE);
    protocol.save();
  }

  account.lastSeen = timestamp;
  account.transactionCount = account.transactionCount.plus(ONE);

  return account as Account;
}

export function getOrCreateStaker(address: Address, timestamp: BigInt): Staker {
  let id = address.toHexString();
  let staker = Staker.load(id);

  if (staker == null) {
    staker = new Staker(id);
    staker.totalDeposited = ZERO;
    staker.totalWithdrawn = ZERO;
    staker.depositCount = 0;
    staker.withdrawalCount = 0;
    staker.firstStakedAt = timestamp;
    staker.lastStakedAt = timestamp;
  }

  return staker as Staker;
}

export function getOrCreateProtocol(): Protocol {
  let protocol = Protocol.load("1");

  if (protocol == null) {
    protocol = new Protocol("1");
    protocol.totalAccounts = ZERO;
    protocol.totalTransactions = ZERO;
    protocol.totalStaked = ZERO;
  }

  return protocol as Protocol;
}
