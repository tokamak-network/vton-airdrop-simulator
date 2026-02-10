import { Transfer as TransferEvent } from "../../generated/TOS/ERC20";
import { Transfer } from "../../generated/schema";
import { getOrCreateAccount, getOrCreateProtocol, ONE } from "./helpers";

export function handleTOSTransfer(event: TransferEvent): void {
  let from = getOrCreateAccount(event.params.from, event.block.timestamp);
  let to = getOrCreateAccount(event.params.to, event.block.timestamp);

  from.tosBalance = from.tosBalance.minus(event.params.value);
  from.contractInteractionCount = from.contractInteractionCount.plus(ONE);
  from.save();

  to.tosBalance = to.tosBalance.plus(event.params.value);
  to.save();

  let transfer = new Transfer(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  transfer.from = from.id;
  transfer.to = to.id;
  transfer.token = "TOS";
  transfer.amount = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.txHash = event.transaction.hash;
  transfer.save();

  let protocol = getOrCreateProtocol();
  protocol.totalTransactions = protocol.totalTransactions.plus(ONE);
  protocol.save();
}
