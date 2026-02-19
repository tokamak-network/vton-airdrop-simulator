import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const rpcUrl = process.env.ETHEREUM_RPC_URL;

export const publicClient =
  rpcUrl && !rpcUrl.includes("YOUR_KEY")
    ? createPublicClient({ chain: mainnet, transport: http(rpcUrl) })
    : null;
