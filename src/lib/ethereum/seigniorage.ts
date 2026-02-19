import { publicClient } from "./client";

const SEIG_MANAGER_PROXY = "0x0b55a0f463b6defb81c6063973763951712d0e5f" as const;

const seigManagerAbi = [
  {
    name: "stakeOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "amount", type: "uint256" }],
  },
] as const;

/**
 * Batch-fetch stakeOf (total across all layer2s) for multiple addresses
 * via multicall. Returns Map<lowercased address, bigint>.
 * Gracefully returns empty Map if RPC is not configured.
 */
export async function fetchSeigniorageData(
  addresses: string[]
): Promise<Map<string, bigint>> {
  const result = new Map<string, bigint>();
  if (!publicClient || addresses.length === 0) return result;

  const contracts = addresses.map((addr) => ({
    address: SEIG_MANAGER_PROXY,
    abi: seigManagerAbi,
    functionName: "stakeOf" as const,
    args: [addr as `0x${string}`],
  }));

  const results = await publicClient.multicall({ contracts });

  for (let i = 0; i < addresses.length; i++) {
    const r = results[i];
    if (r.status === "success") {
      result.set(addresses[i].toLowerCase(), r.result as bigint);
    }
  }

  return result;
}
