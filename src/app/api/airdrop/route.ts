import { NextRequest, NextResponse } from "next/server";
import { generateMockStakers } from "@/lib/mock-data";
import { fetchAllDepositors } from "@/lib/graph/queries";
import { fetchSeigniorageData } from "@/lib/ethereum/seigniorage";
import { computeAirdropScores } from "@/lib/airdrop/scoring";
import type { AirdropSimulationConfig, CriteriaWeights } from "@/lib/types";

const RAY = BigInt("1000000000000000000000000000"); // 1e27

const USE_SUBGRAPH =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL &&
  !process.env.NEXT_PUBLIC_SUBGRAPH_URL.includes("YOUR_ID");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Staker filter params
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const minAmountStr = searchParams.get("minAmount") ?? "0";

    // Airdrop config params
    const totalTokensStr = searchParams.get("totalTokens");
    const tokenSymbol = searchParams.get("tokenSymbol") ?? "TOKEN";
    const wAStr = searchParams.get("wA") ?? "33";
    const wDStr = searchParams.get("wD") ?? "33";
    const wSStr = searchParams.get("wS") ?? "34";

    if (!fromDate || !toDate || !totalTokensStr) {
      return NextResponse.json(
        { error: "Missing required parameters: from, to, totalTokens" },
        { status: 400 }
      );
    }

    const from = Math.floor(new Date(fromDate).getTime() / 1000);
    const to = Math.floor(new Date(toDate).getTime() / 1000);
    const minAmountWton = parseFloat(minAmountStr);
    const totalTokens = parseFloat(totalTokensStr);
    const wA = parseInt(wAStr, 10);
    const wD = parseInt(wDStr, 10);
    const wS = parseInt(wSStr, 10);

    if (isNaN(from) || isNaN(to) || isNaN(totalTokens)) {
      return NextResponse.json(
        { error: "Invalid parameter values" },
        { status: 400 }
      );
    }

    if (wA + wD + wS !== 100) {
      return NextResponse.json(
        { error: "Weights must sum to 100" },
        { status: 400 }
      );
    }

    let stakers;

    if (USE_SUBGRAPH) {
      // Query all depositors directly from Staker entity (paginated)
      stakers = await fetchAllDepositors();
    } else {
      stakers = generateMockStakers(from, to, minAmountWton);
    }

    // Filter by minAmount (WTON)
    if (minAmountWton > 0) {
      const minAmountRay = BigInt(Math.floor(minAmountWton)) * RAY;
      stakers = stakers.filter(
        (s) => BigInt(s.lifetimeDeposited) >= minAmountRay
      );
    }

    // Fetch on-chain stakeOf for seigniorage calculation (subgraph mode only)
    if (USE_SUBGRAPH) {
      const addresses = stakers.map((s) => s.address);
      const stakeOfMap = await fetchSeigniorageData(addresses);

      for (const s of stakers) {
        const currentStake = stakeOfMap.get(s.address.toLowerCase()) ?? BigInt(0);
        s.currentStake = currentStake.toString();
        const seigniorage =
          currentStake + BigInt(s.lifetimeWithdrawn) - BigInt(s.lifetimeDeposited);
        s.seigniorage = (seigniorage > BigInt(0) ? seigniorage : BigInt(0)).toString();
      }
    }

    const weights: CriteriaWeights = {
      stakingAmount: wA,
      stakingDuration: wD,
      seigniorage: wS,
    };

    const config: AirdropSimulationConfig = {
      totalTokens,
      tokenSymbol,
      weights,
      snapshotTimestamp: to,
    };

    const result = computeAirdropScores(stakers, config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Airdrop simulation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
