import { GraphQLClient } from "graphql-request";

const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL ??
  "https://api.studio.thegraph.com/query/YOUR_ID/tokamak-airdrop/version/latest";

export const graphClient = new GraphQLClient(SUBGRAPH_URL);
