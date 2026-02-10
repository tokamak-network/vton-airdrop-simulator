import { AgendaVoteCasted } from "../../generated/DAOCommittee/DAOCommittee";
import { GovernanceAction } from "../../generated/schema";
import { getOrCreateAccount, ONE } from "./helpers";

export function handleVoteCasted(event: AgendaVoteCasted): void {
  let account = getOrCreateAccount(event.params.voter, event.block.timestamp);
  account.contractInteractionCount = account.contractInteractionCount.plus(ONE);
  account.save();

  let action = new GovernanceAction(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  action.account = account.id;
  action.type = "vote";
  action.agendaId = event.params.agendaId;
  action.timestamp = event.block.timestamp;
  action.blockNumber = event.block.number;
  action.txHash = event.transaction.hash;
  action.save();
}
